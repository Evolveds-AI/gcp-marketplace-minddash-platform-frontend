import { chatbotConfigs } from '@/lib/utils/chatbot-config';
import DirectChatbotAccess from '@/components/DirectChatbotAccess';
import prisma from '@/lib/database';
import ClientSideHistoryPage from './ClientSideHistoryPage';

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
  };
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

    return {
      productId: product.id,
      clientId: clientInfo.id,
      client: clientInfo,
      productName: product.name,
    };
  } catch (error) {
    console.error('Error obteniendo configuración del producto:', error);
    throw error;
  }
}

export default async function HistoryPage({ params }: { params: { id: string } }) {
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
      console.error('HistoryPage: Error getting product config:', error);
      config = createDefaultConfig(id);
    }
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Historial no encontrado</h1>
          <p className="text-muted-foreground">El producto que buscas no existe o no está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <DirectChatbotAccess chatbotId={id}>
      <ClientSideHistoryPage config={config} />
    </DirectChatbotAccess>
  );
}
