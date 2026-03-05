import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { enhanceMessageForCharts, cleanChartUrlsFromResponse } from '@/lib/utils/message-enhancer';

const prisma = new PrismaClient();

// API de chat personalizada para productos/chatbots individuales
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, productId, clientId } = body;

    // Validar parámetros requeridos
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro message es requerido y debe ser una cadena de texto' },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'El parámetro productId es requerido' },
        { status: 400 }
      );
    }

    // Buscar el producto
    const product = await prisma.products.findFirst({
      where: {
        id: productId
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Construir el prompt personalizado
    let systemPrompt = '';
    
    if (product.config && typeof product.config === 'object') {
      const config = product.config as any;
      
      // Usar configuración personalizada del producto
      if (config.systemContext) {
        systemPrompt += config.systemContext + '\n\n';
      }
      
      if (config.customPrompt) {
        systemPrompt += config.customPrompt + '\n\n';
      }
    }

    // Mejorar el mensaje del usuario para forzar gráficos cuando sea apropiado
    const enhancedMessage = enhanceMessageForCharts(message, true);
    systemPrompt += `Pregunta del usuario: ${enhancedMessage}`;

    // Preparar datos para el servicio externo
    const requestData = {
      message: systemPrompt || message,
      client: clientId || productId,
      needChart: true,
      source: 'personalized-chatbot',
      productId: productId,
      forceVisualization: true,
      chartTypes: ['bar', 'pie', 'line', 'area'],
      responseFormat: 'detailed'
    };

    // URL de la API externa
    const apiUrl = 'https://agent-service-clients-294493969622.us-central1.run.app/chat';

    // Enviar al servicio externo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `Error de la API externa: ${response.status} ${response.statusText}`,
          reply: 'Lo siento, hubo un problema al procesar tu consulta. Intenta nuevamente.',
          isError: true
        },
        { status: response.status }
      );
    }

    let data;
    try {
      const responseText = await response.text();
      
      if (!responseText.trim()) {
        throw new Error('La respuesta está vacía');
      }
      
      data = JSON.parse(responseText);
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Error al procesar la respuesta',
          reply: 'Recibí una respuesta pero no pude procesarla correctamente. Intenta reformular tu pregunta.',
          isError: true
        },
        { status: 500 }
      );
    }

    // Verificar si es un mensaje de error
    if (data.isError) {
      return NextResponse.json({
        error: data.error || 'Error desconocido',
        reply: data.reply || 'Hubo un problema con la consulta.',
        isError: true
      });
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

    // Asegurar formato consistente para el frontend
    const responseData = {
      reply: data.reply || data.message || 'Respuesta procesada',
      timestamp: new Date().toISOString(),
      source: 'personalized-chatbot',
      productId: productId,
      ...data
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    let errorMessage = 'Error interno del servidor';
    let userMessage = 'Lo siento, hubo un problema al procesar tu consulta. Por favor, intenta nuevamente.';

    if (error.name === 'AbortError') {
      errorMessage = 'Timeout de la solicitud';
      userMessage = 'La consulta tardó demasiado en procesarse. Intenta con una pregunta más específica.';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        reply: userMessage,
        isError: true
      },
      { status: 500 }
    );
  }
}