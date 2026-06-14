const socket = io();
let chartInstance = null;

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playTone(freq, type, duration, vol) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    type: () => playTone(800 + Math.random()*50, 'square', 0.05, 0.02),
    execute: () => { playTone(1200, 'sine', 0.1, 0.1); setTimeout(() => playTone(1600, 'sine', 0.15, 0.1), 100); },
    logRecv: () => playTone(400 + Math.random()*200, 'sawtooth', 0.08, 0.03),
    success: () => { playTone(523.25, 'square', 0.1, 0.05); setTimeout(() => playTone(659.25, 'square', 0.1, 0.05), 100); setTimeout(() => playTone(783.99, 'square', 0.4, 0.05), 200); },
    error: () => playTone(150, 'sawtooth', 0.5, 0.1)
};

function saveToHistory(url, status) {
    let history = JSON.parse(localStorage.getItem('targetHistory') || '[]');
    if (history.length === 0 || history[0].url !== url) {
        history.unshift({ url, date: new Date().toLocaleString(), status });
        if (history.length > 10) history.pop();
        localStorage.setItem('targetHistory', JSON.stringify(history));
    }
    renderHistory();
}

function renderHistory() {
    let history = JSON.parse(localStorage.getItem('targetHistory') || '[]');
    let historyPanel = document.getElementById('historyPanel');
    if (!historyPanel) {
        historyPanel = document.createElement('div');
        historyPanel.id = 'historyPanel';
        historyPanel.style.cssText = 'display: flex; width: 100%; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 10px;';
        const header = document.querySelector('.header');
        header.style.flexWrap = 'wrap';
        header.appendChild(historyPanel);
    }
    if (history.length === 0) { historyPanel.innerHTML = ''; return; }
    
    let html = `
        <div style="display: flex; align-items: center; gap: 8px; margin-right: 5px;">
            <div style="color: var(--neon-cyan); font-size: 0.8rem; letter-spacing: 1px; text-shadow: 0 0 5px var(--neon-cyan);">[ CACHÉ ]</div>
            <div style="color: var(--alert-red); font-size: 0.7rem; cursor: pointer; border: 1px solid var(--alert-red); padding: 2px 6px; background: rgba(255, 0, 60, 0.1); transition: 0.2s;"
                 onmouseover="this.style.background='var(--alert-red)'; this.style.color='#000';"
                 onmouseout="this.style.background='rgba(255, 0, 60, 0.1)'; this.style.color='var(--alert-red)';"
                 onclick="localStorage.removeItem('targetHistory'); if(window.sfx) sfx.error(); renderHistory();">
                 [X] PURGAR
            </div>
        </div>
    `;
    history.slice(0, 4).forEach(item => {
        const domain = new URL(item.url).hostname;
        html += `
            <div style="font-size: 0.8rem; color: #fff; background: rgba(0, 240, 255, 0.05); padding: 4px 12px; border: 1px solid var(--neon-cyan-dim); cursor: pointer; transition: 0.2s;" 
                 onclick="document.getElementById('targetUrl').value='${item.url}'; document.getElementById('analyzeBtn').click();">
                > ${domain}
            </div>`;
    });
    historyPanel.innerHTML = html;
}
renderHistory();

