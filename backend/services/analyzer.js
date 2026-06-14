const dns = require('dns').promises;

async function runGhostBrowser(targetUrl, socket) {
    const { default: puppeteer } = await import('puppeteer');
    
    if (socket) socket.emit('log', '[INFO] Inicializando Puppeteer...');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    let report = {
        targetUrl,
        timestamp: new Date().toISOString(),
        metrics: {},
        security: {},
        seo: { mainHeadings: { h1: [], h2: [] } },
        links: {},
        technologies: [],
        screenshots: {},
        server: {}
    };

    try {
        const startTime = Date.now();
        const response = await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        report.metrics.loadTimeMs = Date.now() - startTime;
        
        if (socket) socket.emit('log', '[INFO] Triangulando coordenadas del servidor (DNS/IP)...');
        const hostname = new URL(targetUrl).hostname;
        try {
            const dnsRecord = await dns.lookup(hostname);
            report.server.ip = dnsRecord.address;
            const geoRes = await fetch(`http://ip-api.com/json/${dnsRecord.address}`);
            const geoData = await geoRes.json();
            if(geoData.status === 'success') {
                report.server.location = `${geoData.city}, ${geoData.country} (${geoData.isp})`;
            } else {
                report.server.location = 'Desconocida';
            }
        } catch (e) {
            report.server = { ip: 'Oculta/Protegida', location: 'Desconocida' };
        }

        if (socket) socket.emit('log', '[INFO] Interceptando cabeceras y métricas de red...');
        report.metrics.statusCode = response.status();
        
        const securityDetails = response.securityDetails();
        report.metrics.sslValid = !!securityDetails;
        report.metrics.sslIssuer = securityDetails ? securityDetails.issuer() : 'N/A';

        if (socket) socket.emit('log', '[INFO] Adquiriendo telemetría visual...');
        await page.setViewport({ width: 1920, height: 1080 });
        report.screenshots.desktop = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 50 });

        if (socket) socket.emit('log', '[INFO] Mapeando topología del DOM y SEO Profundo...');
        report.seo.metaTitle = await page.title();
        report.seo.ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => 'No definida');
        report.seo.imagesWithoutAlt = await page.$$eval('img:not([alt])', els => els.length);

        report.seo.mainHeadings = await page.evaluate(() => {
            const h1 = Array.from(document.querySelectorAll('h1')).map(el => el.innerText.trim()).filter(t => t);
            const h2 = Array.from(document.querySelectorAll('h2')).map(el => el.innerText.trim()).filter(t => t);
            return { h1, h2: h2.slice(0, 5) }; 
        });

        if (socket) socket.emit('log', '[INFO] Extrayendo vectores de enlaces crudos...');
        const allLinks = await page.$$eval('a', els => els.map(a => a.href).filter(href => href.startsWith('http')));
        
        const internalLinks = allLinks.filter(l => l.includes(hostname));
        const externalLinks = allLinks.filter(l => !l.includes(hostname));

        report.links.internalCount = internalLinks.length;
        report.links.externalCount = externalLinks.length;
        report.links.internalUrls = internalLinks.slice(0, 15);
        report.links.externalUrls = externalLinks.slice(0, 15);

        if (socket) socket.emit('log', '[INFO] Identificando vectores tecnológicos...');
        report.technologies = await page.evaluate(() => {
            const tech = [];
            if (document.querySelector('[data-reactroot]')) tech.push('React');
            if (document.querySelector('script[src*="wp-includes"]')) tech.push('WordPress');
            if (document.querySelector('script[src*="google-analytics"]')) tech.push('Google Analytics');
            if (window.jQuery) tech.push(`jQuery ${window.jQuery.fn.jquery}`);
            return tech.length > 0 ? tech : ['Modo Sigilo Detectado'];
        });

    } catch (error) {
        throw new Error(`Fallo en el rastreo: ${error.message}`);
    } finally {
        await browser.close();
    }
    
    return report;
}

module.exports = { runGhostBrowser };