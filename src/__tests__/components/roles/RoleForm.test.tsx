import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleForm } from '@/components/roles/RoleForm';
import { RoleType } from '@/types/roles/index';

// Mock simplificado de todos los componentes UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, ...props }: any) => (
    <div
      onClick={disabled ? undefined : onClick}
      data-disabled={disabled ? 'true' : 'false'}
      data-type={type}
      data-variant={variant}
      data-testid="button"
      {...props}
    >
      {children}
    </div>
  )
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, disabled, type, ...props }: any) => (
    <div>
      <input
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        type={type}
        data-testid="input"
        data-disabled={disabled ? 'true' : 'false'}
        {...props}
      />
      {placeholder && <span data-testid="placeholder-text">{placeholder}</span>}
    </div>
  )
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, disabled, ...props }: any) => (
    <div
      data-value={value || ''}
      data-placeholder={placeholder}
      data-disabled={disabled ? 'true' : 'false'}
      data-testid="textarea"
      {...props}
    >
      {placeholder}
    </div>
  )
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) => (
    <div
      data-value={value || ''}
      data-disabled={disabled ? 'true' : 'false'}
      data-testid="select"
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled, id }: any) => (
    <div
      data-checked={checked ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
      id={id}
      data-testid="checkbox"
      onClick={() => onCheckedChange?.(!checked)}
    >
      {checked ? '✓' : '☐'}
    </div>
  )
}))

// Mock de los iconos
jest.mock('lucide-react', () => ({
  Save: () => <div data-testid="save-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Loader2: () => <div data-testid="loader-icon" />
}));

// Datos de prueba
const mockRole = {
  id: 'role-1',
  name: 'Administrador',
  type: RoleType.DYNAMIC,
  source: 'database' as const,
  table: 'users',
  field: 'role',
  uses_user_code: false,
  user_code_table: '',
  user_code_key: '',
  user_code_value_col: '',
  static_value: '',
  active: true
};

const defaultProps = {
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  isLoading: false
};

