import { chatbotConfigs } from '@/lib/utils/chatbot-config';
import DirectChatbotAccess from '@/components/DirectChatbotAccess';
import prisma from '@/lib/database';
import ClientSideInsightPage from './ClientSideInsightPage';

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
      description: 'Descripción del cliente',
    },
    productName: 'Producto Dinámico',
    welcomeMessage: 'Hola! Soy tu asistente virtual.',
    about: 'Tu asistente virtual personalizado.',
    suggestedPrompts: [],
    exampleQuestions: [],
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

async function getProductConfig(productId: string): Promise<ChatbotConfig | null> {
  try {
    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        projects: {
          include: {
            organizations: true,
          },
        },
      },
    });

    if (!product) {
      return null;
    }

    const organization = product.projects?.organizations;
    const clientInfo = organization
      ? {
          id: organization.id,
          name: organization.name,
          companyName: organization.company_name,
          description: organization.description || '',
        }
      : {
          id: product.projects?.organization_id || product.id,
          name: 'Cliente',
          companyName: 'Empresa',
          description: '',
        };
    const resolvedClientId = clientInfo.id;

    const productConfig = parseProductJsonConfig(product.config);
    const welcomeMessage =
      (productConfig as any).welcomeMessage ??
      product.welcome_message ??
      `Hola! Soy ${product.name}, tu asistente virtual.`;
    const about = (productConfig as any).about ?? product.description ?? `Tu asistente virtual ${product.name}.`;

    return {
      productId: product.id,
      clientId: resolvedClientId,
      client: clientInfo,
      productName: product.name,
      welcomeMessage,
      about,
      suggestedPrompts: [],
      exampleQuestions: [],
      component: 'base' as const,
      apiEndpoint: '/api/chat',
    };
  } catch (error) {
    console.error('Error obteniendo configuración del producto:', error);
    throw error;
  }
}

export default async function InsightPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const predefinedConfig = chatbotConfigs[id];
  let config: ChatbotConfig | null = null;

  if (predefinedConfig) {
    config = {
      ...(predefinedConfig as any),
      productId: id,
      productName: id,
      client: {
        id: (predefinedConfig as any).clientId,
        name: (predefinedConfig as any).clientId,
        companyName: (predefinedConfig as any).clientId,
        description: '',
      },
    };
  }

  if (!config && isUUID) {
    try {
      const productConfig = await getProductConfig(id);
      config = productConfig ?? createDefaultConfig(id);
    } catch (error) {
      console.error('InsightPage: Error getting product config:', error);
      config = createDefaultConfig(id);
    }
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Insight no encontrado</h1>
          <p className="text-muted-foreground">El producto que buscas no existe o no está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <DirectChatbotAccess chatbotId={id}>
      <ClientSideInsightPage config={config} />
    </DirectChatbotAccess>
  );
}
