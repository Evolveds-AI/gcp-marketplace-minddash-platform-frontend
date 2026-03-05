'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiMoreVertical,
  FiUsers,
  FiPackage,
  FiMessageSquare,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiPause,
  FiPlay,
  FiArrowRight,
  FiShield,
  FiCalendar,
  FiGlobe,
  FiMail,
} from '@/lib/icons';
import { ArrowRightLeft as FiTransfer, Phone as FiPhone } from 'lucide-react';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  industry?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  lastActivity: string;
  stats: {
    totalProjects: number;
    totalChatbots: number;
    totalUsers: number;
    totalMessages: number;
    monthlyGrowth: number;
    systemHealth: number;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  plan?: 'basic' | 'pro' | 'enterprise';
  billingStatus?: 'active' | 'overdue' | 'cancelled';
}

interface CreateOrganizationData {
  name: string;
  description: string;
  industry: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  ownerId?: string;
  plan: 'basic' | 'pro' | 'enterprise';
}

const ORGANIZATION_STATUS = {
  active: { label: 'Activa', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: FiCheckCircle },
  suspended: { label: 'Suspendida', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: FiXCircle },
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: FiAlertTriangle },
};

const PLAN_FEATURES = {
  basic: { projects: 5, chatbots: 10, users: 25, label: 'Básico' },
  pro: { projects: 20, chatbots: 50, users: 100, label: 'Profesional' },
  enterprise: { projects: -1, chatbots: -1, users: -1, label: 'Empresarial' },
};