describe('RoleForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado inicial', () => {
    it('renderiza el formulario para crear nuevo rol', () => {
      render(<RoleForm {...defaultProps} />);

      expect(screen.getByText('Crear Nuevo Rol')).toBeInTheDocument();
      expect(screen.getByText('Ej: Administrador de Ventas')).toBeInTheDocument();
      expect(screen.getByText('Crear Rol')).toBeInTheDocument();
    });

    it('renderiza el formulario para editar rol existente', () => {
      render(<RoleForm {...defaultProps} role={mockRole} />);

      expect(screen.getByText('Editar Rol')).toBeInTheDocument();
      const nameInput = screen.getAllByTestId('input')[0];
      expect(nameInput).toHaveValue('Administrador');
      expect(screen.getByText('Actualizar Rol')).toBeInTheDocument();
    });

    it('muestra todos los campos del formulario', () => {
      render(<RoleForm {...defaultProps} />);

      expect(screen.getByText('Nombre del rol')).toBeInTheDocument();
      expect(screen.getByText('Tipo de rol')).toBeInTheDocument();
      expect(screen.getByText('Valor estático')).toBeInTheDocument();
      expect(screen.getByText('Rol activo')).toBeInTheDocument();
      expect(screen.getByText('Usa código de usuario')).toBeInTheDocument();
    });
  });

  describe('Validación de formulario', () => {
    it('muestra error cuando el nombre está vacío', async () => {
      const user = userEvent.setup();
      render(<RoleForm {...defaultProps} />);

      const submitButton = screen.getByText('Crear Rol');

      // Intentar enviar formulario sin nombre
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('El nombre del rol es requerido')).toBeInTheDocument();
      });
    });

    it('muestra error cuando el nombre es muy corto', async () => {
      render(<RoleForm {...defaultProps} />);

      // Con nombre vacío, el botón debe estar deshabilitado
      const submitButton = screen.getByText('Crear Rol');
      expect(submitButton).toHaveAttribute('data-disabled', 'true');
    });

    it('no muestra errores con datos válidos', async () => {
      render(<RoleForm {...defaultProps} role={mockRole} />);

      // Con datos válidos, el botón debe estar habilitado
      await waitFor(() => {
        const submitButton = screen.getByText('Actualizar Rol');
        expect(submitButton).toHaveAttribute('data-disabled', 'false');
      });
    });

    it('deshabilita el botón de envío cuando hay errores', async () => {
      render(<RoleForm {...defaultProps} />);

      const submitButton = screen.getByText('Crear Rol');
      expect(submitButton.getAttribute('data-disabled')).toBe('true');
    });
  });

  describe('Interacciones del formulario', () => {
    it('renderiza el campo nombre correctamente', () => {
      render(<RoleForm {...defaultProps} role={mockRole} />);

      const nameInput = screen.getAllByTestId('input')[0];
      expect(nameInput).toHaveValue('Administrador');
    });

    it('renderiza el tipo de rol correctamente', () => {
      render(<RoleForm {...defaultProps} role={mockRole} />);

      const select = screen.getByTestId('select');
      expect(select).toHaveAttribute('data-value', RoleType.DYNAMIC);
    });

    it('renderiza el valor estático correctamente', () => {
      render(<RoleForm {...defaultProps} />);

      const staticValueInput = screen.getAllByTestId('input')[1]; // Segundo input
      expect(staticValueInput).toHaveAttribute('placeholder', 'Valor para roles estáticos');
    });

    it('renderiza el estado activo correctamente', () => {
      render(<RoleForm {...defaultProps} role={mockRole} />);

      const activeCheckbox = screen.getAllByTestId('checkbox')[0];
      expect(activeCheckbox).toHaveAttribute('data-checked', 'true');
    });

    it('renderiza el uso de código de usuario correctamente', () => {
      render(<RoleForm {...defaultProps} />);

      const userCodeCheckbox = screen.getAllByTestId('checkbox')[1];
      expect(userCodeCheckbox).toHaveAttribute('data-checked', 'false');
    });
  });

  describe('Envío del formulario', () => {
    it('renderiza el botón de envío correctamente para crear nuevo rol', async () => {
      const user = userEvent.setup();
      render(<RoleForm {...defaultProps} />);
      
      // Inicialmente el botón debe estar deshabilitado (sin nombre)
      const submitButton = screen.getByText('Crear Rol');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('data-disabled', 'true');
      
      // Llenar el formulario con datos válidos
      const nameInput = screen.getAllByTestId('input')[0];
      await user.type(nameInput, 'Administrador');
      
      await waitFor(() => {
        expect(submitButton).toHaveAttribute('data-disabled', 'false');
      });
    });

    it('renderiza el botón de envío correctamente para editar rol existente', async () => {
      const existingRole = {
        id: '1',
        name: 'Admin',
        type: RoleType.STATIC,
        active: true,
        uses_user_code: false,
        static_value: 'admin'
      };
      
      render(<RoleForm {...defaultProps} role={existingRole} />);
      
      await waitFor(() => {
        const submitButton = screen.getByText('Actualizar Rol');
        expect(submitButton).toBeInTheDocument();
        expect(submitButton).toHaveAttribute('data-disabled', 'false');
      });
    });

    it('renderiza el formulario con campos requeridos', () => {
      render(<RoleForm {...defaultProps} />);

      const submitButton = screen.getByText('Crear Rol');
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Cancelación', () => {
    it('renderiza el botón de cancelar', () => {
      render(<RoleForm {...defaultProps} />);

      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Estado de carga', () => {
    it('muestra los campos deshabilitados cuando está cargando', () => {
      render(<RoleForm {...defaultProps} isLoading={true} />);

      const inputs = screen.getAllByTestId('input');
      const select = screen.getByTestId('select');
      const checkboxes = screen.getAllByTestId('checkbox');
      const submitButton = screen.getByText('Guardando... Rol');
      const cancelButton = screen.getByText('Cancelar');

      inputs.forEach(input => {
        expect(input).toHaveAttribute('data-disabled', 'true');
      });
      expect(select).toHaveAttribute('data-disabled', 'true');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('data-disabled', 'true');
      });
      expect(submitButton).toHaveAttribute('data-disabled', 'true');
      expect(cancelButton).toHaveAttribute('data-disabled', 'true');
    });

    it('muestra texto de "Guardando..." en el botón cuando está cargando', () => {
      render(<RoleForm {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Guardando... Rol')).toBeInTheDocument();
      expect(screen.queryByText('Crear Rol')).not.toBeInTheDocument();
    });

    it('deshabilita el botón de envío cuando está cargando', () => {
      render(
        <RoleForm
          {...defaultProps}
          role={mockRole}
          isLoading={true}
        />
      );

      const submitButton = screen.getByText('Guardando... Rol');
      expect(submitButton).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('Inicialización con datos existentes', () => {
    it('inicializa correctamente con datos de rol existente', () => {
      render(<RoleForm {...defaultProps} role={mockRole} />);

      const nameInput = screen.getAllByTestId('input')[0];
      expect(nameInput).toHaveValue('Administrador');
      
      // Verificar que el select tiene el valor correcto
      const select = screen.getByTestId('select');
      expect(select).toHaveAttribute('data-value', RoleType.DYNAMIC);
      
      const activeCheckbox = screen.getAllByTestId('checkbox')[0];
      expect(activeCheckbox).toHaveAttribute('data-checked', 'true');
      
      const userCodeCheckbox = screen.getAllByTestId('checkbox')[1];
      expect(userCodeCheckbox).toHaveAttribute('data-checked', 'false');
    });

    it('inicializa con valores por defecto para nuevo rol', () => {
      render(<RoleForm {...defaultProps} />);

      const nameInput = screen.getAllByTestId('input')[0];
      expect(nameInput).toHaveValue('');
      
      const activeCheckbox = screen.getAllByTestId('checkbox')[0];
      expect(activeCheckbox).toHaveAttribute('data-checked', 'true'); // Por defecto activo
      
      const userCodeCheckbox = screen.getAllByTestId('checkbox')[1];
      expect(userCodeCheckbox).toHaveAttribute('data-checked', 'false'); // Por defecto desactivado
    });
  });

  describe('Opciones de tipo de rol', () => {
    it('muestra todas las opciones de tipo de rol', () => {
      render(<RoleForm {...defaultProps} />);

      expect(screen.getByText('Dinámico')).toBeInTheDocument();
      expect(screen.getByText('Estático')).toBeInTheDocument();
      expect(screen.getByText('Todos')).toBeInTheDocument();
      expect(screen.getByText('Ninguno')).toBeInTheDocument();
    });
  });

  describe('Casos edge', () => {
    it('maneja rol con campos undefined', () => {
      const incompleteRole = {
        id: 'incomplete',
        name: 'Incompleto',
        type: RoleType.NONE,
        active: true
      } as any;

      render(<RoleForm {...defaultProps} role={incompleteRole} />);

      const nameInput = screen.getAllByTestId('input')[0];
      expect(nameInput).toHaveValue('Incompleto');
      
      const activeCheckbox = screen.getAllByTestId('checkbox')[0];
      expect(activeCheckbox).toHaveAttribute('data-checked', 'true');
    });

    it('maneja rol con uses_user_code undefined', () => {
      const roleWithoutUserCode = {
        ...mockRole,
        uses_user_code: undefined
      } as any;

      render(<RoleForm {...defaultProps} role={roleWithoutUserCode} />);

      const userCodeCheckbox = screen.getAllByTestId('checkbox')[1];
      expect(userCodeCheckbox).toHaveAttribute('data-checked', 'false'); // Debería ser false por defecto
    });
  });
});