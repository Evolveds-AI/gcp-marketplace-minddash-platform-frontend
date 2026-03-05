'use client';

import { useParams, useRouter } from 'next/navigation';
import { useProductRole, useUpdateRole } from '@/hooks/roles';
import { RoleForm } from '@/components/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CreateRoleData, UpdateRoleData } from '@/lib/services/roles/types';
import { UpdateRoleRequest } from '@/types/roles/index';

interface EditRolePageProps {}

export default function EditRolePage({}: EditRolePageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  const roleId = params?.roleId as string;
  
  const {
    data: role,
    isLoading: isLoadingRole,
    error: roleError,
    refetch
  } = useProductRole(productId, roleId);
  
  const updateRoleMutation = useUpdateRole(productId);

  const handleBack = () => {
    router.push(`/products/${productId}/roles`);
  };

  const handleSubmit = async (data: CreateRoleData | UpdateRoleData) => {
    try {
      const updateData: UpdateRoleRequest = {
        id: roleId,
        ...data
      };
      
      await updateRoleMutation.mutateAsync({
        roleId: roleId,
        roleData: updateData
      });
      
      toast.success('Rol actualizado exitosamente');
      router.push(`/products/${productId}/roles`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Error al actualizar el rol');
    }
  };

  const handleCancel = () => {
    router.push(`/products/${productId}/roles`);
  };

  // Estado de carga
  if (isLoadingRole) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <div className="h-6 w-px bg-border" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        {/* Form skeleton */}
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Estado de error
  if (roleError || !role) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">Error al cargar el rol</p>
              <p className="text-sm mt-2">
                {roleError?.message || 'No se pudo encontrar el rol especificado'}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Button 
                  onClick={() => refetch()} 
                  variant="outline"
                >
                  Reintentar
                </Button>
                <Button 
                  onClick={handleBack}
                  variant="default"
                >
                  Volver a Roles
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Editar Rol</h1>
          <p className="text-muted-foreground mt-2">
            Modifica la configuración y permisos del rol "{role.name}"
          </p>
        </div>
      </div>

      {/* Formulario de edición */}
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Información del Rol</CardTitle>
            <CardDescription>
              Actualiza los datos del rol. Los campos marcados con * son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleForm
              role={{
                id: role.id,
                name: role.name,
                type: role.type,
                source: role.source,
                table: role.table,
                field: role.field,
                uses_user_code: role.uses_user_code,
                user_code_table: role.user_code_table,
                user_code_key: role.user_code_key,
                user_code_value_col: role.user_code_value_col,
                static_value: role.static_value,
                active: role.active
              }}
              onSubmit={handleSubmit}
              onCancel={handleBack}
              isLoading={updateRoleMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Información del rol */}
      <div className="max-w-2xl">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Información del Rol Actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">ID del Rol:</span>
                <p className="text-muted-foreground font-mono">{role.id}</p>
              </div>
              <div>
                <span className="font-medium">Fecha de Creación:</span>
                <p className="text-muted-foreground">
                  {new Date(role.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <span className="font-medium">Última Actualización:</span>
                <p className="text-muted-foreground">
                  {new Date(role.updated_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <span className="font-medium">Estado:</span>
                <p className={`font-medium ${
                  role.active ? 'text-green-600' : 'text-red-600'
                }`}>
                  {role.active ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}