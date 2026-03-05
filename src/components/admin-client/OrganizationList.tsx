'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useThemeMode } from '@/hooks/useThemeMode';
import { toast } from 'sonner';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import {
  Bot,
  Building2,
  CheckCircle2,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import OrganizationUsersModal from './OrganizationUsersModal';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PricingUpgradeModal, { usePricingUpgradeModal } from '@/components/billing/PricingUpgradeModal';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const COUNTRY_LIST = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BY', name: 'Belarus' },
  { code: 'CA', name: 'Canada' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'JO', name: 'Jordan' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MO', name: 'Macau' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'PA', name: 'Panama' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'RU', name: 'Russia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UK', name: 'Ukraine' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'ZA', name: 'South Africa' },
];

const COUNTRY_CODE_BY_NAME: Record<string, string> = COUNTRY_LIST.reduce((acc, item) => {
  acc[item.name.toLowerCase()] = item.code;
  return acc;
}, {} as Record<string, string>);

// Alias en español/común para mapear a los códigos de banderas del template Chatbot MindDash
const COUNTRY_ALIASES: Record<string, string> = {
  argentina: 'AR',
  'estados unidos': 'US',
  usa: 'US',
  mexico: 'MX',
  méxico: 'MX',
  brasil: 'BR',
  brazil: 'BR',
  españa: 'ES',
  spain: 'ES',
  alemania: 'DE',
  germany: 'DE',
  francia: 'FR',
  france: 'FR',
  italia: 'IT',
  italy: 'IT',
  canada: 'CA',
  canadá: 'CA',
  chile: 'CL',
  colombia: 'CO',
  perú: 'PE',
  peru: 'PE',
  panamá: 'PA',
  panama: 'PA',
  uruguay: 'UY',
  reino: 'GB',
  'reino unido': 'GB',
};

function normalizeCountryKey(value: string) {
  return value.trim().toLowerCase();
}

function getCountryCode(country: string | null | undefined) {
  if (!country) return null;
  const key = normalizeCountryKey(country);
  return COUNTRY_CODE_BY_NAME[key] || COUNTRY_ALIASES[key] || null;
}

interface Organization {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  projects_count: number;
  chatbots_count: number;
  users_count: number;
}

interface OrganizationListProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  onSelectOrganization: (organizationId: string, organizationName: string) => void;
}

// Sin datos mock - siempre cargar desde el backend

