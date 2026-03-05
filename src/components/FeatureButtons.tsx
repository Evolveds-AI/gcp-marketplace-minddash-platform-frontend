'use client';

import { IconMappings } from '@/lib/icons';
import { FeatureButtonsProps } from '@/lib/types';

const FeatureButtons: React.FC<FeatureButtonsProps> = ({ onSuggestionClick }) => {
  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  return (
    <div className="flex flex-wrap justify-center py-2 sm:py-3 gap-1 sm:gap-2">
      {/* Espacio reservado para botones de características */}
      {/* Se ha ajustado el padding y gap para mejor visualización en móviles */}
    </div>
  );
};

export default FeatureButtons;
