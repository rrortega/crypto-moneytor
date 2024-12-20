module.exports = {
  // Directorio raíz donde buscar pruebas
  spec: "tests/**/*.spec.mjs", // Busca archivos que terminen en `.spec.js` dentro de la carpeta `tests`
  
  // Configuración de tiempo de espera
  timeout: 10000, // 10 segundos para las pruebas (útil para integraciones que pueden tardar)
  
  // Reintentos para pruebas fallidas
  retries: 2, // Vuelve a intentar las pruebas fallidas hasta 2 veces
  
  // Habilitar colores en la salida
  color: true, // Salida en colores para una mejor legibilidad
  
  // Reportador de salida
  reporter: "spec", // Usa el reporte 'spec' para un formato más legible en la consola
  
  // Limitar la profundidad del stack trace en errores
  bail: false, // No detiene las pruebas si alguna falla
  
  // Configuración de entorno para las pruebas
  require: ["dotenv/config" ], // Carga automáticamente las variables de entorno desde .env
  
  // Archivos que cargar antes de las pruebas
  file: ["tests/setup.mjs"], // Archivo donde puedes inicializar configuraciones globales (opcional)

  nodeOption: ["--no-warnings"],
};
