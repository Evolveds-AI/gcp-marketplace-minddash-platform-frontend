import { useState, useEffect, useCallback } from 'react';

export interface BreadcrumbData {
  organizationName: string | null;
  projectName: string | null;
  chatbotName: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cargar datos de breadcrumbs de forma dinámica
 * Primero intenta obtener de sessionStorage, si no existe, carga desde API
 */
export function useBreadcrumbData(
  orgId: string | null,
  projectId: string | null,
  chatbotId: string | null
) {
  const [data, setData] = useState<BreadcrumbData>({
    organizationName: null,
    projectName: null,
    chatbotName: null,
    loading: true,
    error: null
  });

  const loadData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Intentar obtener de sessionStorage primero
      const storedOrgName = sessionStorage.getItem('selectedOrganizationName');
      const storedProjectName = sessionStorage.getItem('selectedProjectName');
      const storedChatbotName = chatbotId ? sessionStorage.getItem(`chatbot-${chatbotId}-name`) : null;

      let organizationName = storedOrgName;
      let projectName = storedProjectName;
      let chatbotName = storedChatbotName;

      // Si no hay datos en sessionStorage, cargar desde API
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setData({
          organizationName,
          projectName,
          chatbotName,
          loading: false,
          error: 'No hay sesión activa'
        });
        return;
      }

      const token = JSON.parse(authData).accessToken;

      // Cargar organización si no está en cache
      if (orgId && !organizationName) {
        try {
          const orgResponse = await fetch('/api/admin-client/organizations/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            const org = orgData.organizations?.find((o: any) => o.id === orgId);
            organizationName = org?.name || null;
            if (organizationName) {
              sessionStorage.setItem('selectedOrganizationName', organizationName);
            }
          }
        } catch (error) {
          console.warn('Error cargando organización:', error);
        }
      }

      // Cargar proyecto y chatbot desde products/stats (incluye ambos datos)
      if ((projectId && !projectName) || (chatbotId && !chatbotName)) {
        try {
          const productsResponse = await fetch('/api/admin-client/products/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            const products = productsData.stats?.topProducts || [];
            
            // Buscar el chatbot específico
            if (chatbotId && !chatbotName) {
              const chatbot = products.find((p: any) => p.id === chatbotId);
              chatbotName = chatbot?.nombre || null;
              if (chatbotName) {
                sessionStorage.setItem(`chatbot-${chatbotId}-name`, chatbotName);
              }
              
              // También obtener el nombre del proyecto si está disponible
              if (chatbot?.project_name && !projectName) {
                projectName = chatbot.project_name;
                if (projectName) {
                  sessionStorage.setItem('selectedProjectName', projectName);
                }
              }
            }
            
            // Si aún no tenemos el nombre del proyecto, buscar por project_id
            if (projectId && !projectName) {
              const productWithProject = products.find((p: any) => p.project_id === projectId);
              projectName = productWithProject?.project_name || null;
              if (projectName) {
                sessionStorage.setItem('selectedProjectName', projectName);
              }
            }
          }
        } catch (error) {
          console.warn('Error cargando datos de productos:', error);
        }
      }

      setData({
        organizationName,
        projectName,
        chatbotName,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error cargando datos de breadcrumbs:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Error al cargar información de navegación'
      }));
    }
  }, [orgId, projectId, chatbotId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    reload: loadData
  };
}
