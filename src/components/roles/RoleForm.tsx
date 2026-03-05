import React, { useState, useEffect } from 'react';
import { ROLE_TYPE_LABELS } from '@/types/roles';
import { cn } from '@/lib/utils';
import { Save, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RoleType, RoleSource, CreateRoleRequest, UpdateRoleRequest } from '@/types/roles/index';
import { CreateRoleData, UpdateRoleData } from '@/lib/services/roles/types';

interface RoleFormProps {
  role?: {
    id: string;
    name: string;
    type: RoleType;
    source?: RoleSource;
    table?: string;
    field?: string;
    uses_user_code: boolean;
    user_code_table?: string;
    user_code_key?: string;
    user_code_value_col?: string;
    static_value?: string;
    active: boolean;
  };
  onSubmit: (data: CreateRoleData | UpdateRoleData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface RoleFormData {
  name: string;
  type: RoleType;
  source?: RoleSource;
  table?: string;
  field?: string;
  uses_user_code: boolean;
  user_code_table?: string;
  user_code_key?: string;
  user_code_value_col?: string;
  static_value?: string;
  active: boolean;
}

/**
 * Opciones para el selector de tipo de rol
 */
const roleTypeOptions: Array<{ value: RoleType; label: string; description: string }> = [
  {
    value: RoleType.DYNAMIC,
    label: 'Dinámico',
    description: 'Rol basado en datos dinámicos de la base de datos'
  },
  {
    value: RoleType.STATIC,
    label: 'Estático',
    description: 'Rol con valor fijo predefinido'
  },
  {
    value: RoleType.ALL,
    label: 'Todos',
    description: 'Incluye a todos los usuarios'
  },
  {
    value: RoleType.NONE,
    label: 'Ninguno',
    description: 'No incluye ningún usuario'
  }
];

/**
 * Función para validar los datos del formulario
 */
const validateForm = (data: RoleFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!data.name.trim()) {
    errors.name = 'El nombre del rol es requerido';
  } else if (data.name.length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres';
  }

  return errors;
};

/**
 * Componente de campo de entrada
 */
const FormField: React.FC<{
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, error, required, children }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * Componente principal del formulario de roles
 */
export const RoleForm: React.FC<RoleFormProps> = ({
  role,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || '',
    type: role?.type || RoleType.NONE,
    source: role?.source,
    table: role?.table || '',
    field: role?.field || '',
    uses_user_code: role?.uses_user_code ?? false,
    user_code_table: role?.user_code_table || '',
    user_code_key: role?.user_code_key || '',
    user_code_value_col: role?.user_code_value_col || '',
    static_value: role?.static_value || '',
    active: role?.active ?? true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validar formulario cuando cambien los datos
  useEffect(() => {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
  }, [formData]);

  const updateField = (field: keyof RoleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length === 0 && !isLoading) {
      onSubmit(formData);
    } else {
      setErrors(validationErrors);
    }
  };
  
  const isValid = Object.keys(errors).length === 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {role ? 'Editar Rol' : 'Crear Nuevo Rol'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <FormField label="Nombre del rol" error={errors.name} required>
               <Input
                 type="text"
                 value={formData.name}
                 onChange={(e) => updateField('name', e.target.value)}
                 placeholder="Ej: Administrador de Ventas"
                 disabled={isLoading}
               />
             </FormField>

             <FormField label="Tipo de rol" error={errors.type} required>
               <Select
                 value={formData.type}
                 onValueChange={(value) => updateField('type', value)}
                 disabled={isLoading}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Selecciona un tipo de rol" />
                 </SelectTrigger>
                 <SelectContent>
                   {roleTypeOptions.map(option => (
                     <SelectItem key={option.value} value={option.value}>
                       {option.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </FormField>

             <FormField label="Valor estático">
               <Input
                 type="text"
                 value={formData.static_value || ''}
                 onChange={(e) => updateField('static_value', e.target.value)}
                 placeholder="Valor para roles estáticos"
                 disabled={isLoading}
               />
             </FormField>
           </div>

           {/* Estado del rol */}
           <div className="flex items-center space-x-2">
             <Checkbox
               id="active"
               checked={formData.active}
               onCheckedChange={(checked) => updateField('active', checked)}
               disabled={isLoading}
             />
             <label htmlFor="active" className="text-sm">
               Rol activo
             </label>
           </div>

           {/* Configuración de código de usuario */}
           <div className="flex items-center space-x-2">
             <Checkbox
               id="uses_user_code"
               checked={formData.uses_user_code}
               onCheckedChange={(checked) => updateField('uses_user_code', checked)}
               disabled={isLoading}
             />
             <label htmlFor="uses_user_code" className="text-sm">
               Usa código de usuario
             </label>
           </div>

           {/* Botones de acción */}
           <div className="flex justify-end space-x-3 pt-6">
             <Button
               type="button"
               variant="outline"
               onClick={onCancel}
               disabled={isLoading}
             >
               <X className="h-4 w-4 mr-2" />
               Cancelar
             </Button>
             <Button
               type="submit"
               disabled={!isValid || isLoading}
             >
               <Save className="h-4 w-4 mr-2" />
               {isLoading ? 'Guardando...' : (role ? 'Actualizar' : 'Crear')} Rol
             </Button>
           </div>
         </form>
       </CardContent>
     </Card>
  );
};

export default RoleForm;