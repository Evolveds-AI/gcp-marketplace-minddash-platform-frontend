'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as FiCalendar,
  Filter as FiFilter,
  Plus as FiPlus,
  RefreshCw as FiRefreshCw,
  Search as FiSearch,
  Trash2 as FiTrash2,
  User as FiUser,
  Users as FiUsers,
  Bot as TbRobot,
} from 'lucide-react';
import ModalPortal from '@/components/ui/ModalPortal';

interface UserChatbotAssignment {
  id: string;
  usuario_id: string;
  chatbot_id: string;
  chatbot_name: string;
  chatbot_path: string;
  gcp_name: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by: string;
  user: {
    id: string;
    username: string;
    email: string;
    is_active: boolean;
    iam_role: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  iam_role: string;
}

interface Chatbot {
  id: string;
  name: string;
  company_name: string;
  gcp_name: string;
}

const ChatbotAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<UserChatbotAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChatbot, setFilterChatbot] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedChatbot, setSelectedChatbot] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAssignments();
    fetchUsers();
    fetchChatbots();
  }, []);

  const getAuthToken = () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return null;
    const auth = JSON.parse(authData);
    return auth.accessToken;
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/user-chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Datos de asignaciones recibidos:', data);
        setAssignments(data.data?.assignments || []);
      }
    } catch (error) {
      console.error('Error al cargar asignaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filtrar solo usuarios no administradores
        const allUsers = data.data?.users || data.users || [];
        const nonAdminUsers = allUsers.filter((user: User) => user.iam_role !== 'admin');
        setUsers(nonAdminUsers);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const fetchChatbots = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No hay token de autenticación');
        return;
      }

      console.log('Cargando chatbots...');
      const response = await fetch('/api/admin/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Respuesta de chatbots:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Datos de chatbots recibidos:', data);
        setChatbots(data.data?.chatbots || []);
      } else {
        console.error('Error en la respuesta de chatbots:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error al cargar chatbots:', error);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedUser || !selectedChatbot) return;

    setCreating(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/user-chatbots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: selectedUser,
          chatbot_id: selectedChatbot
        })
      });

      if (response.ok) {
        await fetchAssignments();
        setShowCreateModal(false);
        setSelectedUser('');
        setSelectedChatbot('');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear asignación');
      }
    } catch (error) {
      console.error('Error al crear asignación:', error);
      alert('Error al crear asignación');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('¿Estás seguro de que deseas remover esta asignación?')) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/admin/user-chatbots?id=${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchAssignments();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al remover asignación');
      }
    } catch (error) {
      console.error('Error al remover asignación:', error);
      alert('Error al remover asignación');
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.chatbot_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChatbot = filterChatbot === 'all' || assignment.chatbot_id === filterChatbot;
    return matchesSearch && matchesChatbot && assignment.is_active;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl ring-1 ring-white/5">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <FiUsers className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Asignaciones de Chatbots</h2>
                <p className="text-sm text-gray-400">Asigna chatbots existentes a usuarios</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters
                    ? 'bg-purple-600/20 border-purple-500/20 text-purple-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FiFilter className="w-4 h-4" />
                <span>Filtros</span>
              </button>

              <button
                onClick={fetchAssignments}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                <span>Nueva Asignación</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="glass-panel overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Buscar por usuario o chatbot
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Filtrar por chatbot</label>
                <select
                  value={filterChatbot}
                  onChange={(e) => setFilterChatbot(e.target.value)}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Todos los chatbots</option>
                  {chatbots.map((chatbot) => (
                    <option key={chatbot.id} value={chatbot.id}>
                      {chatbot.name} ({chatbot.company_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Asignaciones */}
      <div className="glass-panel">
        <div className="p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Asignaciones Activas ({filteredAssignments.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <TbRobot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm || filterChatbot !== 'all'
                  ? 'No se encontraron asignaciones con los filtros aplicados'
                  : 'No hay asignaciones activas'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <FiUser className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-white">{assignment.user.username}</h4>
                        <span className="text-sm text-gray-400">({assignment.user.email})</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-sm text-gray-300">
                          <TbRobot className="w-4 h-4" />
                          <span>{assignment.chatbot_name}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-400">
                          <FiCalendar className="w-4 h-4" />
                          <span>{new Date(assignment.assigned_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remover asignación"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalPortal>
        {showCreateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f111a] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Nueva Asignación</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Usuario</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                      <option value="">Seleccionar usuario...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id} className="bg-gray-900">
                          {user.username} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Chatbot</label>
                    <select
                      value={selectedChatbot}
                      onChange={(e) => setSelectedChatbot(e.target.value)}
                      className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                      <option value="">Seleccionar chatbot...</option>
                      {chatbots.map((bot) => (
                        <option key={bot.id} value={bot.id} className="bg-gray-900">
                          {bot.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateAssignment}
                      disabled={!selectedUser || !selectedChatbot || creating}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {creating ? 'Asignando...' : 'Asignar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
};

export default ChatbotAssignments;