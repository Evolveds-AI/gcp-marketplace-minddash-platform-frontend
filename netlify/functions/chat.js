const axios = require('axios');

// Establecer límite de tiempo para la función
exports.handler = async function(event, context) {
  // Configurar el tiempo de espera de la función (pero seguimos limitados a 10s en Netlify)
  context.callbackWaitsForEmptyEventLoop = false;
  // Handle OPTIONS request for CORS
  // Definir los orígenes permitidos
  const allowedOrigins = [
    'https://chatbot-lisa.netlify.app',
    'https://chatbot-nextjs-app.netlify.app',
    'http://localhost:3000'
  ];
  
  // Obtener el origen de la solicitud
  const origin = event.headers.origin || event.headers.Origin || '*';
  
  // Verificar si el origen está permitido
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  // Solo permitir solicitudes POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    // Obtener los datos de la solicitud
    const body = JSON.parse(event.body);
    console.log('Request body:', body);
    
    if (!body.message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({ error: 'El campo "message" es requerido' })
      };
    }
    
    // Obtener el cliente del cuerpo de la solicitud, si existe
    const client = body.client || 'default';
    console.log(`Cliente seleccionado: ${client}`);
    
    // URL de la API externa - Usando la URL proporcionada por ngrok
    // Nota: Esta URL debe mantenerse actualizada si cambia el endpoint del túnel ngrok
    const apiUrl = 'https://3297-38-25-26-51.ngrok-free.app/chat';
    
    // Configuración de timeout para la solicitud
    // NOTA: Netlify tiene un límite duro de 26 segundos para funciones en el plan gratuito,
    // y 10 segundos en el plan pro si no se configura lo contrario
    // Ver: https://docs.netlify.com/functions/build/#runtime-limits
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 25000 // 25 segundos de timeout - máximo posible para Netlify plan gratuito
    };

    console.log(`Enviando solicitud a: ${apiUrl}`);
    
    // Realizar la solicitud a la API externa
    const response = await axios.post(apiUrl, {
      message: body.message,
      client: client // Incluir el cliente en la solicitud
    }, axiosConfig);

    console.log('Respuesta de la API externa:', response.data);
    
    // Si la respuesta no tiene el formato esperado, formatearlo
    let responseData = response.data;
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        // Si no es JSON válido, creamos una respuesta básica
        responseData = { reply: responseData };
      }
    }
    
    // Asegurarse de que haya un campo 'reply'
    if (!responseData.reply) {
      responseData.reply = "No se recibió una respuesta válida del chatbot";
    }
    
    // Devolver la respuesta de la API externa
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    
    // Manejar diferentes tipos de errores
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;
    // Mensaje para el usuario final
    let userMessage = "Lo siento, hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo.";
    
    if (error.response) {
      // El servidor respondió con un código de error
      errorMessage = `Error de la API externa: ${error.response.status} ${error.response.statusText}`;
      statusCode = error.response.status;
      
      // Intentar extraer más detalles del error
      if (error.response.data) {
        const errorData = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
        console.error('Detalles del error de la API:', errorData);
        errorMessage += ` - ${errorData}`;
      }
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      errorMessage = 'No se recibió respuesta de la API externa. Verifique que el servidor esté en ejecución.';
      statusCode = 504; // Gateway Timeout
      userMessage = "El servicio de chat está tardando en responder. Por favor, intenta una pregunta más corta o espera unos minutos.";
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'No se pudo conectar al servidor. Verifique que el servidor esté en ejecución.';
      statusCode = 503; // Service Unavailable
      userMessage = "No se pudo conectar al servicio de chat. Por favor, verifica que el servidor esté activo.";
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = 'La solicitud ha excedido el tiempo de espera. El servidor puede estar sobrecargado.';
      statusCode = 504; // Gateway Timeout
      userMessage = "El servicio está tardando demasiado en responder. Intenta con una pregunta más simple o espera unos minutos.";
    }
    
    // Registrar el tiempo que tomó la solicitud para fines de diagnóstico
    console.log(`Tiempo de respuesta excedido: ${errorMessage}`);
    
    // En caso de timeout, proporcionar una respuesta más amigable
    if (statusCode === 504 || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.log('Detectado timeout. Enviando respuesta alternativa al usuario.');
    }
    
    return {
      statusCode: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ 
        error: errorMessage,
        reply: userMessage,
        isError: true // Flag para que el frontend identifique que es un mensaje de error
      })
    };
  }
};
