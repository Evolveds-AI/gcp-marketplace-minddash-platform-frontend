'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiMessageSquare } from '@/lib/icons';
import PromptsManagementView from './PromptsManagementView';
import ExamplesManagementView from './ExamplesManagementView';

interface PromptManagementViewProps {
  productId: string;
}

export default function PromptManagementView({ productId }: PromptManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'prompts' | 'examples'>('prompts');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'prompts'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FiFileText />
            <span className="font-medium">Prompts</span>
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'examples'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FiMessageSquare />
            <span className="font-medium">Ejemplos Few-Shot</span>
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
        {activeTab === 'prompts' && (
          <PromptsManagementView productId={productId} />
        )}
        {activeTab === 'examples' && (
          <ExamplesManagementView productId={productId} />
        )}
      </motion.div>
    </div>
  );
}
