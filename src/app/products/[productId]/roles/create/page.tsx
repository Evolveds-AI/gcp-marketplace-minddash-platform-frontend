'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCreateRole } from '@/hooks/roles';
import { RoleForm } from '@/components/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { CreateRoleData, UpdateRoleData } from '@/lib/services/roles/types';

interface CreateRolePageProps {}

export default function CreateRolePage({}: CreateRolePageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  
  const createRoleMutation = useCreateRole(productId);

  const handleBack = () => {
    router.push(`/products/${productId}/roles`);
  };

  const handleSubmit = async (data: CreateRoleData | UpdateRoleData) => {
    try {
      await createRoleMutation.mutateAsync(data as CreateRoleData);
      
      toast.success('Rol creado exitosamente');
      router.push(`/products/${productId}/roles`);
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error(error.message || 'Error al crear el rol');
    }
  };

  const handleCancel = () => {
    router.push(`/products/${productId}/roles`);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Roles
        </Button>
        <div className="h-6 w-px bg-border" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Rol</h1>
          <p className="text-muted-foreground mt-2">
            Define un nuevo rol con sus permisos y configuraciones
          </p>
        </div>
      </div>

      {/* Formulario de creación */}
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Información del Rol</CardTitle>
            <CardDescription>
              Completa los datos para crear el nuevo rol. Los campos marcados con * son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={createRoleMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <div className="max-w-2xl">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Información sobre Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-sm">Tipos de Rol:</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>Administrador:</strong> Acceso completo a todas las funciones</li>
                <li><strong>Editor:</strong> Puede crear y modificar contenido</li>
                <li><strong>Visualizador:</strong> Solo puede ver contenido</li>
                <li><strong>Personalizado:</strong> Permisos específicos definidos manualmente</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm">Permisos Disponibles:</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Los permisos se asignan automáticamente según el tipo de rol seleccionado, 
                pero pueden ser personalizados para roles de tipo "Personalizado".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}