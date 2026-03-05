import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { enhanceMessageForCharts, cleanChartUrlsFromResponse } from '@/lib/utils/message-enhancer';



// Función para validar datos de entrada
function validateBayerRequest(message: string): { isValid: boolean; error?: string } {
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'El mensaje debe ser una cadena de texto válida' };
  }
  
  if (message.trim().length === 0) {
    return { isValid: false, error: 'El mensaje no puede estar vacío' };
  }
  
  if (message.length > 2000) {
    return { isValid: false, error: 'El mensaje es demasiado largo (máximo 2000 caracteres)' };
  }
  
  // Filtrar contenido potencialmente problemático
  const suspiciousPatterns = [
    /script/i, /javascript/i, /eval/i, /function/i,
    /<[^>]*>/g, // HTML tags
    /\$\{.*\}/g // Template literals
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      return { isValid: false, error: 'El mensaje contiene contenido no permitido' };
    }
  }
  
  return { isValid: true };
}

// API específica para el chatbot de Bayer
// Integra con la API externa de Bayer
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { message, needChart = true } = body;
    
    // Log de la solicitud entrante
    logger.info('Bayer chat request received', {
      message: message?.substring(0, 100) + (message?.length > 100 ? '...' : ''),
      needChart,
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Validar parámetros requeridos
    if (!message || typeof message !== 'string') {
      logger.warn('Bayer chat request failed: invalid message parameter', {
        message,
        ip: request.ip || 'unknown'
      });
      return NextResponse.json(
        { error: 'Message parameter is required and must be a string' },
        { status: 400 }
      );
    }

    // Validar datos de entrada con función mejorada
    const validation = validateBayerRequest(message);
    if (!validation.isValid) {
      logger.warn('Validación fallida para mensaje de Bayer:', { error: validation.error, message });
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // URL de la API externa específica de Bayer
    const bayerApiUrl = 'https://agent-service-bayer-v1-294493969622.us-central1.run.app/chat';
    
    // Preparar datos para el servicio externo de Bayer
    const enhancedMessage = enhanceMessageForCharts(message, needChart !== false);
    
    const bayerContext = `[CONTEXTO BAYER - ASISTENTE ESPECIALIZADO]

Eres un asistente virtual especializado en productos y soluciones agrícolas de Bayer CropScience. Tu conocimiento incluye:

PRODUCTOS BAYER:
- Herbicidas: Roundup, Liberty, XtendiMax
- Fungicidas: Delaro, Stratego, Headline
- Insecticidas: Belt, Coragen, Movento
- Semillas: Dekalb, Asgrow, Channel
- Biotecnología: Tecnologías de edición genética

SOLUCIONES DIGITALES:
- Climate FieldView: Plataforma de agricultura digital
- Bayer AgPowered: Soluciones de agricultura inteligente
- FieldScript: Prescripciones de semillas

INNOVACIONES:
- Tecnologías de edición genética CRISPR
- Semillas resistentes a sequía y enfermedades
- Productos para agricultura sostenible
- Soluciones para cambio climático

RESPONDE ESPECÍFICAMENTE sobre:
- Productos de protección de cultivos de Bayer
- Innovaciones en semillas y biotecnología
- Soluciones digitales para agricultura
- Tecnologías de edición genética
- Productos para mejorar rendimiento de cultivos
- Agricultura sostenible y cambio climático

Pregunta del usuario: ${enhancedMessage}

IMPORTANTE: Responde como experto en productos Bayer, mencionando nombres específicos de productos cuando sea relevante.`;

    const requestData = {
      message: bayerContext,
      needChart: needChart !== false,
      client: 'postgresql_conn_bayer',
      user_id: '5491166111880',
      session_id: '5491166111880',
      client_id: 'bayer_evolve_wsp',
      product_id: 'chatbot',
      responseFormat: 'detailed',
      source: 'bayer-chatbot',
      domain: 'agriculture',
      company: 'bayer',
      industry: 'agriculture',
      specialization: 'crop-protection',
      expertise: 'bayer-products',
      context: 'bayer-agricultural-solutions'
    };

    // Enviar al servicio externo de Bayer con timeout reducido
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

    // Log de los datos que se envían a la API externa
    logger.info('Enviando solicitud a API externa de Bayer', {
      url: bayerApiUrl,
      requestData: {
        messageLength: bayerContext.length,
        client: requestData.client,
        needChart: requestData.needChart,
        source: requestData.source,
        domain: requestData.domain,
        company: requestData.company
      },
      timeout: 60000
    });

    try {
      const response = await fetch(bayerApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Bayer-Chatbot/1.0'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Manejo de errores HTTP
      if (!response.ok) {
        // Intentar leer el cuerpo de la respuesta para más detalles
        let errorBody = '';
        try {
          errorBody = await response.text();
          logger.error('Bayer external API error - Full response body', {
            status: response.status,
            statusText: response.statusText,
            responseTime,
            url: response.url,
            errorBody: errorBody.substring(0, 500), // Limitar a 500 caracteres
            headers: Object.fromEntries(response.headers.entries())
          });
        } catch (readError) {
          logger.error('Bayer external API error - Could not read response body', {
            status: response.status,
            statusText: response.statusText,
            responseTime,
            url: response.url,
            readError: readError instanceof Error ? readError.message : 'Unknown error'
          });
        }
        
        // Manejo específico para error 422 y otros errores
        if (response.status === 422) {
          logger.warn(`API de Bayer devolvió 422, proporcionando respuesta de fallback. Error body: ${errorBody.substring(0, 200)}`);
          
          return NextResponse.json(
            { 
              reply: 'Lo siento, el servicio de Bayer está experimentando dificultades técnicas temporales. Nuestro equipo técnico está trabajando para resolver este problema. Mientras tanto, te recomiendo que contactes directamente con Bayer para consultas específicas sobre productos.',
              isError: false, // Marcar como respuesta válida, no como error
              source: 'bayer-fallback',
              message: 'Respuesta de fallback por error 422 de la API externa',
              originalError: errorBody.substring(0, 200) // Incluir el error original para debugging
            },
            { status: 200 } // Devolver 200 para que el frontend no lo trate como error
          );
        } else if (response.status >= 500) {
          logger.error(`API de Bayer devolvió ${response.status} - Server error`);
          
          return NextResponse.json(
            { 
              error: `Error de la API de Bayer: ${response.status} ${response.statusText}`,
              reply: 'Lo siento, el servicio de Bayer no está disponible en este momento. Por favor, intenta nuevamente más tarde.',
              isError: true,
              originalError: errorBody.substring(0, 200)
            },
            { status: response.status }
          );
        }
        
        // Para otros errores HTTP, devolver error específico
        return NextResponse.json(
          { 
            error: `Error de la API de Bayer: ${response.status} ${response.statusText}`,
            reply: 'Lo siento, hubo un problema al conectar con el servicio de Bayer. Intenta nuevamente.',
            isError: true,
            originalError: errorBody.substring(0, 200)
          },
          { status: response.status }
        );
      }

      // Procesar respuesta exitosa
      let data;
      try {
        const responseText = await response.text();
        
        if (!responseText.trim()) {
          throw new Error('La respuesta de Bayer está vacía');
        }
        
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Error parsing Bayer API response', {
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          responseTime
        });
        
        return NextResponse.json(
          { 
            error: 'Error procesando la respuesta de Bayer',
            reply: 'Lo siento, hubo un problema al procesar la respuesta del servicio de Bayer. Por favor, intenta nuevamente.',
            isError: true
          },
          { status: 500 }
        );
      }

      // Verificar si es un mensaje de error de la API
      if (data.isError || !data.reply) {
        logger.warn('Bayer API returned error or invalid response', {
          error: data.error,
          reply: data.reply,
          responseTime
        });
        
        return NextResponse.json(
          { 
            error: 'Respuesta inválida de la API de Bayer',
            reply: 'Lo siento, el servicio de Bayer devolvió una respuesta inválida. Por favor, intenta nuevamente.',
            isError: true
          },
          { status: 502 }
        );
      }

      // Normalizar el campo de gráfico para consistencia
      if (data.chart_url && !data.chart) {
        data.chart = data.chart_url;
        delete data.chart_url;
      }
      
      // Limpiar URLs de gráficos del texto de respuesta
      if (data.reply && data.chart) {
        data.reply = cleanChartUrlsFromResponse(data.reply);
      }

      // Procesar respuesta exitosa
      logger.info('Bayer chat request completed successfully', {
        responseTime,
        hasReply: !!data.reply,
        hasChart: !!data.chart
      });

      // Asegurar formato consistente para el frontend
      const responseData = {
        reply: data.reply || data.message || 'Respuesta recibida de Bayer',
        chart: data.chart || null,
        needChart: data.needChart || needChart,
        timestamp: new Date().toISOString(),
        source: 'bayer-api',
        debug: {
          parametersUsed: {
            client: requestData.client,
            user_id: requestData.user_id,
            session_id: requestData.session_id,
            client_id: requestData.client_id,
            product_id: requestData.product_id,
            needChart: requestData.needChart
          },
          apiUrl: bayerApiUrl,
          responseTime,
          messageLength: bayerContext.length
        },
        ...data
      };

      return NextResponse.json(responseData);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      logger.error('Error de conexión con la API de Bayer:', {
        error: fetchError.message,
        name: fetchError.name,
        responseTime,
        stack: fetchError.stack
      });
      
      let errorMessage = 'Lo siento, no se pudo conectar con el servicio de Bayer. ';
      
      if (fetchError.name === 'AbortError') {
        errorMessage += 'El servicio tardó demasiado en responder. Por favor, intenta nuevamente.';
        logger.error('Timeout en la API de Bayer');
      } else {
        errorMessage += 'Hay un problema de conexión temporal. Por favor, intenta nuevamente más tarde.';
        logger.error('Error de conexión con API de Bayer');
      }
      
      return NextResponse.json(
        {
          error: 'Error de conexión con la API de Bayer',
          reply: errorMessage,
          isError: true
        },
        { status: 503 }
      );
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Error general en el endpoint de Bayer:', {
      error: error.message,
      responseTime,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        reply: 'Lo siento, ocurrió un error interno. Por favor, intenta nuevamente más tarde.',
        isError: true
      },
      { status: 500 }
    );
  }
}

// Configuración de Next.js para APIs dinámicas
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
