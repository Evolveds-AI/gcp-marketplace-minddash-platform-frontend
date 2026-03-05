import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../lib/logger';
import { enhanceMessageForCharts, cleanChartUrlsFromResponse, extractTableDataForChart } from '../../../lib/utils/message-enhancer';
import { validateEndpointAccess, generateDataFilters } from '@/lib/middleware/dataAccess';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar autorización para acceso a mensajes
    const authResult = await validateEndpointAccess(
      request,
      ['message'],
      undefined
    );

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { message, client, needChart } = body;

    // Log de la solicitud entrante
    logger.info('Message request received', {
      message: message?.substring(0, 100) + (message?.length > 100 ? '...' : ''),
      client,
      needChart,
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Validar parámetros requeridos
    if (!message || typeof message !== 'string') {
      logger.warn('Message request failed: invalid message parameter', {
        message,
        client,
        ip: request.ip || 'unknown'
      });
      return NextResponse.json(
        { error: 'Message parameter is required and must be a string' },
        { status: 400 }
      );
    }

    // URL del servicio externo
    const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || '';

    // Mejorar el mensaje para solicitar gráficos cuando sea apropiado
    const enhancedMessage = enhanceMessageForCharts(message, needChart !== false);

    // Contexto para chatbots generales (no Bayer)
    const generalContext = `[CONTEXTO GENERAL - ASISTENTE EMPRESARIAL]

Eres un asistente virtual empresarial especializado en análisis de datos y gestión comercial. Tu conocimiento incluye:

ÁREAS DE ESPECIALIZACIÓN:
- Análisis de ventas y rendimiento comercial
- Estadísticas y métricas empresariales
- Reportes y dashboards ejecutivos
- Gestión de equipos comerciales
- Análisis de tendencias y rankings

CAPACIDADES:
- Consultas sobre vendedores y equipos de ventas
- Análisis de datos empresariales
- Generación de reportes y estadísticas
- Rankings y comparativas de rendimiento
- Visualización de datos con gráficos

RESPONDE ESPECÍFICAMENTE sobre:
- Consultas de ventas y vendedores
- Análisis de datos empresariales y comerciales
- Rankings y top performers
- Métricas y estadísticas de negocio
- Datos para visualización y reportes

Pregunta del usuario: ${enhancedMessage}`;

    // Preparar datos para el servicio externo con campos requeridos
    const requestData = {
      message: generalContext,
      needChart: needChart !== false,
      client: 'postgresql_conn_bayer',
      user_id: 'user-' + Date.now(),
      session_id: 'session-' + Date.now(),
      client_id: client || 'general',
      product_id: 'general-business'
    };

    // Mensaje enviado al servicio externo

    // Enviar al servicio externo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 segundos de timeout (aumentado para primer mensaje)

    const response = await fetch(AGENT_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('External service error', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        responseTime,
        client: requestData.client
      });

      // Manejo especial para errores comunes con respuesta de fallback
      if (response.status === 422 || response.status === 404) {
        return NextResponse.json({
          reply: "Lo siento, el servicio está experimentando dificultades técnicas temporales. Nuestro equipo está trabajando para resolver este problema. Por favor, intenta de nuevo en unos momentos o contacta al soporte técnico si el problema persiste.",
          isError: true,
          error: `Servicio temporalmente no disponible (${response.status})`
        });
      }

      return NextResponse.json(
        { error: `External service error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const responseData = await response.json();

    // PRIMERO: Extraer chart_url del texto si el bot lo proporciona (antes de limpiarlo)
    if (responseData.reply) {
      // Intentar extraer URL directa primero
      const chartUrlMatch = responseData.reply.match(/https:\/\/quickchart\.io\/chart\?[^\s\)]+/);
      if (chartUrlMatch) {
        responseData.chart = chartUrlMatch[0];
        responseData.chart_url = chartUrlMatch[0];
      } else {
        // Si no hay URL, buscar datos JSON del gráfico en diferentes formatos
        let chartJsonMatch = responseData.reply.match(/```chart\s*(\{[\s\S]*?\})\s*```/);
        if (!chartJsonMatch) {
          // Intentar otro formato: chart_url seguido de JSON
          chartJsonMatch = responseData.reply.match(/chart_url\s*```\s*(\{[\s\S]*?\})\s*```/);
        }
        if (chartJsonMatch) {
          try {
            const chartData = JSON.parse(chartJsonMatch[1]);
            let quickChartConfig;

            // Convertir formato del bot a formato QuickChart
            if (chartData.chart_type && chartData.data) {
              quickChartConfig = {
                type: 'bar',
                data: {
                  labels: chartData.data.labels,
                  datasets: chartData.data.datasets.map((dataset: any) => ({
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: [
                      'rgba(54, 162, 235, 0.8)',
                      'rgba(255, 99, 132, 0.8)',
                      'rgba(255, 205, 86, 0.8)',
                      'rgba(75, 192, 192, 0.8)',
                      'rgba(153, 102, 255, 0.8)'
                    ]
                  }))
                },
                options: {
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: chartData.options?.title || 'Gráfico'
                    }
                  }
                }
              };
            } else {
              // Si ya está en formato QuickChart
              quickChartConfig = chartData;
            }

            const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(quickChartConfig))}`;
            responseData.chart = chartUrl;
            responseData.chart_url = chartUrl;
          } catch (error) {
            console.log('Error parsing chart JSON:', error);
          }
        }
      }
    }

    // SEGUNDO: Si no hay gráfico, generar uno dinámico extrayendo datos de la tabla
    if (!responseData.chart_url && !responseData.chart && responseData.reply) {
      try {
        if (responseData.reply.includes('top') || responseData.reply.includes('ranking') || responseData.reply.includes('vendedor')) {
          // Intentar extraer datos reales de la tabla
          const tableData = extractTableDataForChart(responseData.reply);

          if (tableData) {
            // Generar gráfico dinámico con datos reales
            const quickChartConfig = {
              type: 'bar',
              data: {
                labels: tableData.labels,
                datasets: [{
                  label: 'Ventas (Millones USD)',
                  data: tableData.data,
                  backgroundColor: [
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(199, 199, 199, 0.8)',
                    'rgba(83, 102, 255, 0.8)'
                  ]
                }]
              },
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: tableData.title
                  },
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Ventas (Millones USD)'
                    }
                  }
                }
              }
            };

            // Validar y generar URL de QuickChart
            try {
              const chartConfigString = JSON.stringify(quickChartConfig);
              const encodedConfig = encodeURIComponent(chartConfigString);

              // Verificar que la URL no sea demasiado larga (límite de QuickChart ~8000 caracteres)
              const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}`;

              if (chartUrl.length > 8000) {
                console.warn('[Chart] URL demasiado larga, usando configuración simplificada');
                // Crear una versión simplificada
                const simpleConfig = {
                  type: 'bar',
                  data: {
                    labels: tableData.labels.slice(0, 5), // Limitar a 5 elementos
                    datasets: [{
                      label: 'Ventas',
                      data: tableData.data.slice(0, 5),
                      backgroundColor: 'rgba(54, 162, 235, 0.8)'
                    }]
                  },
                  options: {
                    responsive: true,
                    plugins: {
                      title: {
                        display: true,
                        text: tableData.title
                      }
                    }
                  }
                };
                const simpleUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(simpleConfig))}`;
                responseData.chart = simpleUrl;
                responseData.chart_url = simpleUrl;
              } else {
                responseData.chart = chartUrl;
                responseData.chart_url = chartUrl;
              }
            } catch (urlError) {
              console.error('[Chart] Error generando URL de QuickChart:', urlError);
              // Fallback con configuración mínima
              const fallbackConfig = {
                type: 'bar',
                data: {
                  labels: ['Sin datos'],
                  datasets: [{
                    label: 'Sin datos',
                    data: [0],
                    backgroundColor: 'rgba(200, 200, 200, 0.8)'
                  }]
                }
              };
              const fallbackUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(fallbackConfig))}`;
              responseData.chart = fallbackUrl;
              responseData.chart_url = fallbackUrl;
            }
          } else {
            // Fallback solo si no se pueden extraer datos
            const fallbackConfig = {
              type: 'bar',
              data: {
                labels: ['Datos no disponibles'],
                datasets: [{
                  label: 'Sin datos',
                  data: [0],
                  backgroundColor: 'rgba(200, 200, 200, 0.8)'
                }]
              }
            };
            const fallbackUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(fallbackConfig))}`;
            responseData.chart = fallbackUrl;
            responseData.chart_url = fallbackUrl;
          }
        }
      } catch (error) {
        console.log('Error dynamic chart generation:', error);
      }
    }

    // TERCERO: Limpiar URLs de gráficos y mensajes explicativos del texto de respuesta (DESPUÉS de extraer)
    if (responseData.reply && responseData.chart) {
      responseData.reply = cleanChartUrlsFromResponse(responseData.reply);
    }

    // CUARTO: Normalizar el campo de gráfico para consistencia
    if (responseData.chart_url && !responseData.chart) {
      responseData.chart = responseData.chart_url;
      delete responseData.chart_url;
    }

    logger.info('Message processed successfully', {
      responseTime,
      client: requestData.client,
      hasError: responseData.isError || false,
      hasFunctionDetails: !!responseData.functionDetails,
      hasChart: !!responseData.chart,
      hasChartUrl: !!responseData.chart_url,
      enhancedMessage: enhancedMessage.substring(0, 200) + '...'
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Message request timeout', {
        responseTime,
        error: 'Request timeout after 60 seconds'
      });
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      );
    }

    logger.error('Message processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}