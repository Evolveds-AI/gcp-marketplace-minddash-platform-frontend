'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiInfo, FiServer } from '@/lib/icons';
import ProjectGeneral from './ProjectGeneral';
import DeploysView from './DeploysView';

interface GeneralManagementViewProps {
  projectId: string;
  projectName: string;
  chatbotId: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  initialTab?: 'general' | 'deploys';
  hideTabs?: boolean;
}

export default function GeneralManagementView({ 
  projectId, 
  projectName, 
  chatbotId,
  showNotification,
  initialTab,
  hideTabs,
}: GeneralManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'deploys'>(initialTab ?? 'general');

  useEffect(() => {
    if (!initialTab) return;
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {hideTabs ? null : (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <FiInfo />
              <span className="font-medium">Información General</span>
            </button>
            <button
              onClick={() => setActiveTab('deploys')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'deploys'
                  ? 'border-green-600 text-green-700 dark:border-green-500 dark:text-green-400'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <FiServer />
              <span className="font-medium">Estado de Despliegue</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {activeTab === 'general' && (
          <ProjectGeneral 
            projectId={chatbotId}
            projectName={projectName}
          />
        )}
        {activeTab === 'deploys' && (
          <DeploysView 
            productId={chatbotId}
            showNotification={showNotification}
          />
        )}
      </motion.div>
    </div>
  );
}
