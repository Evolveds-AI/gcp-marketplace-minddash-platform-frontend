const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Función para ejecutar comandos
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    console.log(`Ejecutando: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.warn(`Advertencia: ${stderr}`);
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
};

// Función principal de despliegue
async function deploy() {
  try {
    // 1. Limpiar carpetas de compilación anteriores
    console.log('Limpiando carpetas de compilación anteriores...');
    await runCommand('rm -rf out .next');

    // 2. Construir la aplicación
    console.log('Construyendo la aplicación...');
    await runCommand('npm run build');

    // 3. Asegurarse de que la carpeta out contiene _redirects
    console.log('Copiando archivos de configuración...');
    
    if (fs.existsSync('public/_redirects')) {
      fs.copyFileSync('public/_redirects', 'out/_redirects');
      console.log('Archivo _redirects copiado.');
    }
    
    if (fs.existsSync('public/netlify.toml')) {
      fs.copyFileSync('public/netlify.toml', 'out/netlify.toml');
      console.log('Archivo netlify.toml copiado.');
    }

    // 4. Desplegar a Netlify con funciones explícitas
    console.log('Desplegando a Netlify con funciones...');
    await runCommand('npx netlify deploy --prod --dir=out --functions=netlify/functions');

    console.log('\n✅ Despliegue completado con éxito.');
  } catch (error) {
    console.error('❌ Error durante el despliegue:', error);
  }
}

// Ejecutar el despliegue
deploy();