export default function SuperAdminOrganizationManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = '/dashboard/admin';
  const { applyThemeClass } = useThemeMode();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CreateOrganizationData>({
    name: '',
    description: '',
    industry: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    plan: 'basic',
  });

  // Cargar organizaciones
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      
      // Mock data - reemplazar con API real
      const mockOrganizations: Organization[] = [
        {
          id: 'org-1',
          name: 'Bayer Pharma',
          description: 'División farmacéutica de Bayer AG',
          industry: 'Farmacéutica',
          website: 'https://bayer.com',
          contactEmail: 'contact@bayer.com',
          contactPhone: '+49 30 5400',
          address: 'Berlín, Alemania',
          status: 'active',
          createdAt: '2023-01-15',
          lastActivity: '2025-01-22',
          stats: {
            totalProjects: 12,
            totalChatbots: 24,
            totalUsers: 156,
            totalMessages: 45230,
            monthlyGrowth: 12.5,
            systemHealth: 95,
          },
          owner: {
            id: 'user-1',
            name: 'Carlos Ruiz',
            email: 'c.ruiz@bayer.com',
          },
          plan: 'enterprise',
          billingStatus: 'active',
        },
        {
          id: 'org-2',
          name: 'Evolveds AI',
          description: 'Plataforma de IA conversacional',
          industry: 'Tecnología',
          website: 'https://evolveds.ai',
          contactEmail: 'hello@evolveds.ai',
          contactPhone: '+1 555-0123',
          address: 'San Francisco, CA',
          status: 'active',
          createdAt: '2023-03-20',
          lastActivity: '2025-01-21',
          stats: {
            totalProjects: 8,
            totalChatbots: 16,
            totalUsers: 89,
            totalMessages: 23450,
            monthlyGrowth: 8.3,
            systemHealth: 88,
          },
          owner: {
            id: 'user-2',
            name: 'Ana García',
            email: 'ana@evolveds.ai',
          },
          plan: 'pro',
          billingStatus: 'active',
        },
        {
          id: 'org-3',
          name: 'TechCorp Solutions',
          description: 'Consultoría tecnológica',
          industry: 'Consultoría',
          website: 'https://techcorp.com',
          contactEmail: 'info@techcorp.com',
          contactPhone: '+1 555-0456',
          address: 'New York, NY',
          status: 'suspended',
          createdAt: '2023-06-10',
          lastActivity: '2025-01-19',
          stats: {
            totalProjects: 5,
            totalChatbots: 10,
            totalUsers: 45,
            totalMessages: 12340,
            monthlyGrowth: -2.1,
            systemHealth: 45,
          },
          owner: {
            id: 'user-3',
            name: 'Roberto Silva',
            email: 'r.silva@techcorp.com',
          },
          plan: 'basic',
          billingStatus: 'overdue',
        },
        {
          id: 'org-4',
          name: 'Healthcare Plus',
          description: 'Servicios de salud digital',
          industry: 'Salud',
          website: 'https://healthcareplus.com',
          contactEmail: 'contact@healthcareplus.com',
          contactPhone: '+1 555-0789',
          address: 'Boston, MA',
          status: 'pending',
          createdAt: '2024-01-05',
          lastActivity: '2025-01-15',
          stats: {
            totalProjects: 3,
            totalChatbots: 6,
            totalUsers: 23,
            totalMessages: 5670,
            monthlyGrowth: -5.8,
            systemHealth: 72,
          },
          plan: 'basic',
          billingStatus: 'cancelled',
        },
      ];
      
      setOrganizations(mockOrganizations);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar organizaciones
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           org.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           org.industry?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, searchTerm, statusFilter]);

  // Crear organización
  const handleCreateOrganization = async () => {
    if (!formData.name || !formData.contactEmail) {
      toast.error('Nombre y email de contacto son requeridos');
      return;
    }

    setIsCreating(true);
    try {
      // Mock - llamar a API real
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        industry: formData.industry,
        website: formData.website,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        address: formData.address,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0],
        stats: {
          totalProjects: 0,
          totalChatbots: 0,
          totalUsers: 0,
          totalMessages: 0,
          monthlyGrowth: 0,
          systemHealth: 100,
        },
        plan: formData.plan,
        billingStatus: 'active',
      };

      setOrganizations([...organizations, newOrg]);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        industry: '',
        website: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        plan: 'basic',
      });
      toast.success('Organización creada exitosamente');
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Error al crear organización');
    } finally {
      setIsCreating(false);
    }
  };

  // Transferir organización
  const handleTransferOrganization = async (newOwnerId: string) => {
    if (!selectedOrg) return;

    setIsTransferring(true);
    try {
      // Mock - llamar a API real
      setOrganizations(organizations.map(org => 
        org.id === selectedOrg.id 
          ? { ...org, owner: { id: newOwnerId, name: 'Nuevo Owner', email: 'new@owner.com' } }
          : org
      ));
      setShowTransferModal(false);
      toast.success('Organización transferida exitosamente');
    } catch (error) {
      console.error('Error transferring organization:', error);
      toast.error('Error al transferir organización');
    } finally {
      setIsTransferring(false);
    }
  };

  // Eliminar organización
  const handleDeleteOrganization = async () => {
    if (!selectedOrg) return;

    setIsDeleting(true);
    try {
      // Mock - llamar a API real
      setOrganizations(organizations.filter(org => org.id !== selectedOrg.id));
      setShowDeleteModal(false);
      setSelectedOrg(null);
      toast.success('Organización eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Error al eliminar organización');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cambiar estado de organización
  const handleToggleStatus = async (orgId: string, newStatus: 'active' | 'suspended') => {
    try {
      // Mock - llamar a API real
      setOrganizations(organizations.map(org => 
        org.id === orgId ? { ...org, status: newStatus } : org
      ));
      toast.success(`Organización ${newStatus === 'active' ? 'activada' : 'suspendida'} exitosamente`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Error al cambiar estado');
    }
  };

  // Renderizar tarjeta de organización
  const renderOrganizationCard = (org: Organization) => {
    const StatusIcon = ORGANIZATION_STATUS[org.status].icon;
    const statusColor = ORGANIZATION_STATUS[org.status].color;

    return (
      <motion.div
        key={org.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group h-full"
      >
        <div className={cn(
          'h-full transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/10 rounded-xl overflow-hidden',
          'bg-white/5 backdrop-blur-md border border-white/10 ring-1 ring-white/5',
          org.status === 'suspended' && 'opacity-75 grayscale-[0.5]'
        )}>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-white/10 shadow-lg">
                  <AvatarImage src={org.logo} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                    <FiGlobe className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {org.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className={cn("border-0 backdrop-blur-sm", statusColor)}>
                      <StatusIcon className="w-3 h-3 mr-1.5" />
                      {ORGANIZATION_STATUS[org.status].label}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/10 text-gray-300 border-0">
                      {PLAN_FEATURES[org.plan || 'basic'].label}
                    </Badge>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10">
                    <FiMoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#121212] border-white/10 text-white">
                  <DropdownMenuItem onClick={() => router.push(`${basePath}/organizations/${org.id}`)} className="focus:bg-white/10 focus:text-white">
                    <FiEye className="w-4 h-4 mr-2" />
                    Ver detalles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`${basePath}/organizations/${org.id}/projects`)} className="focus:bg-white/10 focus:text-white">
                    <FiPackage className="w-4 h-4 mr-2" />
                    Ver proyectos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`${basePath}/organizations/${org.id}/users`)} className="focus:bg-white/10 focus:text-white">
                    <FiUsers className="w-4 h-4 mr-2" />
                    Ver usuarios
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => {
                    setSelectedOrg(org);
                    setShowTransferModal(true);
                  }} className="focus:bg-white/10 focus:text-white">
                    <FiTransfer className="w-4 h-4 mr-2" />
                    Transferir ownership
                  </DropdownMenuItem>
                  {org.status === 'active' ? (
                    <DropdownMenuItem onClick={() => handleToggleStatus(org.id, 'suspended')} className="focus:bg-white/10 focus:text-white text-yellow-400">
                      <FiPause className="w-4 h-4 mr-2" />
                      Suspender
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleToggleStatus(org.id, 'active')} className="focus:bg-white/10 focus:text-white text-green-400">
                      <FiPlay className="w-4 h-4 mr-2" />
                      Activar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedOrg(org);
                      setShowDeleteModal(true);
                    }}
                    className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                  >
                    <FiTrash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="px-6 pb-2">
            {org.description && (
              <p className="text-sm text-gray-400 line-clamp-2 mb-5">
                {org.description}
              </p>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 group/item">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover/item:bg-blue-500/20 transition-colors">
                    <FiPackage className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-gray-300">
                    {org.stats.totalProjects} proyectos
                  </span>
                </div>
                <div className="flex items-center gap-2 group/item">
                  <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400 group-hover/item:bg-green-500/20 transition-colors">
                    <FiMessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-gray-300">
                    {org.stats.totalChatbots} chatbots
                  </span>
                </div>
                <div className="flex items-center gap-2 group/item">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover/item:bg-purple-500/20 transition-colors">
                    <FiUsers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-gray-300">
                    {org.stats.totalUsers} usuarios
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 group/item">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover/item:bg-cyan-500/20 transition-colors">
                    <FiMessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-gray-300">
                    {org.stats.totalMessages.toLocaleString()} msgs
                  </span>
                </div>
                <div className="flex items-center gap-2 group/item">
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    org.stats.monthlyGrowth > 0 ? "bg-green-500/10 text-green-400 group-hover/item:bg-green-500/20" : "bg-red-500/10 text-red-400 group-hover/item:bg-red-500/20"
                  )}>
                    {org.stats.monthlyGrowth > 0 ? (
                      <FiTrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <FiTrendingDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm',
                    org.stats.monthlyGrowth > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {org.stats.monthlyGrowth > 0 ? '+' : ''}{org.stats.monthlyGrowth}% mes
                  </span>
                </div>
                <div className="flex items-center gap-2 group/item">
                  <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 group-hover/item:bg-yellow-500/20 transition-colors">
                    <FiActivity className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-gray-300">
                    Salud: {org.stats.systemHealth}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6 bg-black/20 p-3 rounded-lg border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Salud del sistema
                </span>
                <span className={cn(
                  'text-xs font-bold',
                  org.stats.systemHealth > 80 ? 'text-green-400' : 
                  org.stats.systemHealth > 50 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {org.stats.systemHealth}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    org.stats.systemHealth > 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 
                    org.stats.systemHealth > 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 'bg-gradient-to-r from-red-500 to-rose-400'
                  )}
                  style={{ width: `${org.stats.systemHealth}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-4 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-gray-500">
                <FiCalendar className="w-3.5 h-3.5" />
                <span>Creada: {new Date(org.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <FiActivity className="w-3.5 h-3.5" />
                <span>Act: {new Date(org.lastActivity).toLocaleDateString()}</span>
              </div>
            </div>

            {org.owner && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 border border-white/10">
                      <AvatarFallback className="text-[10px] bg-white/10 text-white">
                        {org.owner.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium text-white">
                        {org.owner.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {org.owner.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400 bg-white/5">
                    Owner
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gestión de Organizaciones
          </h1>
          <p className="mt-2 text-gray-400">
            Administra todas las organizaciones del sistema con control total
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Crear Organización
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl ring-1 ring-white/5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Buscar por nombre, descripción o industria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/20 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500 h-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'suspended', 'pending'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
                size="sm"
                className={cn(
                  "h-10 transition-all",
                  statusFilter === status 
                    ? "bg-purple-600 text-white border-purple-600" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                {status === 'all' && 'Todas'}
                {status === 'active' && 'Activas'}
                {status === 'suspended' && 'Suspendidas'}
                {status === 'pending' && 'Pendientes'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de organizaciones */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-96 rounded-xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="text-center py-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl ring-1 ring-white/5">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FiGlobe className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              No se encontraron organizaciones
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda para encontrar lo que buscas.'
                : 'Comienza creando la primera organización en el sistema.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map(renderOrganizationCard)}
        </div>
      )}

      {/* Modal Crear Organización */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Crear Nueva Organización</DialogTitle>
            <DialogDescription className="text-gray-400">
              Completa los datos para crear una nueva organización en el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre de la organización"
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="industry" className="text-gray-300">Industria</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Ej: Tecnología, Salud, etc."
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-gray-300">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la organización"
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website" className="text-gray-300">Sitio web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://ejemplo.com"
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail" className="text-gray-300">Email de contacto *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contacto@ejemplo.com"
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactPhone" className="text-gray-300">Teléfono</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+1 555-0123"
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="plan" className="text-gray-300">Plan</Label>
                <select
                  id="plan"
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                  className="w-full p-2 rounded-md border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="basic" className="bg-[#121212] text-white">Básico</option>
                  <option value="pro" className="bg-[#121212] text-white">Profesional</option>
                  <option value="enterprise" className="bg-[#121212] text-white">Empresarial</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="address" className="text-gray-300">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Dirección completa"
                className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isCreating} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isCreating ? 'Creando...' : 'Crear Organización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Transferir Organización */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Transferir Organización</DialogTitle>
            <DialogDescription className="text-gray-400">
              Transferir ownership de {selectedOrg?.name} a otro usuario
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              Esta acción transferirá todos los permisos y responsabilidades de la organización al nuevo owner.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)} className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent">
              Cancelar
            </Button>
            <Button onClick={() => handleTransferOrganization('new-user-id')} disabled={isTransferring} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isTransferring ? 'Transfiriendo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Organización */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">¿Eliminar Organización?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Esta acción no se puede deshacer. Se eliminarán todos los proyectos, chatbots y datos asociados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              Organización: <span className="font-semibold text-white">{selectedOrg?.name}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrganization} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Eliminando...' : 'Eliminar Organización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
