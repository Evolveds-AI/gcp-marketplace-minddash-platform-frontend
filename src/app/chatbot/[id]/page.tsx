import { chatbotConfigs } from '@/lib/utils/chatbot-config';
import DirectChatbotAccess from '@/components/DirectChatbotAccess';
import prisma from '@/lib/database';
import ClientSideChatbotPage from './ClientSideChatbotPage';

type ChatbotConfig = {
  productId: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    companyName: string;
    description: string;
  };
  productName: string;
  welcomeMessage: string;
  about: string;
  suggestedPrompts: string[];
  exampleQuestions: string[];
  component?: string;
  apiEndpoint?: string;
};

function createDefaultConfig(id: string): ChatbotConfig {
  return {
    productId: id,
    clientId: id,
    client: {
      id: id,
      name: 'Cliente',
      companyName: 'Empresa',
      description: 'Descripción del cliente'
    },
    productName: 'Producto Dinámico',
    welcomeMessage: 'Hola! Soy tu asistente virtual.',
    about: 'Tu asistente virtual personalizado.',
    suggestedPrompts: [
      '¿En qué puedo ayudarte?',
      '¿Qué servicios ofrecen?',
      '¿Cómo puedo contactarlos?'
    ],
    exampleQuestions: [
      '¿En qué puedo ayudarte?',
      '¿Qué servicios ofrecen?',
      '¿Cómo puedo contactarlos?',
      '¿Cuál es el horario de atención?'
    ],
    component: 'base' as const,
    apiEndpoint: '/api/chat',
  };
}

function parseProductJsonConfig(config: unknown) {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch (err) {
      console.error('Error parsing product config JSON:', err);
      return {};
    }
  }
  if (typeof config === 'object') {
    return config as Record<string, unknown>;
  }
  return {};
}

// Función para obtener configuración de producto dinámico basada en datos reales
async function getProductConfig(productId: string): Promise<ChatbotConfig | null> {
  try {
    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        projects: {
          include: {
            organizations: true
          }
        }
      }
    });

    console.log('product', product);
    if (!product) {
      return null;
    }

    const organization = product.projects?.organizations;
    const clientInfo = organization
      ? {
        id: organization.id,
        name: organization.name,
        companyName: organization.company_name,
        description: organization.description || ''
      }
      : {
        id: product.projects?.organization_id || product.id,
        name: 'Cliente',
        companyName: 'Empresa',
        description: ''
      };
    const resolvedClientId = clientInfo.id;

    const productConfig = parseProductJsonConfig(product.config);
    console.log('productConfig', productConfig);
    const welcomeMessage = productConfig.welcomeMessage
      ?? product.welcome_message
      ?? `Hola! Soy ${product.name}, tu asistente virtual.`;
    const about = productConfig.about
      ?? product.description
      ?? `Tu asistente virtual ${product.name}.`;
    const suggestedPrompts = Array.isArray(productConfig.suggestedPrompts) && productConfig.suggestedPrompts.length > 0
      ? productConfig.suggestedPrompts
      : [
        '¿En qué puedo ayudarte?',
        '¿Qué servicios ofrecen?',
        '¿Cómo puedo contactarlos?'
      ];
    const exampleQuestions = Array.isArray(productConfig.exampleQuestions) && productConfig.exampleQuestions.length > 0
      ? productConfig.exampleQuestions
      : [
        '¿En qué puedo ayudarte?',
        '¿Qué servicios ofrecen?',
        '¿Cómo puedo contactarlos?',
        '¿Cuál es el horario de atención?'
      ];

    return {
      productId: product.id,
      clientId: resolvedClientId,
      client: clientInfo,
      productName: product.name,
      welcomeMessage,
      about,
      suggestedPrompts,
      exampleQuestions,
      component: 'base' as const,
      apiEndpoint: '/api/chat'
    };
  } catch (error) {
    console.error('Error obteniendo configuración del producto:', error);
    throw error;
  }
}

export default async function ChatbotPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Primero intentar buscar en configuraciones predefinidas
  const predefinedConfig = chatbotConfigs[id];
  console.log('config111', predefinedConfig);
  console.log('isUUID', isUUID);

  let config: ChatbotConfig | null = null;

  // Si se encuentra una configuración predefinida, agregar las propiedades faltantes
  if (predefinedConfig) {
    config = {
      ...predefinedConfig,
      productId: id,
      productName: id,
      client: {
        id: predefinedConfig.clientId,
        name: predefinedConfig.clientId,
        companyName: predefinedConfig.clientId,
        description: ''
      }
    };
  }

  // Si no se encuentra, intentar buscar como producto dinámico
  if (!config && isUUID) {
    try {
      const productConfig = await getProductConfig(id);
      console.log('productConfig222', productConfig);
      config = productConfig ?? createDefaultConfig(id);
    } catch (error) {
      console.error('ChatbotPage: Error getting product config:', error);
      // Para UUIDs, crear una configuración por defecto si falla la consulta
      config = createDefaultConfig(id);
    }
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Chatbot no encontrado</h1>
          <p className="text-muted-foreground">El chatbot que buscas no existe o no está disponible.</p>
        </div>
      </div>
    );
  }
  // En este punto, config está garantizado que no es null
  return (
    <DirectChatbotAccess chatbotId={id}>
      <ClientSideChatbotPage config={config} />
    </DirectChatbotAccess>
  );
}