const targetUrlInput = document.getElementById('targetUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

targetUrlInput.addEventListener('input', () => sfx.type());

analyzeBtn.addEventListener('click', () => {
    const url = targetUrlInput.value.trim();
    if (!url) { sfx.error(); return; }
    sfx.execute();
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('exportPanel').style.display = 'none';
    document.getElementById('logs').innerHTML = '';
    socket.emit('start_analysis', { url });
});

downloadPdfBtn.addEventListener('click', () => {
    sfx.execute();
    const canvas = document.getElementById('linksChart');
    if (canvas) document.getElementById('pdfChartImage').src = canvas.toDataURL('image/png');

    const element = document.getElementById('pdfTemplate');
    const targetText = document.getElementById('pdfTargetUrl').innerText;
    let finalName = 'Dossier_Inteligencia.pdf';
    if(targetText) finalName = `Dossier_${new URL(targetText).hostname}.pdf`;

    const opt = {
        margin: 10, filename: finalName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
});

socket.on('log', msg => {
    sfx.logRecv();
    const p = document.createElement('div');
    p.innerText = `> ${msg}`;
    document.getElementById('logs').appendChild(p);
});

socket.on('analysis_complete', report => {
    sfx.success();
    saveToHistory(report.targetUrl, 'COMPLETADO');
    
    document.getElementById('logs').innerHTML = '> DATOS COMPILADOS. DESPLEGANDO MATRIZ...';
    document.getElementById('dashboard').style.display = 'grid';
    document.getElementById('exportPanel').style.display = 'flex';

    document.getElementById('desktopImg').src = `data:image/jpeg;base64,${report.screenshots.desktop}`;
    
    const ipStr = report.server ? report.server.ip : 'Oculta/Protegida';
    const locStr = report.server ? report.server.location : 'Desconocida';
    const sslClass = report.metrics.sslValid ? '' : 'danger';
    const altWarning = report.seo.imagesWithoutAlt > 0 ? 'danger' : '';
    const h1List = report.seo.mainHeadings.h1.map(h => `<li>${h}</li>`).join('');
    
    document.getElementById('seoData').innerHTML = `
        <p><strong>Nodo IP:</strong> <span style="color: #fff;">${ipStr}</span></p>
        <p><strong>Ubicación:</strong> <span style="color: #fff;">${locStr}</span></p>
        <hr style="border-color: var(--neon-cyan-dim); opacity: 0.5;">
        <p><strong>Latencia:</strong> ${report.metrics.loadTimeMs}ms</p>
        <p class="${sslClass}"><strong>Cifrado SSL:</strong> ${report.metrics.sslIssuer}</p>
        <hr style="border-color: var(--neon-cyan-dim); opacity: 0.5;">
        <p><strong>Open Graph:</strong> <span style="font-size: 0.9em;">${report.seo.ogTitle}</span></p>
        <p><strong>Imágenes sin ALT:</strong> <span class="${altWarning}">${report.seo.imagesWithoutAlt}</span></p>
        <hr style="border-color: var(--neon-cyan-dim); opacity: 0.5;">
        <p><strong>Vector H1:</strong></p>
        <ul style="padding-left: 15px; margin-top:0;">${h1List || '<li>[ VACÍO ]</li>'}</ul>
    `;

    document.getElementById('techData').innerHTML = report.technologies
        .map(t => `<span class="tag">[ ${t} ]</span>`).join('');

    const chartContainer = document.getElementById('linksChart').parentElement;
    chartContainer.innerHTML = '<h3>Distribución de Enlaces</h3><canvas id="linksChart" style="max-height: 200px;"></canvas><div id="linkLists" style="margin-top: 15px; font-size: 0.9em;"></div>';
    
    const ctx = document.getElementById('linksChart').getContext('2d');
    Chart.defaults.color = '#0ff';
    Chart.defaults.font.family = 'Share Tech Mono';
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Internos', 'Externos'],
            datasets: [{
                data: [report.links.internalCount, report.links.externalCount],
                backgroundColor: ['rgba(0, 240, 255, 0.8)', 'rgba(0, 80, 100, 0.8)'],
                borderColor: '#0ff', borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });

    const intLinksHtml = report.links.internalUrls.map(url => `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">> ${url}</div>`).join('');
    const extLinksHtml = report.links.externalUrls.map(url => `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: rgba(0,240,255,0.5);">> ${url}</div>`).join('');
    document.getElementById('linkLists').innerHTML = `
        <p style="margin-bottom: 5px; border-bottom: 1px dashed var(--neon-cyan-dim);"><strong>Vectores Internos Top 15:</strong></p>
        ${intLinksHtml || 'Ninguno detectado'}
        <p style="margin-bottom: 5px; margin-top: 15px; border-bottom: 1px dashed var(--neon-cyan-dim);"><strong>Vectores Externos Top 15:</strong></p>
        ${extLinksHtml || 'Ninguno detectado'}
    `;

    // INYECTAR DATOS AL PDF OCULTO
    document.getElementById('pdfTargetUrl').innerText = report.targetUrl;
    document.getElementById('pdfDate').innerText = new Date().toLocaleString();
    document.getElementById('pdfImage').src = `data:image/jpeg;base64,${report.screenshots.desktop}`;
    document.getElementById('pdfIp').innerText = ipStr;
    document.getElementById('pdfLoc').innerText = locStr;
    document.getElementById('pdfLat').innerText = report.metrics.loadTimeMs + 'ms';
    document.getElementById('pdfSsl').innerText = report.metrics.sslIssuer;
    document.getElementById('pdfTech').innerText = report.technologies.join(' | ');
    
    document.getElementById('pdfIntLinks').innerText = report.links.internalCount;
    document.getElementById('pdfExtLinks').innerText = report.links.externalCount;

    const pdfIntList = document.getElementById('pdfIntList');
    pdfIntList.innerHTML = report.links.internalUrls.length > 0 
        ? report.links.internalUrls.map(url => `<li>${url}</li>`).join('') 
        : '<li>Ninguno detectado</li>';

    const pdfExtList = document.getElementById('pdfExtList');
    pdfExtList.innerHTML = report.links.externalUrls.length > 0 
        ? report.links.externalUrls.map(url => `<li>${url}</li>`).join('') 
        : '<li>Ninguno detectado</li>';
});

socket.on('analysis_error', msg => { sfx.error(); alert(`Error: ${msg}`); });