export default function OrganizationList({ showNotification, onSelectOrganization }: OrganizationListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZES = [10, 20, 30, 50, 100];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Organization>>({
    columnAccessor: 'name',
    direction: 'asc',
  });
  const [isMounted, setIsMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteValidation, setDeleteValidation] = useState<{ hasProjects: boolean; projectCount: number } | null>(null);
  const { applyThemeClass } = useThemeMode();
  
  // Plan limits check
  const { currentPlan, canCreate, getLimit, getUsage } = usePlanLimits();
  const { modalState, showUpgradeModal, setModalOpen } = usePricingUpgradeModal();

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    razonSocial: '',
    pais: '',
    emailContacto: '',
    descripcion: ''
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        console.warn('No hay sesión activa');
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const auth = JSON.parse(authData);

      // Usar endpoint con estadísticas reales
      const response = await fetch('/api/admin-client/organizations/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && Array.isArray(data.organizations)) {
        // Las organizaciones ya vienen con los contadores correctos
        const mappedOrgs = data.organizations.map((org: any) => ({
          id: org.id,
          name: org.name,
          description: org.description || org.company_name || '',
          industry: org.country || null,
          is_active: org.is_active,
          created_at: org.created_at,
          updated_at: org.updated_at,
          projects_count: org.projects_count,
          chatbots_count: org.chatbots_count,
          users_count: org.users_count,
        }));
        
        setOrganizations(mappedOrgs);
      } else {
        console.warn('⚠️ No se pudieron cargar organizaciones');
        setOrganizations([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error cargando organizaciones:', error);
      setOrganizations([]);
      setLoading(false);
    }
  };

  const filteredOrganizations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org) => {
      const countryName = org.industry || '';
      const code = getCountryCode(countryName);
      const codeMatches = code ? code.toLowerCase().includes(q) : false;
      return (
        org.name?.toLowerCase().includes(q) ||
        org.description?.toLowerCase().includes(q) ||
        countryName.toLowerCase().includes(q) ||
        codeMatches
      );
    });
  }, [organizations, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, searchTerm, organizations.length]);

  const sortedOrganizations = useMemo(() => {
    const accessor = String(sortStatus.columnAccessor);
    const data = sortBy(filteredOrganizations, (org: Organization) => {
      const value = (org as any)[accessor];
      if (typeof value === 'number') return value;
      if (typeof value === 'boolean') return value ? 1 : 0;
      return String(value ?? '').toLowerCase();
    });
    return sortStatus.direction === 'desc' ? data.reverse() : data;
  }, [filteredOrganizations, sortStatus.columnAccessor, sortStatus.direction]);

  const recordsData = useMemo(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    return sortedOrganizations.slice(from, to);
  }, [page, pageSize, sortedOrganizations]);

  // Función para cerrar el modal y resetear el formulario
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingOrg(null);
    setFormData({
      nombre: '',
      razonSocial: '',
      pais: '',
      emailContacto: '',
      descripcion: ''
    });
  };

  // Función para abrir el modal de edición
  const handleEditOrganization = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      nombre: org.name || '',
      razonSocial: org.description || '', // description contiene company_name
      pais: org.industry || '', // industry contiene country
      emailContacto: '', // No tenemos este dato en el estado actual
      descripcion: org.description || ''
    });
    setShowCreateModal(true);
  };

  // Función para actualizar organización
  const handleUpdateOrganization = async () => {
    // Validaciones - solo 4 campos requeridos según el backend
    const nombre = formData.nombre.trim();
    const razonSocial = formData.razonSocial.trim();
    const pais = formData.pais.trim();
    const descripcion = formData.descripcion.trim();

    if (!nombre) {
      toast.error('El nombre de la organización es obligatorio');
      return;
    }
    if (!razonSocial) {
      toast.error('La razón social es obligatoria');
      return;
    }
    if (!pais) {
      toast.error('El país es obligatorio');
      return;
    }
    if (!descripcion) {
      toast.error('La descripción es obligatoria');
      return;
    }

    // Validaciones de longitud según el backend Python
    if (nombre.length > 50) {
      toast.error('El nombre de la organización no puede superar 50 caracteres');
      return;
    }
    if (razonSocial.length > 100) {
      toast.error('La razón social no puede superar 100 caracteres');
      return;
    }
    if (descripcion.length > 200) {
      toast.error('La descripción no puede superar 200 caracteres');
      return;
    }
    if (pais.length > 25) {
      toast.error('El país no puede superar 25 caracteres');
      return;
    }

    if (!editingOrg) {
      toast.error('No se encontró la organización a editar');
      return;
    }

    setIsUpdating(true);

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      const auth = JSON.parse(authData);

      toast.promise(
        fetch(`/api/backend/organizations/${editingOrg.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.accessToken}`
          },
          body: JSON.stringify({
            name: nombre,
            company_name: razonSocial,
            country: pais,
            description: descripcion
          })
        }).then(async (response) => {
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Error al actualizar la organización');
          }

          // Recargar organizaciones desde el backend para reflejar los cambios
          await loadOrganizations();
          handleCloseModal();
          
          return result;
        }),
        {
          loading: 'Actualizando organización...',
          success: 'Organización actualizada exitosamente',
          error: (err) => err.message || 'Error al actualizar la organización'
        }
      );
    } catch (error) {
      console.error('Error actualizando organización:', error);
      toast.error('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Función para crear organización
  const handleCreateOrganization = async () => {
    // Validaciones - solo 4 campos requeridos según el backend
    const nombre = formData.nombre.trim();
    const razonSocial = formData.razonSocial.trim();
    const pais = formData.pais.trim();
    const descripcion = formData.descripcion.trim();

    if (!nombre) {
      toast.error('El nombre de la organización es obligatorio');
      return;
    }
    if (!razonSocial) {
      toast.error('La razón social es obligatoria');
      return;
    }
    if (!pais) {
      toast.error('El país es obligatorio');
      return;
    }
    if (!descripcion) {
      toast.error('La descripción es obligatoria');
      return;
    }

    // Validaciones de longitud según el backend Python
    if (nombre.length > 50) {
      toast.error('El nombre de la organización no puede superar 50 caracteres');
      return;
    }
    if (razonSocial.length > 100) {
      toast.error('La razón social no puede superar 100 caracteres');
      return;
    }
    if (descripcion.length > 200) {
      toast.error('La descripción no puede superar 200 caracteres');
      return;
    }
    if (pais.length > 25) {
      toast.error('El país no puede superar 25 caracteres');
      return;
    }

    setIsCreating(true);

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      const auth = JSON.parse(authData);

      toast.promise(
        fetch('/api/backend/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.accessToken}`
          },
          body: JSON.stringify({
            name: nombre,
            company_name: razonSocial,
            country: pais,
            description: descripcion
          })
        }).then(async (response) => {
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Error al crear la organización');
          }

          // Asignar el usuario actual a la organización recién creada
          try {
            // Obtener el role_id del usuario desde el backend
            const userInfoResponse = await fetch('/api/backend/users/info', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`
              },
              body: JSON.stringify({ user_id: auth.userId })
            });

            const userInfo = await userInfoResponse.json();
            const roleId = userInfo.data?.[0]?.role_id || 'ee7376a8-d934-4936-91fa-2bda2949b5b8'; // Fallback a Admin

            const accessResponse = await fetch('/api/backend/organizations/access', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`
              },
              body: JSON.stringify({
                organization_id: result.data.id_organization,
                user_id: auth.userId,
                role_id: roleId
              })
            });

            const accessResult = await accessResponse.json();
            if (!accessResult.success) {
              console.warn('No se pudo asignar el usuario a la organización:', accessResult.message);
            } else {
              console.log('✅ Usuario asignado a la organización');
            }
          } catch (accessError) {
            console.warn('Error asignando acceso:', accessError);
          }

          // Recargar organizaciones desde el backend para incluir la nueva
          await loadOrganizations();
          handleCloseModal();
          
          return result;
        }),
        {
          loading: 'Creando organización...',
          success: 'Organización creada exitosamente',
          error: (err) => err.message || 'Error al crear la organización'
        }
      );
    } catch (error) {
      console.error('Error creando organización:', error);
      toast.error('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsCreating(false);
    }
  };

  // Función para abrir modal de permisos
  const openPermissionsModal = (organization: Organization) => {
    setSelectedOrganization(organization);
    setShowPermissionsModal(true);
  };

  // Función para abrir modal de eliminación con validación
  const openDeleteModal = async (organization: Organization) => {
    setSelectedOrganization(organization);
    setShowDeleteModal(true);
    setDeleteValidation(null);

    try {
      console.log('🔍 Verificando dependencias antes de eliminar org:', organization.id);
      
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;
      const auth = JSON.parse(authData);

      // Verificar proyectos asociados
      const response = await fetch('/api/backend/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Filtrar proyectos de esta organización
        const orgProjects = data.data.filter((p: any) => p.organization_id === organization.id);
        const projectCount = orgProjects.length;
        
        console.log(`📊 Proyectos asociados a "${organization.name}":`, projectCount);
        
        setDeleteValidation({
          hasProjects: projectCount > 0,
          projectCount
        });
      }
    } catch (error) {
      console.error('Error verificando dependencias:', error);
    }
  };

  // Función para eliminar organización
  const handleDeleteOrganization = async () => {
    if (!selectedOrganization) {
      toast.error('No hay organización seleccionada');
      return;
    }

    // Validar que no tenga proyectos
    if (deleteValidation?.hasProjects) {
      toast.error(`No se puede eliminar. Tiene ${deleteValidation.projectCount} proyecto(s) asociado(s).`);
      return;
    }

    setIsDeleting(true);

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const auth = JSON.parse(authData);

      console.log('🗑️ Eliminando organización:', selectedOrganization.id);

      toast.promise(
        fetch(`/api/backend/organizations/${selectedOrganization.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.accessToken}`
          }
        }).then(async (response) => {
          const result = await response.json();

          console.log('📥 Respuesta del servidor:', result);

          if (!result.success) {
            throw new Error(result.message || 'Error al eliminar la organización');
          }

          // Recargar organizaciones
          await loadOrganizations();
          setShowDeleteModal(false);
          setSelectedOrganization(null);
          console.log('✅ Organización eliminada y lista recargada');
          
          return result;
        }),
        {
          loading: 'Eliminando organización...',
          success: 'Organización eliminada exitosamente',
          error: (err) => err.message || 'Error al eliminar la organización'
        }
      );
    } catch (error) {
      console.error('Error eliminando organización:', error);
      toast.error('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };


  const activeOrgs = organizations.filter(o => o.is_active).length;
  const totalProjects = organizations.reduce((sum, o) => sum + o.projects_count, 0);
  const totalChatbots = organizations.reduce((sum, o) => sum + o.chatbots_count, 0);
  const totalUsers = organizations.reduce((sum, o) => sum + o.users_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold mb-2 ${applyThemeClass('text-white', 'text-gray-900')}`}>Organizaciones</h2>
          <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>Gestiona todas las organizaciones del sistema</p>
        </div>
        <button
          onClick={() => {
            // Check plan limits before creating organization
            if (!canCreate('organizations')) {
              showUpgradeModal(
                'organizations',
                currentPlan?.id || 'free',
                getUsage('organizations')
              );
              return;
            }
            setShowCreateModal(true);
          }}
          data-tour="create-organization"
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Organización</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={applyThemeClass(
                  'bg-minddash-card border border-minddash-border rounded-lg p-6 text-white',
                  'bg-white border border-gray-200 rounded-lg p-6 text-gray-900 shadow-sm'
                )
          }
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>Total Organizaciones</span>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <p className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>{organizations.length}</p>
          <p className={`text-xs mt-1 ${applyThemeClass('text-gray-500', 'text-gray-500')}`}>{activeOrgs} activas</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={applyThemeClass(
                  'bg-minddash-card border border-minddash-border rounded-lg p-6 text-white',
                  'bg-white border border-gray-200 rounded-lg p-6 text-gray-900 shadow-sm'
                )
          }
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>Total Proyectos</span>
            <FolderKanban className="w-5 h-5 text-green-500" />
          </div>
          <p className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>{totalProjects}</p>
          <p className={`text-xs mt-1 ${applyThemeClass('text-gray-500', 'text-gray-500')}`}>En todas las orgs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={applyThemeClass(
                  'bg-minddash-card border border-minddash-border rounded-lg p-6 text-white',
                  'bg-white border border-gray-200 rounded-lg p-6 text-gray-900 shadow-sm'
                )
          }
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>Total Chatbots</span>
            <Bot className="w-5 h-5 text-purple-500" />
          </div>
          <p className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>{totalChatbots}</p>
          <p className={`text-xs mt-1 ${applyThemeClass('text-gray-500', 'text-gray-500')}`}>Distribuidos</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={applyThemeClass(
                  'bg-minddash-card border border-minddash-border rounded-lg p-6 text-white',
                  'bg-white border border-gray-200 rounded-lg p-6 text-gray-900 shadow-sm'
                )
          }
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>Total Usuarios</span>
            <Users className="w-5 h-5 text-yellow-500" />
          </div>
          <p className={`text-3xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>{totalUsers}</p>
          <p className={`text-xs mt-1 ${applyThemeClass('text-gray-500', 'text-gray-500')}`}>Activos</p>
        </motion.div>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${applyThemeClass('text-gray-400', 'text-gray-500')}`} />
          <input
            type="text"
            placeholder="Buscar organizaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={applyThemeClass(
                    'w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-minddash-verde-500 transition-colors',
                    'w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors'
                  )
            }
          />
        </div>
      </div>

      {/* Tabla de organizaciones */}
      <div
        className={applyThemeClass(
                'bg-minddash-card border border-minddash-border rounded-lg overflow-hidden',
                'bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm'
              )
        }
      >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={applyThemeClass('border-b border-minddash-border', 'border-b border-gray-200 bg-gray-50')}>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>Organización</th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>Industria</th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>Proyectos</th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>Chatbots</th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>Usuarios</th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>Estado</th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        <span className={`ml-3 ${applyThemeClass('text-gray-400', 'text-gray-600')}`}>Cargando organizaciones...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Building2 className={`w-12 h-12 mx-auto mb-3 ${applyThemeClass('text-gray-600', 'text-gray-400')}`} />
                      <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>No se encontraron organizaciones</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrganizations.map((org, index) => (
                    <motion.tr
                      key={org.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      data-tour={index === 0 ? "organization-card" : undefined}
                      className={applyThemeClass(
                        'border-t border-minddash-border hover:bg-minddash-elevated cursor-pointer transition-colors',
                        'border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors'
                      )}
                      onClick={() => onSelectOrganization(org.id, org.name)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={applyThemeClass('p-2 bg-blue-600/20 rounded-lg', 'p-2 bg-blue-100 rounded-lg')}>
                            <Building2 className={applyThemeClass('w-5 h-5 text-blue-400', 'w-5 h-5 text-blue-500')} />
                          </div>
                          <div>
                            <span className={`font-medium block ${applyThemeClass('text-white', 'text-gray-900')}`}>{org.name}</span>
                            {org.description && <span className={`text-xs ${applyThemeClass('text-gray-500', 'text-gray-600')}`}>{org.description}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {org.industry ? (
                          <span
                            className={applyThemeClass(
                              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300',
                              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700'
                            )}
                          >
                            {org.industry}
                          </span>
                        ) : (
                          <span className={applyThemeClass('text-gray-500', 'text-gray-400')}>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-medium ${applyThemeClass('text-white', 'text-gray-900')}`}>{org.projects_count}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-medium ${applyThemeClass('text-white', 'text-gray-900')}`}>{org.chatbots_count}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-medium ${applyThemeClass('text-white', 'text-gray-900')}`}>{org.users_count}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {org.is_active ? (
                          <span className={`inline-flex items-center space-x-1 ${applyThemeClass('text-green-400', 'text-green-600')}`}>
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">Activa</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center space-x-1 ${applyThemeClass('text-gray-500', 'text-gray-500')}`}>
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs">Inactiva</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditOrganization(org);
                            }}
                            className={applyThemeClass('p-2 hover:bg-gray-800 rounded-lg transition-colors', 'p-2 hover:bg-gray-100 rounded-lg transition-colors')}
                            title="Editar"
                          >
                            <Pencil className={applyThemeClass('w-4 h-4 text-gray-400', 'w-4 h-4 text-gray-500')} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(org);
                            }}
                            className={applyThemeClass('p-2 hover:bg-gray-800 rounded-lg transition-colors', 'p-2 hover:bg-gray-100 rounded-lg transition-colors')}
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Modal Crear Organización */}
      <ModalPortal>
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={applyThemeClass(
                'bg-minddash-card border border-minddash-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl',
                'bg-white border border-gray-200 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl'
              )}
            >
              {/* Header */}
              <div className={applyThemeClass(
                'flex-shrink-0 px-6 py-4 border-b border-gray-800',
                'flex-shrink-0 px-6 py-4 border-b border-gray-200'
              )}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                    {editingOrg ? 'Editar Organización' : 'Crear Nueva Organización/Cliente'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className={applyThemeClass(
                      'text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800',
                      'text-gray-500 hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-100'
                    )}
                    title="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido scrolleable */}
              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                <div className="space-y-6">
                  {/* Sección: Datos de la Organización */}
                  <div>
                    <h4 className={`text-base font-semibold mb-4 ${applyThemeClass('text-blue-400', 'text-blue-600')}`}>
                      Datos de la Organización
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>
                          Nombre de Organización *
                        </label>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          className={applyThemeClass(
                            'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-green-500',
                            'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                          )}
                          placeholder="Ej: Evolve Corp"
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>
                          Razón Social / Identificador Fiscal *
                        </label>
                        <input
                          type="text"
                          value={formData.razonSocial}
                          onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                          className={applyThemeClass(
                            'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-green-500',
                            'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                          )}
                          placeholder="Ej: Evolve Corporation Inc."
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>
                          País *
                        </label>
                        <Select value={formData.pais || undefined} onValueChange={(next) => setFormData({ ...formData, pais: next })}>
                          <SelectTrigger
                            className={applyThemeClass(
                              'w-full bg-minddash-elevated border-minddash-border text-white focus:ring-green-500',
                              'w-full bg-white border-gray-300 text-gray-900 focus:ring-green-600'
                            )}
                          >
                            <SelectValue placeholder="Seleccione el país" />
                          </SelectTrigger>
                          <SelectContent className={applyThemeClass('bg-minddash-card border-minddash-border text-white', 'bg-white border-gray-200 text-gray-900')}>
                            <SelectItem value="Argentina">Argentina</SelectItem>
                            <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                            <SelectItem value="Canadá">Canadá</SelectItem>
                            <SelectItem value="Reino Unido">Reino Unido</SelectItem>
                            <SelectItem value="España">España</SelectItem>
                            <SelectItem value="Alemania">Alemania</SelectItem>
                            <SelectItem value="México">México</SelectItem>
                            <SelectItem value="Brasil">Brasil</SelectItem>
                            <SelectItem value="Chile">Chile</SelectItem>
                            <SelectItem value="Colombia">Colombia</SelectItem>
                            <SelectItem value="Perú">Perú</SelectItem>
                            <SelectItem value="Uruguay">Uruguay</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>
                          Email de Contacto Principal *
                        </label>
                        <input
                          type="email"
                          value={formData.emailContacto}
                          onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
                          className={applyThemeClass(
                            'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-green-500',
                            'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                          )}
                          placeholder="contacto@evolve.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={`block text-sm font-medium mb-2 ${applyThemeClass('text-gray-400', 'text-gray-700')}`}>
                          Descripción
                        </label>
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                          rows={3}
                          className={applyThemeClass(
                            'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-green-500 resize-none',
                            'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600 resize-none'
                          )}
                          placeholder="Descripción breve de la actividad de la organización."
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer con botones */}
              <div className={applyThemeClass(
                'flex-shrink-0 px-6 py-4 border-t border-gray-800 flex justify-end space-x-3',
                'flex-shrink-0 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3'
              )}>
                <button
                  onClick={handleCloseModal}
                  disabled={isCreating || isUpdating}
                  className={applyThemeClass(
                    'px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50',
                    'px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50'
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={editingOrg ? handleUpdateOrganization : handleCreateOrganization}
                  disabled={
                    isCreating || isUpdating ||
                    (editingOrg
                      ? // Para edición: deshabilitar si no hay cambios
                        (formData.nombre === (editingOrg.name || '') &&
                         formData.razonSocial === (editingOrg.description || '') &&
                         formData.pais === (editingOrg.industry || '') &&
                         formData.descripcion === (editingOrg.description || ''))
                      : // Para creación: deshabilitar si faltan campos requeridos
                        (!formData.nombre.trim() || !formData.razonSocial.trim() || !formData.pais.trim() || !formData.descripcion.trim()))
                  }
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {(isCreating || isUpdating) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{editingOrg ? 'Actualizando...' : 'Creando...'}</span>
                    </>
                  ) : (
                    <span>{editingOrg ? 'Actualizar Organización' : 'Crear Organización'}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Eliminar Organización */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && selectedOrganization && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={applyThemeClass(
                'bg-minddash-card border border-minddash-border rounded-xl w-full max-w-md shadow-2xl',
                'bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl'
              )}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${applyThemeClass('text-white', 'text-gray-900')}`}>
                    Eliminar Organización
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedOrganization(null);
                      setDeleteValidation(null);
                    }}
                    className={applyThemeClass('text-gray-400 hover:text-white', 'text-gray-500 hover:text-gray-700')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className={applyThemeClass('text-gray-300', 'text-gray-600')}>
                    ¿Estás seguro de que deseas eliminar la organización <strong>{selectedOrganization.name}</strong>?
                  </p>

                  {deleteValidation === null ? (
                    <div className="flex items-center space-x-2 text-blue-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span>Verificando dependencias...</span>
                    </div>
                  ) : deleteValidation.hasProjects ? (
                    <div className={applyThemeClass('bg-red-900/20 border border-red-800 rounded-lg p-4', 'bg-red-50 border border-red-200 rounded-lg p-4')}>
                      <div className="flex items-start space-x-3">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className={`font-semibold mb-1 ${applyThemeClass('text-red-400', 'text-red-700')}`}>
                            No se puede eliminar
                          </h4>
                          <p className={applyThemeClass('text-red-400 text-sm mt-1', 'text-red-600 text-sm mt-1')}>
                            Esta organización tiene {deleteValidation.projectCount} proyecto(s) asociado(s). 
                            Elimina primero los proyectos antes de eliminar la organización.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={applyThemeClass('bg-green-900/20 border border-green-800 rounded-lg p-4', 'bg-green-50 border border-green-200 rounded-lg p-4')}>
                      <div className="flex items-start space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-green-500 font-semibold">Listo para eliminar</p>
                          <p className={applyThemeClass('text-green-400 text-sm mt-1', 'text-green-600 text-sm mt-1')}>
                            Esta organización no tiene proyectos asociados y puede ser eliminada.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className={applyThemeClass('text-red-400 text-sm', 'text-red-600 text-sm')}>
                    <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" aria-label="Advertencia" /> Esta acción no se puede deshacer.</span>
                  </p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedOrganization(null);
                      setDeleteValidation(null);
                    }}
                    disabled={isDeleting}
                    className={applyThemeClass(
                      'px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50',
                      'px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50'
                    )}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteOrganization}
                    disabled={isDeleting || deleteValidation?.hasProjects || deleteValidation === null}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <span>Eliminar</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Gestión de Permisos */}
      {showPermissionsModal && selectedOrganization && (
        <OrganizationUsersModal
          organizationId={selectedOrganization.id}
          organizationName={selectedOrganization.name}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedOrganization(null);
          }}
        />
      )}

      {/* Pricing Upgrade Modal */}
      <PricingUpgradeModal
        open={modalState.open}
        onOpenChange={setModalOpen}
        limitType={modalState.limitType}
        currentPlanId={modalState.currentPlanId}
        currentUsage={modalState.currentUsage}
        onSelectPlan={(plan) => {
          showNotification('info', `Para actualizar al plan ${plan.name}, ve a Configuración > Facturación`);
          router.push('/dashboard/admin/settings');
        }}
      />
    </div>
  );
}
