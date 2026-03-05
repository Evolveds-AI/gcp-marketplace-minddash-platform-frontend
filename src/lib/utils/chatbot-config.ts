export const chatbotConfigs: Record<string, {
    clientId: string;
    welcomeMessage: string;
    about: string;
    suggestedPrompts: string[];
    exampleQuestions: string[];
    component: 'base' | 'comingSoon';
    apiEndpoint?: string; // Para APIs específicas
  }> = {
    'lisit': {
      clientId: 'lisit',
      welcomeMessage: 'Soy LISA, tu Chatbot especializado en análisis de datos.',
      about: 'Tu asistente virtual especializado en análisis de datos.',
      suggestedPrompts: [
        '¿Cuáles son los consultores con menos de 50 horas de asignación este mes?',
        '¿Qué tareas tengo pendientes?',
        'Muéstrame mis tareas ordenadas por prioridad',
      ],
      exampleQuestions: [
        '¿Cuáles son los consultores con menos de 50 horas de asignación este mes?',
        '¿Puedes mostrarme un resumen de las ventas del último trimestre?',
        '¿Cuáles son las tareas pendientes con mayor prioridad?',
        '¿Cómo se comparan las métricas de este mes con las del mes anterior?',
      ],
      component: 'base',
    },
    'cintac': {
      clientId: 'cintac',
      welcomeMessage: 'Soy Cintac, tu Chatbot especializado en el sistema constructivo Metalcon® de Cintac.',
      about: 'Tu asistente virtual especializado en el sistema constructivo Metalcon® de Cintac.',
      suggestedPrompts: [
        '¿Qué es Metalcon y por qué debería usarlo en mi construcción?',
        '¿Los perfiles de Metalcon® son resistentes a la humedad?',
        '¿Para qué se utilizan los Aceros de Tabique?',
      ],
      exampleQuestions: [
        '¿Qué es Metalcon y por qué debería usarlo en mi construcción?',
        '¿Los perfiles de Metalcon® son resistentes a la humedad?',
        '¿Para qué se utilizan los Aceros de Tabique?',
        '¿Sirve Metalcon para construir un segundo piso en mi casa?',
      ],
      component: 'base',
    },
    'restobar': {
      clientId: 'restobar',
      welcomeMessage: 'Soy REMO, tu Chatbot especializado en el Restobar.',
      about: 'Tu asistente virtual especializado en el Restobar.',
      suggestedPrompts: [
        '¿Cuánto se vendió en total esta semana?',
        '¿Cuáles fueron los productos más vendidos?',
        '¿Qué mozos atendieron más mesas en mayo?',
      ],
      exampleQuestions: [
        '¿Cuánto se vendió en total esta semana?',
        '¿Cuáles fueron los productos más vendidos?',
        '¿Qué mozos atendieron más mesas en mayo?',
        '¿Cuál es el ticket promedio por orden?',
      ],
      component: 'base',
    },
    'mecanic': {
        clientId: 'mecanic',
        welcomeMessage: 'Soy Max, tu Chatbot especializado en el taller mecánico.',
        about: 'Tu asistente virtual especializado en el taller mecánico.',
        suggestedPrompts: [
          '¿Que modelos de vehiculos tiene?',
          '¿En que estados se encuentran los vehiculos del taller?',
          '¿Como puedo contactar?'
        ],
        exampleQuestions: [
          '¿Que modelos de vehiculos tiene?',
          '¿En que estados se encuentran los vehiculos del taller?',
          '¿Como puedo contactar?',
          '¿Cual es el horario de atencion?'
        ],
        component: 'base',
      },
      'minddash': {
        clientId: 'minddash',
        welcomeMessage: 'Soy MindDash, tu Chatbot especializado.',
        about: 'Tu asistente virtual especializado.',
        suggestedPrompts: [
          'Haceme un listado de las ventas netas del año 2025',
          'Haceme un listado de las ventas por producto',
          'Haceme un listado del top 10 productos por ventas'
        ],
        exampleQuestions: [
          'Haceme un listado de las ventas netas del año 2025',
          'Haceme un listado de las ventas por producto',
          'Haceme un listado del top 10 productos por ventas',
          '¿Cuantas ordenes hay cargadas en el sistema?'
        ],
        component: 'base',
      },
      'bayer': {
        clientId: 'bayer',
        welcomeMessage: 'Hola! Soy tu Asistente Virtual de Bayer. Te ayudo con información sobre productos agrícolas, innovaciones y soluciones para el campo.',
        about: 'Asistente especializado en productos y soluciones agrícolas de Bayer.',
        suggestedPrompts: [
          '¿Qué productos de protección de cultivos tiene Bayer?',
          '¿Cuáles son las últimas innovaciones en semillas?',
          '¿Cómo puedo mejorar el rendimiento de mis cultivos?'
        ],
        exampleQuestions: [
          '¿Qué productos de protección de cultivos tiene Bayer?',
          '¿Cuáles son las últimas innovaciones en semillas?',
          '¿Cómo puedo mejorar el rendimiento de mis cultivos?',
          '¿Qué soluciones digitales ofrece Bayer para la agricultura?',
          '¿Cómo funciona la tecnología de edición genética en las semillas?'
        ],
        component: 'base',
        apiEndpoint: '/api/bayer/chat' // API específica para Bayer
      },
      'chatbotID9292': {
        clientId: 'chatbotID9292',
        welcomeMessage: 'Soy REMO, tu Chatbot especializado en el Restobar.',
        about: 'Tu asistente virtual especializado en el Restobar.',
        suggestedPrompts: [
          '¿Cuánto se vendió en total esta semana?',
          '¿Cuáles fueron los productos más vendidos?',
          '¿Qué mozos atendieron más mesas en mayo?',
        ],
        exampleQuestions: [
          '¿Cuánto se vendió en total esta semana?',
          '¿Cuáles fueron los productos más vendidos?',
          '¿Qué mozos atendieron más mesas en mayo?',
          '¿Cuál es el ticket promedio por orden?',
        ],
        component: 'base',
      },
      'chatbotID8787': {
        clientId: 'chatbotID8787',
        welcomeMessage: 'Soy Max, tu Chatbot especializado en el taller mecánico.',
        about: 'Tu asistente virtual especializado en el taller mecánico.',
        suggestedPrompts: [
          '¿Que modelos de vehiculos tiene?',
          '¿En que estados se encuentran los vehiculos del taller?',
          '¿Como puedo contactar?'
        ],
        exampleQuestions: [
          '¿Que modelos de vehiculos tiene?',
          '¿En que estados se encuentran los vehiculos del taller?',
          '¿Como puedo contactar?',
          '¿Cual es el horario de atencion?'
        ],
        component: 'base',
      },
  };
