'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, 
  FiBarChart, 
  FiActivity,
  FiLogOut,
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiFilter,
  FiUser,
  FiSettings,
  FiShield
} from '@/lib/icons';
import { WordRotate } from '@/components/magicui/word-rotate';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { 
  isBayerAdmin, 
  getThemeColors, 
  getBayerDynamicStyles, 
  getLogoPath, 
  getBayerClasses 
} from '@/lib/utils/bayer-theme';

interface User {
  id: string;
  username: string;
  email: string;
  iam_role: string;
  is_active: boolean;
  created_at: string;
  client: {
    id: string;
    nombre: string;
  };
}

interface Client {
  id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  recentUsers: User[];
  recentClients: Client[];
  roleDistribution?: Array<{
    role: string;
    count: number;
  }>;
}

// Componente para gestión limitada de usuarios (solo ver)
function LimitedUsersView({ showNotification }: { showNotification: (type: 'success' | 'error' | 'info', message: string) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        showNotification('error', 'Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.iam_role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header - Solo lectura */}
      <div className="bg-minddash-surface border border-minddash-border rounded-2xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
            <p className="text-gray-400 mt-1">Vista de solo lectura - Contacte al super administrador para modificaciones</p>
          </div>
        </div>

        {/* Filtros de búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={getBayerClasses(
                "w-full pl-10 pr-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "w-full pl-10 pr-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 bayer-primary-border"
              )}
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={getBayerClasses(
                "pl-10 pr-8 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[150px]",
                "pl-10 pr-8 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:ring-2 bayer-primary-border appearance-none min-w-[150px]"
              )}
            >
              <option value="all">Todos los roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">Usuario</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className={getBayerClasses(
        "bg-minddash-card border border-minddash-border rounded-xl shadow-sm overflow-hidden",
        "bayer-card rounded-xl overflow-hidden"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-minddash-elevated">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-minddash-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <FiRefreshCw className="w-6 h-6 text-blue-500 mx-auto mb-2 animate-spin" />
                    <span className="text-gray-400">Cargando usuarios...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <FiUser className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <span className="text-gray-400">No se encontraron usuarios</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-minddash-elevated transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-medium">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.iam_role === 'super_admin' 
                          ? 'bg-red-600/20 text-red-400'
                          : user.iam_role === 'admin'
                          ? 'bg-purple-600/20 text-purple-400'
                          : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {user.iam_role === 'super_admin' ? 'Super Admin' : 
                         user.iam_role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {user.client?.nombre || 'Sin asignar'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          user.is_active ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminLimitedPanel() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBayer, setIsBayer] = useState(false);
  const [themeColors, setThemeColors] = useState(getThemeColors());

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authData = localStorage.getItem('evolve-auth');
        if (!authData) {
          router.push('/login');
          return;
        }

        const auth = JSON.parse(authData);
        
        // Verificar que sea admin (no super_admin)
        if (auth.role !== 'admin') {
          if (auth.role === 'super_admin') {
            router.push('/admin'); // Redirigir super_admin al panel completo
          } else {
            router.push('/dashboard/user'); // Redirigir usuarios normales
          }
          return;
        }

        setIsAuthenticated(true);
        setAdminUser(auth);
        
        // Verificar si es usuario Bayer y actualizar tema
        const bayerUser = isBayerAdmin();
        setIsBayer(bayerUser);
        setThemeColors(getThemeColors());
        
        // Cargar estadísticas limitadas
        await loadDashboardStats();
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('evolve-auth');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-minddash-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart },
    { id: 'users', label: 'Usuarios', icon: FiUsers },
    { id: 'assignments', label: 'Asignaciones', icon: FiShield }
  ];

  return (
    <>
      {/* Estilos dinámicos para Bayer */}
      {isBayer && <div dangerouslySetInnerHTML={{ __html: getBayerDynamicStyles() }} />}
      
    <div className="min-h-screen bg-minddash-bg">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success' ? 'bg-green-600' :
              notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            } text-white`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && <FiCheckCircle className="w-5 h-5" />}
              {notification.type === 'error' && <FiXCircle className="w-5 h-5" />}
              <span>{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-minddash-surface border-r border-minddash-border">
          <div className="p-6">
            {/* Logo condicional */}
            {isBayer && (
              <div className="mb-4 flex justify-center">
                <img 
                  src={getLogoPath()} 
                  alt="Bayer Logo" 
                  className="h-16 w-auto"
                />
              </div>
            )}
            <h1 className={getBayerClasses(
              "text-2xl font-bold text-white mb-2",
              "text-2xl font-bold text-white mb-2 bayer-primary-text"
            )}>
              Panel Admin {isBayer && 'Bayer'}
            </h1>
            <p className="text-gray-400 text-sm">Gestión limitada</p>
          </div>

          <nav className="mt-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors ${
                  activeView === item.id
                    ? getBayerClasses(
                        'bg-minddash-elevated text-minddash-celeste-300 border-r-2 border-minddash-celeste-500',
                        'bg-minddash-elevated bayer-primary-text border-r-2 bayer-primary-border'
                      )
                    : 'text-gray-400 hover:text-white hover:bg-minddash-elevated'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User info and logout */}
          <div className="absolute bottom-0 w-64 p-6 border-t border-minddash-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className={getBayerClasses(
                "w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center",
                "w-10 h-10 bayer-gradient-primary rounded-full flex items-center justify-center"
              )}>
                <span className={getBayerClasses(
                  "text-white font-medium",
                  "text-white font-medium"
                )}>
                  {adminUser?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-medium">{adminUser?.username}</p>
                <p className="text-gray-400 text-sm">Administrador</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-minddash-elevated rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white">
                      Panel de Administración Limitado
                    </h2>
                    <p className="text-gray-400 mt-2">
                      Vista restringida para administradores de cliente
                    </p>
                  </div>
                </div>

                {/* Stats Cards */}
                {dashboardStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className={getBayerClasses(
                      "bg-minddash-card rounded-xl p-6 border border-minddash-border shadow-sm",
                      "bayer-card rounded-xl p-6"
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Total Usuarios</p>
                          <p className="text-2xl font-bold text-white">{dashboardStats.totalUsers}</p>
                        </div>
                        <FiUsers className={getBayerClasses(
                          "w-8 h-8 text-blue-500",
                          "w-8 h-8 bayer-primary-text"
                        )} />
                      </div>
                    </div>
                    <div className={getBayerClasses(
                      "bg-minddash-card rounded-xl p-6 border border-minddash-border shadow-sm",
                      "bayer-card rounded-xl p-6"
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Usuarios Activos</p>
                          <p className="text-2xl font-bold text-white">{dashboardStats.activeUsers}</p>
                        </div>
                        <FiActivity className={getBayerClasses(
                          "w-8 h-8 text-green-500",
                          "w-8 h-8 bayer-accent-text"
                        )} />
                      </div>
                    </div>
                    <div className={getBayerClasses(
                      "bg-minddash-card rounded-xl p-6 border border-minddash-border shadow-sm",
                      "bayer-card rounded-xl p-6"
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Total Clientes</p>
                          <p className="text-2xl font-bold text-white">{dashboardStats.totalClients}</p>
                        </div>
                        <FiShield className={getBayerClasses(
                          "w-8 h-8 text-purple-500",
                          "w-8 h-8 bayer-secondary-text"
                        )} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Role Distribution Chart */}
                {dashboardStats?.roleDistribution && dashboardStats.roleDistribution.length > 0 && (
                  <div className={getBayerClasses(
                    "bg-minddash-card rounded-xl p-6 border border-minddash-border shadow-sm",
                    "bayer-card rounded-xl p-6"
                  )}>
                    <h3 className="text-xl font-semibold text-white mb-4">Distribución de Roles</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={dashboardStats.roleDistribution.map((role: any) => ({
                              name: role.role === 'super_admin' ? 'Super Admin' : 
                                    role.role === 'admin' ? 'Admin' : 'Usuario',
                              value: role.count,
                              role: role.role
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {dashboardStats.roleDistribution.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  isBayer ?
                                    (entry.role === 'super_admin' ? themeColors.accent :
                                     entry.role === 'admin' ? themeColors.primary : themeColors.secondary) :
                                    (entry.role === 'super_admin' ? '#f59e0b' :
                                     entry.role === 'admin' ? '#8b5cf6' : '#3b82f6')
                                } 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f1f1f', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3">
                        {dashboardStats.roleDistribution.map((role: any) => (
                          <div key={role.role} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: 
                                    isBayer ?
                                      (role.role === 'super_admin' ? themeColors.accent :
                                       role.role === 'admin' ? themeColors.primary : themeColors.secondary) :
                                      (role.role === 'super_admin' ? '#f59e0b' :
                                       role.role === 'admin' ? '#8b5cf6' : '#3b82f6')
                                }}
                              ></div>
                              <span className="text-gray-400 text-sm truncate">
                                {role.role === 'super_admin' ? 'Super Admin' : 
                                 role.role === 'admin' ? 'Admin' : 'Usuario'}
                              </span>
                            </div>
                            <span className="text-white font-medium flex-shrink-0">{role.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeView === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <LimitedUsersView showNotification={showNotification} />
              </motion.div>
            )}

            {activeView === 'assignments' && (
              <motion.div
                key="assignments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center py-12">
                  <FiShield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Asignaciones de Chatbots</h3>
                  <p className="text-gray-400">Esta funcionalidad está limitada para administradores con rol admin.</p>
                  <p className="text-gray-500 text-sm mt-2">Contacte al super administrador para gestionar asignaciones.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
}