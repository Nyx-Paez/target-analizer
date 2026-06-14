# target-analizer
# 🎯 Target Analyzer

Target Analyzer es una herramienta web desarrollada para extraer y analizar información específica de cualquier URL proporcionada. El sistema simula la navegación humana a través de un "ghost browser" para obtener datos precisos sobre métricas de carga, estructura SEO, stack tecnológico y aspectos de seguridad de páginas web.

## 🚀 Características Principales

El proyecto está dividido en tres áreas funcionales principales:

1. **Frontend (Interfaz de Usuario):** Interfaz inmersiva con estilo de terminal clásica para la interacción del usuario y visualización de resultados en tiempo real.
2. **Backend (Servidor):** Construido en Node.js, se encarga de procesar las peticiones del frontend y coordinar el análisis.
3. **Robot de Scraping (Ghost Browser):** Desarrollado con Puppeteer para navegar de forma invisible, renderizar JavaScript y extraer la data cruda del objetivo.

## 🛠️ Tecnologías Utilizadas

* **Backend:** Node.js, Express.js
* **Scraping & Automatización:** Puppeteer
* **Comunicación en Tiempo Real:** Socket.io
* **Frontend:** HTML5, CSS3 (Estilo Terminal), JavaScript (Vanilla)

## 📋 Requisitos Previos

Antes de ejecutar el proyecto, asegurate de tener instalado:

* [Node.js](https://nodejs.org/) (Versión 16 o superior recomendada)
* Git

## ⚙️ Instalación y Configuración

Sigue estos pasos para levantar el entorno de desarrollo local:

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/TU-USUARIO/target-analyzer.git](https://github.com/TU-USUARIO/target-analyzer.git)

    Navegar a la carpeta del proyecto:
    Bash

    cd target-analyzer

    Instalar las dependencias:
    Este comando descargará todas las librerías necesarias (Express, Puppeteer, Socket.io, etc.) en la carpeta node_modules (la cual es ignorada por Git).
    Bash

    npm install

💻 Uso

Para arrancar el servidor local y utilizar la herramienta:

    Inicia el servidor:
    Bash

    npm start

    (Nota: si estás utilizando nodemon u otro script de desarrollo, puedes usar npm run dev)

    Abre la aplicación:
Abre tu navegador web de preferencia y navega a:
http://localhost:3000 (o el puerto configurado en tu servidor).
    Abre tu navegador web de preferencia y navega a:
    http://localhost:3000 (o el puerto configurado en tu servidor).
