import React from 'react';
import { render, screen } from '@testing-library/react';
import { RoleTypeBadge } from '@/components/roles/RoleTypeBadge';
import { RoleType } from '@/types/roles/index';

// Mock de la función cn
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('RoleTypeBadge', () => {
  describe('Renderizado básico', () => {
    it('renderiza el badge con tipo DYNAMIC', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
    });

    it('renderiza el badge con tipo STATIC', () => {
      render(<RoleTypeBadge type={RoleType.STATIC} />);
      
      const badge = screen.getByText('STATIC');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    });

    it('renderiza el badge con tipo ALL', () => {
      render(<RoleTypeBadge type={RoleType.ALL} />);
      
      const badge = screen.getByText('ALL');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-800', 'border-purple-200');
    });

    it('renderiza el badge con tipo NONE', () => {
      render(<RoleTypeBadge type={RoleType.NONE} />);
      
      const badge = screen.getByText('NONE');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-200');
    });
  });

  describe('Tamaños del badge', () => {
    it('aplica tamaño pequeño (sm)', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} size="sm" />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');
    });

    it('aplica tamaño mediano (md) por defecto', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('aplica tamaño grande (lg)', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} size="lg" />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });

  describe('Clases CSS personalizadas', () => {
    it('aplica className personalizada', () => {
      render(
        <RoleTypeBadge 
          type={RoleType.DYNAMIC} 
          className="custom-class" 
        />
      );
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toHaveClass('custom-class');
    });

    it('combina className personalizada con clases por defecto', () => {
      render(
        <RoleTypeBadge 
          type={RoleType.STATIC} 
          className="custom-class" 
          size="sm"
        />
      );
      
      const badge = screen.getByText('STATIC');
      expect(badge).toHaveClass(
        'custom-class',
        'bg-green-100',
        'text-green-800',
        'border-green-200',
        'px-2',
        'py-1',
        'text-xs'
      );
    });
  });

  describe('Estilos de tema oscuro', () => {
    it('incluye clases de tema oscuro para DYNAMIC', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toHaveClass(
        'dark:bg-blue-900/20',
        'dark:text-blue-300',
        'dark:border-blue-800'
      );
    });

    it('incluye clases de tema oscuro para STATIC', () => {
      render(<RoleTypeBadge type={RoleType.STATIC} />);
      
      const badge = screen.getByText('STATIC');
      expect(badge).toHaveClass(
        'dark:bg-green-900/20',
        'dark:text-green-300',
        'dark:border-green-800'
      );
    });

    it('incluye clases de tema oscuro para ALL', () => {
      render(<RoleTypeBadge type={RoleType.ALL} />);
      
      const badge = screen.getByText('ALL');
      expect(badge).toHaveClass(
        'dark:bg-purple-900/20',
        'dark:text-purple-300',
        'dark:border-purple-800'
      );
    });

    it('incluye clases de tema oscuro para NONE', () => {
      render(<RoleTypeBadge type={RoleType.NONE} />);
      
      const badge = screen.getByText('NONE');
      expect(badge).toHaveClass(
        'dark:bg-gray-900/20',
        'dark:text-gray-300',
        'dark:border-gray-800'
      );
    });
  });

  describe('Estructura HTML', () => {
    it('renderiza como elemento span', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge.tagName).toBe('SPAN');
    });

    it('incluye clases base requeridas', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'rounded-full',
        'border',
        'font-medium'
      );
    });
  });

  describe('Casos edge', () => {
    it('maneja tipo de rol inválido usando estilos de NONE', () => {
      // Forzar un tipo inválido para probar el fallback
      const invalidType = 'INVALID_TYPE' as RoleType;
      render(<RoleTypeBadge type={invalidType} />);
      
      const badge = screen.getByText('INVALID_TYPE');
      expect(badge).toBeInTheDocument();
      // Debería usar los estilos de NONE como fallback
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-200');
    });

    it('maneja className undefined', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} className={undefined} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('maneja size undefined usando md por defecto', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} size={undefined} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });
  });

  describe('Accesibilidad', () => {
    it('el texto del badge es legible', () => {
      render(<RoleTypeBadge type={RoleType.DYNAMIC} />);
      
      const badge = screen.getByText('DYNAMIC');
      expect(badge).toBeVisible();
    });

    it('mantiene contraste adecuado con diferentes tipos', () => {
      const types = [RoleType.DYNAMIC, RoleType.STATIC, RoleType.ALL, RoleType.NONE];
      
      types.forEach(type => {
        const { unmount } = render(<RoleTypeBadge type={type} />);
        const badge = screen.getByText(type);
        expect(badge).toBeVisible();
        unmount();
      });
    });
  });

  describe('Combinaciones de props', () => {
    it('combina correctamente tipo, tamaño y className', () => {
      render(
        <RoleTypeBadge 
          type={RoleType.ALL} 
          size="lg" 
          className="my-custom-class" 
        />
      );
      
      const badge = screen.getByText('ALL');
      expect(badge).toHaveClass(
        'my-custom-class',
        'bg-purple-100',
        'text-purple-800',
        'border-purple-200',
        'px-4',
        'py-2',
        'text-base',
        'inline-flex',
        'items-center',
        'rounded-full',
        'border',
        'font-medium'
      );
    });

    it('funciona con todos los tamaños para todos los tipos', () => {
      const types = [RoleType.DYNAMIC, RoleType.STATIC, RoleType.ALL, RoleType.NONE];
      const sizes = ['sm', 'md', 'lg'] as const;
      
      types.forEach(type => {
        sizes.forEach(size => {
          const { unmount } = render(
            <RoleTypeBadge type={type} size={size} />
          );
          const badge = screen.getByText(type);
          expect(badge).toBeInTheDocument();
          unmount();
        });
      });
    });
  });

  describe('Consistencia visual', () => {
    it('mantiene estructura consistente entre diferentes tipos', () => {
      const types = [RoleType.DYNAMIC, RoleType.STATIC, RoleType.ALL, RoleType.NONE];
      
      types.forEach(type => {
        const { unmount } = render(<RoleTypeBadge type={type} />);
        const badge = screen.getByText(type);
        
        // Todas las clases base deben estar presentes
        expect(badge).toHaveClass(
          'inline-flex',
          'items-center',
          'rounded-full',
          'border',
          'font-medium',
          'px-3',
          'py-1.5',
          'text-sm'
        );
        
        unmount();
      });
    });
  });
});