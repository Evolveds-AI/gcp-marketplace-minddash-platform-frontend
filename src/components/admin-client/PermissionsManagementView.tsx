'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiShield } from '@/lib/icons';
import UserDataAccessView from './UserDataAccessView';
import RoleDataAccessView from './RoleDataAccessView';

interface PermissionsManagementViewProps {
  projectId: string;
  projectName: string;
  chatbotId: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function PermissionsManagementView({ 
  projectId, 
  projectName, 
  chatbotId,
  showNotification 
}: PermissionsManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'user-access' | 'role-access'>('role-access');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('role-access')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'role-access'
                ? 'border-purple-600 text-purple-700 dark:border-purple-500 dark:text-purple-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <FiShield />
            <span className="font-medium">Acceso de Datos por Rol (CLS)</span>
          </button>
          <button
            onClick={() => setActiveTab('user-access')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'user-access'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <FiUsers />
            <span className="font-medium">Acceso de Datos por Usuario (RLS)</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {activeTab === 'role-access' && (
          <RoleDataAccessView 
            productId={chatbotId}
            showNotification={showNotification}
          />
        )}
        {activeTab === 'user-access' && (
          <UserDataAccessView 
            productId={chatbotId}
            showNotification={showNotification}
          />
        )}
      </motion.div>
    </div>
  );
}
