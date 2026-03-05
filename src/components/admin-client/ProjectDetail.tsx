'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiHome,
  FiMessageSquare,
  FiUsers,
  FiDatabase,
  FiAlertTriangle,
  FiActivity,
  FiLayers,
  FiTrendingUp,
  FiBookOpen,
  FiChevronLeft,
  FiPlus,
  FiSearch,
} from '@/lib/icons';
import ProjectGeneral from './ProjectGeneral';
import { useThemeMode } from '@/hooks/useThemeMode';
import ProjectPrompt from './ProjectPrompt';
import ProjectPermissions from './ProjectPermissions';
import KnowledgeSourcesSection from './KnowledgeSourcesSection';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  created_at: string;
  updated_at: string;
  stats: {
    total_chatbots: number;
    total_users: number;
    total_messages: number;
  };
  products: Chatbot[];
}

interface Chatbot {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  usuarios_asignados: number;
  mensajes_mes: number;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetail({ projectId, onBack, showNotification }: ProjectDetailProps) {
  const { applyThemeClass } = useThemeMode();
  const [project, setProject] = useState<Project | null>(null);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('chatbots');
  const [searchTerm, setSearchTerm] = useState('');

  const sidebarSections = [
    { id: 'chatbots', label: 'Chatbots', icon: FiMessageSquare },
    { id: 'general', label: 'General', icon: FiHome },
    { id: 'knowledge', label: 'Base de conocimiento', icon: FiBookOpen },
    { id: 'prompt', label: 'Prompt', icon: FiLayers },
    { id: 'permisos', label: 'Permisos', icon: FiUsers },
    { id: 'metricas', label: 'Métricas', icon: FiTrendingUp },
    { id: 'alertas', label: 'Alertas', icon: FiAlertTriangle },
    { id: 'profiling', label: 'Profiling', icon: FiDatabase },
    { id: 'semantic', label: 'Capa Semántica', icon: FiLayers },
    { id: 'insights', label: 'Insights', icon: FiActivity },
  ];

  useEffect(() => {
    loadProjectDetails();
  }, [projectId]);

  const loadProjectDetails = async () => {
    try {
      setLoading(true);
      
      // Datos demo para proyectos
      if (projectId.startsWith('demo-')) {
        const mockChatbots: Chatbot[] = [
          {
            id: 'chatbot-1',
            nombre: 'Asistente de Ventas',
            descripcion: 'Chatbot diseñado para ayudar al equipo de ventas',
            tipo: 'Ventas',
            usuarios_asignados: 25,
            mensajes_mes: 1500,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'chatbot-2',
            nombre: 'Bot de Soporte',
            descripcion: 'Asistente para atención al cliente',
            tipo: 'Soporte',
            usuarios_asignados: 15,
            mensajes_mes: 800,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        const mockProject: Project = {
          id: projectId,
          name: projectId === 'demo-1' ? 'Proyecto Alpha' : projectId === 'demo-2' ? 'Proyecto Beta' : 'Proyecto Ventas',
          description: 'Descripción de demostración del proyecto',
          tag: 'Demo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stats: {
            total_chatbots: mockChatbots.length,
            total_users: mockChatbots.reduce((sum, c) => sum + c.usuarios_asignados, 0),
            total_messages: mockChatbots.reduce((sum, c) => sum + c.mensajes_mes, 0),
          },
          products: mockChatbots,
        };

        setProject(mockProject);
        setChatbots(mockChatbots);
        setLoading(false);
        return;
      }

      const authData = localStorage.getItem('evolve-auth');
      
      if (!authData) {
        showNotification('error', 'No se encontró token de autenticación');
        setLoading(false);
        return;
      }

      const auth = JSON.parse(authData);
      const token = auth.accessToken;

      // Cargar detalles del proyecto
      const response = await fetch(`/api/admin-client/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setProject(data.project);
        setChatbots(data.project.products || []);
      } else {
        showNotification('error', data.message || 'Error al cargar proyecto');
      }
    } catch (error) {
      console.error('Error cargando proyecto:', error);
      showNotification('error', 'Error al cargar proyecto');
    } finally {
      setLoading(false);
    }
  };

  const filteredChatbots = chatbots.filter(chatbot =>
    chatbot.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chatbot.descripcion && chatbot.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTagColor = (tag: string | null) => {
    if (!tag) return 'bg-gray-900/50 text-gray-300';
    
    const colors: { [key: string]: string } = {
      'Ventas': 'bg-blue-900/50 text-blue-300',
      'Soporte': 'bg-green-900/50 text-green-300',
      'Marketing': 'bg-purple-900/50 text-purple-300',
      'RRHH': 'bg-yellow-900/50 text-yellow-300',
      'Capacitación': 'bg-indigo-900/50 text-indigo-300',
    };

    return colors[tag] || 'bg-gray-900/50 text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-3 text-gray-400">Cargando proyecto...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Proyecto no encontrado</p>
        <button
          onClick={onBack}
          className="mt-4 text-green-500 hover:text-green-400"
        >
          Volver a proyectos
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar interno */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={applyThemeClass('w-64 bg-minddash-surface border-r border-minddash-border flex flex-col', 'w-64 bg-white border-r border-gray-200 flex flex-col')}
      >
        {/* Header del proyecto */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <FiChevronLeft className="w-4 h-4" />
            <span className="text-sm">Volver a proyectos</span>
          </button>
          <h3 className={applyThemeClass('text-lg font-semibold text-white truncate', 'text-lg font-semibold text-gray-900 truncate')}>{project.name}</h3>
          {project.description && (
            <p className={applyThemeClass('text-xs text-gray-400 mt-1 line-clamp-2', 'text-xs text-gray-500 mt-1 line-clamp-2')}>{project.description}</p>
          )}
          {project.tag && (
            <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getTagColor(project.tag)}`}>
              {project.tag}
            </span>
          )}
        </div>

        {/* Estadísticas rápidas */}
        <div className="p-4 border-b border-gray-800 grid grid-cols-2 gap-3">
          <div className={applyThemeClass('bg-minddash-elevated rounded-lg p-3', 'bg-gray-50 rounded-lg p-3')}>
            <p className={applyThemeClass('text-xs text-gray-400', 'text-xs text-gray-600')}>Chatbots</p>
            <p className={applyThemeClass('text-lg font-bold text-white', 'text-lg font-bold text-gray-900')}>{project.stats.total_chatbots}</p>
          </div>
          <div className={applyThemeClass('bg-minddash-elevated rounded-lg p-3', 'bg-gray-50 rounded-lg p-3')}>
            <p className={applyThemeClass('text-xs text-gray-400', 'text-xs text-gray-600')}>Usuarios</p>
            <p className={applyThemeClass('text-lg font-bold text-white', 'text-lg font-bold text-gray-900')}>{project.stats.total_users}</p>
          </div>
        </div>

        {/* Navegación de secciones */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">
            Secciones
          </p>
          {sidebarSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-green-600/20 text-green-400'
                  : applyThemeClass('text-gray-400 hover:bg-minddash-elevated hover:text-white', 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
              }`}
            >
              <section.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={applyThemeClass('bg-minddash-card border-b border-minddash-border px-6 py-4', 'bg-white border-b border-gray-200 px-6 py-4')}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={applyThemeClass('text-2xl font-bold text-white', 'text-2xl font-bold text-gray-900')}>
                {sidebarSections.find(s => s.id === activeSection)?.label || 'Chatbots'}
              </h2>
              <p className={applyThemeClass('text-gray-400 text-sm mt-1', 'text-gray-500 text-sm mt-1')}>
                {activeSection === 'chatbots' && 'Gestiona los chatbots de este proyecto'}
                {activeSection === 'general' && 'Información general del proyecto'}
                {activeSection === 'prompt' && 'Configuración de prompts y ejemplos'}
                {activeSection === 'fuentes' && 'Fuentes y documentos que alimentan el conocimiento del asistente'}
                {activeSection === 'permisos' && 'Gestión de permisos y accesos'}
                {activeSection === 'metricas' && 'Métricas y análisis del proyecto'}
                {activeSection === 'alertas' && 'Configuración de alertas automáticas'}
                {activeSection === 'profiling' && 'Análisis y perfilado de datos'}
                {activeSection === 'semantic' && 'Capa semántica y contexto'}
                {activeSection === 'insights' && 'Insights y recomendaciones'}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido de la sección */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'chatbots' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Búsqueda y acciones */}
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar chatbot..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={applyThemeClass('w-full bg-minddash-elevated border border-minddash-border rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-green-500 transition-colors', 'w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:border-green-600 transition-colors')}
                  />
                </div>
                <button
                  className="ml-4 flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Nuevo Chatbot</span>
                </button>
              </div>

              {/* Tabla de chatbots */}
              <div className={applyThemeClass('overflow-x-auto rounded-lg border border-minddash-border bg-minddash-surface', 'overflow-x-auto rounded-lg border border-gray-200 bg-white')}>
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className={applyThemeClass('bg-minddash-elevated text-xs text-gray-300 uppercase tracking-wider', 'bg-gray-50 text-xs text-gray-600 uppercase tracking-wider')}>
                    <tr>
                      <th className="px-6 py-3">Nombre del Chatbot</th>
                      <th className="px-6 py-3">Descripción</th>
                      <th className="px-6 py-3 text-center">Usuarios</th>
                      <th className="px-6 py-3 text-center">Etiqueta</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChatbots.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <FiMessageSquare className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-400 mb-2">
                            {searchTerm ? 'No se encontraron chatbots' : 'No hay chatbots en este proyecto'}
                          </h3>
                          <p className="text-gray-500 mb-4">
                            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer chatbot para este proyecto'}
                          </p>
                          {!searchTerm && (
                            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">
                              Crear Primer Chatbot
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredChatbots.map((chatbot) => (
                        <tr
                          key={chatbot.id}
                          className={applyThemeClass('border-t border-minddash-border hover:bg-minddash-elevated transition-colors', 'border-t border-gray-200 hover:bg-gray-50 transition-colors')}
                        >
                          <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                            {chatbot.nombre}
                          </td>
                          <td className="px-6 py-4 max-w-sm truncate">
                            {chatbot.descripcion || 'Sin descripción'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {chatbot.usuarios_asignados || 0}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {chatbot.tipo && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTagColor(chatbot.tipo)}`}>
                                {chatbot.tipo}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
                              Ver Detalles
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Sección General */}
          {activeSection === 'general' && (
            <ProjectGeneral 
              projectId={project.id}
              projectName={project.name}
            />
          )}

          {/* Sección Prompt */}
          {activeSection === 'prompt' && (
            <ProjectPrompt 
              projectId={project.id}
              projectName={project.name}
            />
          )}

          {activeSection === 'fuentes' && (
            <KnowledgeSourcesSection productId={project.id} />
          )}

          {/* Sección Permisos */}
          {activeSection === 'permisos' && (
            <ProjectPermissions 
              projectId={project.id}
              projectName={project.name}
              productId={project.id}
            />
          )}

          {/* Placeholder para otras secciones */}
          {!['chatbots', 'general', 'prompt', 'fuentes', 'permisos'].includes(activeSection) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={applyThemeClass('bg-minddash-elevated border border-minddash-border rounded-lg p-12 text-center', 'bg-gray-50 border border-gray-200 rounded-lg p-12 text-center')}
            >
              <div className="max-w-md mx-auto">
                {(() => {
                  const section = sidebarSections.find(s => s.id === activeSection);
                  const Icon = section?.icon || FiHome;
                  return (
                    <>
                      <Icon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Sección {section?.label}
                      </h3>
                      <p className="text-gray-400">
                        Esta sección estará disponible en la siguiente fase de desarrollo.
                      </p>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
