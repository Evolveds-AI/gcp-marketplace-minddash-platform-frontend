import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RolesList } from '@/components/roles/RolesList';
import { useProductRoles } from '@/hooks/roles/useProductRoles';
import { ProductRole, RoleType } from '@/types/roles/index';

// Mock del hook useProductRoles
jest.mock('@/hooks/roles/useProductRoles');
const mockUseProductRoles = useProductRoles as jest.MockedFunction<typeof useProductRoles>;

// Mock de los iconos de lucide-react
jest.mock('lucide-react', () => ({
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  MoreHorizontal: () => <div data-testid="more-icon" />
}));

// Mock del componente RoleTypeBadge
jest.mock('@/components/roles/RoleTypeBadge', () => ({
  RoleTypeBadge: ({ type }: { type: string }) => (
    <span data-testid="role-type-badge">{type}</span>
  )
}));

// Datos de prueba
const mockRoles: ProductRole[] = [
  {
    id: 'role-1',
    name: 'Administrador',
    type: RoleType.DYNAMIC,
    table: 'users',
    field: 'role',
    source: 'database',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    product_id: 'product-1'
  },
  {
    id: 'role-2',
    name: 'Usuario',
    type: RoleType.STATIC,
    static_value: 'user',
    active: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    product_id: 'product-1'
  }
];

const defaultProps = {
  productId: 'product-1',
  onEdit: jest.fn(),
  onDelete: jest.fn()
};

