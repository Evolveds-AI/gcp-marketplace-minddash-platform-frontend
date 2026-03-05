'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowRight, FiMessageSquare, FiEdit, FiHelpCircle } from '@/lib/icons';
import ModalPortal from '@/components/ui/ModalPortal';

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  hasActiveConversation: boolean;
  onNewConversation: () => void;
  clientName: string;
  chatbotName: string;
  clientDescription: string;
  exampleQuestions: string[];
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, onSuggestionClick, hasActiveConversation, onNewConversation, clientName, chatbotName, clientDescription, exampleQuestions }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const steps = [
    {
      title: `Bienvenido a ${chatbotName}`,
      description: `${clientDescription} Te guiaré a través de las principales funciones.`,
      icon: <FiMessageSquare className="text-blue-400" size={24} />
    },
    {
      title: "Haz preguntas naturales",
      description: "Puedes preguntarme sobre tus datos usando tu lenguaje.",
      icon: <FiEdit className="text-green-400" size={24} />
    },
    {
      title: "Ejemplos de preguntas",
      description: "Aquí tienes algunos ejemplos de preguntas que puedes hacerme:",
      icon: <FiHelpCircle className="text-purple-400" size={24} />,
      examples: exampleQuestions
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setVisible(false);
    // Guardar en localStorage que el usuario ya vio el tutorial
    localStorage.setItem(`${clientName}-tutorial-completed`, 'true');
    // También marcar en sessionStorage para control de sesión
    sessionStorage.setItem(`${clientName}-tutorial-session`, 'true');
    // Notificar al componente padre
    onComplete();
  };

  const handleExampleClick = (question: string) => {
    // Si no hay una conversación activa, primero crear una nueva
    if (!hasActiveConversation) {
      onNewConversation();
    }
    
    // Pequeño delay para asegurar que la conversación se creó correctamente
    setTimeout(() => {
      if (onSuggestionClick) {
        onSuggestionClick(question);
      }
      handleComplete();
    }, 100);
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
          <motion.div 
            className="bg-[#111111] border border-gray-800 rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Tutorial de {chatbotName}</h2>
              <button 
                onClick={handleComplete}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800/40 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center mr-3">
                  {steps[currentStep].icon}
                </div>
                <h3 className="text-xl font-medium text-white">{steps[currentStep].title}</h3>
              </div>
              
              <p className="text-gray-300 mb-4">{steps[currentStep].description}</p>
              
              {/* Examples */}
              {currentStep === 2 && (
                <div className="space-y-2 my-4">
                  {exampleQuestions.map((question, index) => (
                    <motion.button
                      key={index}
                      className="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-gray-200 text-sm transition-colors"
                      onClick={() => handleExampleClick(question)}
                      whileHover={{ x: 5 }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              )}
              
              {/* Progress indicators */}
              <div className="flex justify-between items-center mt-6">
                <div className="flex space-x-1">
                  {steps.map((_, index) => (
                    <div 
                      key={index} 
                      className={`w-2 h-2 rounded-full ${currentStep === index ? 'bg-blue-500' : 'bg-gray-600'}`}
                    />
                  ))}
                </div>
                
                <button
                  onClick={handleNext}
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {currentStep < steps.length - 1 ? 'Siguiente' : 'Comenzar'}
                  <FiArrowRight className="ml-2" />
                </button>
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export default OnboardingTutorial;