describe('RolesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Estados de carga', () => {
    it('muestra skeleton de loading cuando está cargando', () => {
      mockUseProductRoles.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<RolesList {...defaultProps} />);

      // Verifica que se muestren los skeletons de loading
      const skeletons = screen.getAllByText((content, element) => {
        return element?.classList.contains('animate-pulse') || false;
      });
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('muestra mensaje de error cuando hay un error', () => {
      const mockError = new Error('Error de conexión');
      const mockRefetch = jest.fn();
      
      mockUseProductRoles.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch
      });

      render(<RolesList {...defaultProps} />);

      expect(screen.getByText(/Error al cargar los roles/)).toBeInTheDocument();
      expect(screen.getByText(/Error de conexión/)).toBeInTheDocument();
      
      // Verifica que el botón de reintentar funcione
      const retryButton = screen.getByText('Reintentar');
      fireEvent.click(retryButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('muestra mensaje cuando no hay roles', () => {
      mockUseProductRoles.mockReturnValue({
        data: { roles: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<RolesList {...defaultProps} />);

      expect(screen.getByText(/No hay roles configurados/)).toBeInTheDocument();
      expect(screen.getByText(/Crea tu primer rol/)).toBeInTheDocument();
    });
  });

  describe('Renderizado de roles', () => {
    beforeEach(() => {
      mockUseProductRoles.mockReturnValue({
        data: { roles: mockRoles },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });
    });

    it('renderiza la lista de roles correctamente', () => {
      render(<RolesList {...defaultProps} />);

      // Verifica que se muestren los nombres de los roles
      expect(screen.getByText('Administrador')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();

      // Verifica que se muestren los badges de tipo
      const typeBadges = screen.getAllByTestId('role-type-badge');
      expect(typeBadges).toHaveLength(2);
      expect(typeBadges[0]).toHaveTextContent('DYNAMIC');
      expect(typeBadges[1]).toHaveTextContent('STATIC');
    });

    it('muestra información adicional de cada rol', () => {
      render(<RolesList {...defaultProps} />);

      // Verifica información de tabla
      expect(screen.getByText('Tabla: users')).toBeInTheDocument();
      expect(screen.getByText('Sin tabla definida')).toBeInTheDocument();

      // Verifica estados activo/inactivo
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Inactivo')).toBeInTheDocument();

      // Verifica fechas de creación (formato puede variar según locale)
      const createdTexts = screen.getAllByText(/Creado:/);
      expect(createdTexts).toHaveLength(2);
    });

    it('muestra los botones de acción para cada rol', () => {
      render(<RolesList {...defaultProps} />);

      // Verifica que se muestren los iconos de acción
      expect(screen.getAllByTestId('edit-icon')).toHaveLength(2);
      expect(screen.getAllByTestId('trash-icon')).toHaveLength(2);
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument(); // Rol activo
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument(); // Rol inactivo
    });
  });

  describe('Interacciones', () => {
    const mockRefetch = jest.fn();

    beforeEach(() => {
      mockUseProductRoles.mockReturnValue({
        data: { roles: mockRoles },
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });
    });

    it('llama a onEdit cuando se hace clic en el botón de editar', () => {
      const mockOnEdit = jest.fn();
      render(<RolesList {...defaultProps} onEdit={mockOnEdit} />);

      const editButtons = screen.getAllByTestId('edit-icon');
      fireEvent.click(editButtons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockRoles[0]);
    });

    it('llama a onDelete cuando se hace clic en el botón de eliminar', () => {
      const mockOnDelete = jest.fn();
      render(<RolesList {...defaultProps} onDelete={mockOnDelete} />);

      const deleteButtons = screen.getAllByTestId('trash-icon');
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith('role-1');
    });

    it('maneja el toggle de estado activo/inactivo', async () => {
      // Mock console.log para verificar la llamada
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<RolesList {...defaultProps} />);

      // Hacer clic en el botón de toggle del rol activo (debería desactivarlo)
      const eyeIcon = screen.getByTestId('eye-icon');
      fireEvent.click(eyeIcon);

      // Verifica que se llame la función de toggle
      expect(consoleSpy).toHaveBeenCalledWith('Toggle active:', 'role-1', false);
      
      // Verifica que se llame refetch
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });

      consoleSpy.mockRestore();
    });

    it('maneja errores en el toggle de estado', async () => {
      // Mock console.error para verificar el manejo de errores
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Error de prueba');
      });
      
      render(<RolesList {...defaultProps} />);

      const eyeIcon = screen.getByTestId('eye-icon');
      fireEvent.click(eyeIcon);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error al cambiar estado del rol:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Estilos y clases CSS', () => {
    beforeEach(() => {
      mockUseProductRoles.mockReturnValue({
        data: { roles: mockRoles },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });
    });

    it('aplica className personalizada', () => {
      const { container } = render(
        <RolesList {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('aplica estilos correctos para roles activos e inactivos', () => {
      render(<RolesList {...defaultProps} />);

      const activeStatus = screen.getByText('Activo');
      const inactiveStatus = screen.getByText('Inactivo');

      expect(activeStatus).toHaveClass('bg-green-100', 'text-green-800');
      expect(inactiveStatus).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Casos edge', () => {
    it('maneja data undefined correctamente', () => {
      mockUseProductRoles.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<RolesList {...defaultProps} />);

      expect(screen.getByText(/No hay roles configurados/)).toBeInTheDocument();
    });

    it('maneja roles undefined en data', () => {
      mockUseProductRoles.mockReturnValue({
        data: { roles: undefined } as any,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<RolesList {...defaultProps} />);

      expect(screen.getByText(/No hay roles configurados/)).toBeInTheDocument();
    });

    it('maneja roles con campos faltantes', () => {
      const incompleteRole = {
        id: 'incomplete-role',
        name: 'Rol Incompleto',
        type: RoleType.NONE,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        product_id: 'product-1'
      } as ProductRole;

      mockUseProductRoles.mockReturnValue({
        data: { roles: [incompleteRole] },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<RolesList {...defaultProps} />);

      expect(screen.getByText('Rol Incompleto')).toBeInTheDocument();
      expect(screen.getByText('Sin tabla definida')).toBeInTheDocument();
      expect(screen.getByText('Fuente: N/A')).toBeInTheDocument();
      expect(screen.getByText('Campo: N/A')).toBeInTheDocument();
    });
  });
});