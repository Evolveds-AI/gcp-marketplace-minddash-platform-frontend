'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  useUserRoles, 
  useAssignRole, 
  useUnassignRole, 
  useProductRoles,
  useBulkUpdateUserRoles 
} from '@/hooks/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Save, 
  User,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface UserRolesPageProps {}

export default function UserRolesPage({}: UserRolesPageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  const userId = params?.userId as string;

  // Estados locales
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    toAdd: string[];
    toRemove: string[];
  }>({ toAdd: [], toRemove: [] });

  // Queries y mutations
  const {
    data: userRolesData,
    isLoading: isLoadingUserRoles,
    error: userRolesError,
    refetch: refetchUserRoles
  } = useUserRoles(productId, userId);

  const {
    data: allRolesData,
    isLoading: isLoadingAllRoles
  } = useProductRoles(productId, {
    page: 1,
    limit: 100,
    active: true
  });

  const assignRoleMutation = useAssignRole(productId);
  const unassignRoleMutation = useUnassignRole(productId);
  const bulkUpdateMutation = useBulkUpdateUserRoles(productId);

  // Efectos
  useEffect(() => {
    if (userRolesData?.roles) {
      const currentRoleIds = userRolesData.roles.map(role => role.roleId);
      setSelectedRoles(currentRoleIds);
    }
  }, [userRolesData]);

  // Handlers
  const handleBack = () => {
    router.push(`/products/${productId}/users`);
  };

  const handleAssignRole = async (roleId: string) => {
    try {
      await assignRoleMutation.mutateAsync({
        userId: userId,
        roleId: roleId,
        productId: productId
      });
      
      toast.success('El rol se ha asignado correctamente al usuario.');
      
      refetchUserRoles();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo asignar el rol al usuario.');
    }
  };

  const handleUnassignRole = async (roleId: string) => {
    try {
      await unassignRoleMutation.mutateAsync({
        userId,
        roleId
      });
      
      toast.success('El rol se ha removido correctamente del usuario.');
      
      refetchUserRoles();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo remover el rol del usuario.');
    }
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const currentUserRoleIds = userRolesData?.roles?.map(role => role.roleId) || [];
    
    if (checked) {
      setSelectedRoles(prev => [...prev, roleId]);
      if (!currentUserRoleIds.includes(roleId)) {
        setPendingChanges(prev => ({
          toAdd: [...prev.toAdd.filter(id => id !== roleId), roleId],
          toRemove: prev.toRemove.filter(id => id !== roleId)
        }));
      }
    } else {
      setSelectedRoles(prev => prev.filter(id => id !== roleId));
      if (currentUserRoleIds.includes(roleId)) {
        setPendingChanges(prev => ({
          toAdd: prev.toAdd.filter(id => id !== roleId),
          toRemove: [...prev.toRemove.filter(id => id !== roleId), roleId]
        }));
      }
    }
  };

  const handleBulkUpdate = async () => {
    try {
      await bulkUpdateMutation.mutateAsync({
        userId,
        rolesToAssign: pendingChanges.toAdd,
        rolesToUnassign: pendingChanges.toRemove
      });
      
      toast.success('Los roles del usuario se han actualizado correctamente.');
      
      setPendingChanges({ toAdd: [], toRemove: [] });
      setIsBulkUpdateDialogOpen(false);
      refetchUserRoles();
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron actualizar los roles del usuario.');
    }
  };

  const resetChanges = () => {
    if (userRolesData?.roles) {
      const currentRoleIds = userRolesData.roles.map(role => role.roleId);
      setSelectedRoles(currentRoleIds);
    }
    setPendingChanges({ toAdd: [], toRemove: [] });
  };

  // Estados de carga
  if (isLoadingUserRoles || isLoadingAllRoles) {
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

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Estado de error
  if (userRolesError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <Shield className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">Error al cargar roles del usuario</p>
              <p className="text-sm mt-2">
                {userRolesError?.message || 'No se pudieron cargar los roles del usuario'}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Button 
                  onClick={() => refetchUserRoles()} 
                  variant="outline"
                >
                  Reintentar
                </Button>
                <Button 
                  onClick={handleBack}
                  variant="default"
                >
                  Volver a Usuarios
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
// Estados derivados
  const userRoles = userRolesData?.roles || [];
  const allRoles = allRolesData?.roles || [];
  
  // Helper para obtener datos completos del rol
  const getRoleData = (roleId: string) => {
    return allRoles.find(role => role.id === roleId);
  };
  
  // Roles del usuario con datos completos
  const userRolesWithData = userRoles.map(userRole => ({
    ...userRole,
    roleData: getRoleData(userRole.roleId)
  }));
  
  const availableRoles = allRoles.filter(role => 
    !userRoles.some(userRole => userRole.roleId === role.id)
  );

  const hasChanges = pendingChanges.toAdd.length > 0 || pendingChanges.toRemove.length > 0;

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
          Volver a Usuarios
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Roles de Usuario</h1>
          <p className="text-muted-foreground mt-2">
            Administra los roles asignados a este usuario en el producto
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={resetChanges}
              className="flex items-center gap-2"
            >
              Cancelar Cambios
            </Button>
            <Button 
              onClick={() => setIsBulkUpdateDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        )}
      </div>

      {/* Información del usuario */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Usuario ID: {userId}</p>
              <p className="text-sm text-muted-foreground">
                {userRoles.length} {userRoles.length === 1 ? 'rol asignado' : 'roles asignados'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles actuales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles Asignados
            </CardTitle>
            <CardDescription>
              Roles que actualmente tiene asignados el usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRoles.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-semibold">Sin roles asignados</p>
                <p className="text-muted-foreground mt-2">
                  Este usuario no tiene roles asignados en este producto
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userRolesWithData.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="default">{role.roleData?.name || 'Rol no encontrado'}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {role.roleData?.type || 'N/A'}
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={unassignRoleMutation.isPending}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Remover rol?</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de que quieres remover el rol "{role.roleData?.name || 'este rol'}" de este usuario?
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleUnassignRole(role.roleId)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remover Rol
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roles disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Roles Disponibles
            </CardTitle>
            <CardDescription>
              Roles que se pueden asignar al usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableRoles.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-semibold">Todos los roles asignados</p>
                <p className="text-muted-foreground mt-2">
                  Este usuario ya tiene todos los roles disponibles
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableRoles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{role.name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {role.type}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleAssignRole(role.id)}
                      disabled={assignRoleMutation.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gestión masiva de roles */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión Masiva de Roles</CardTitle>
          <CardDescription>
            Selecciona todos los roles que debe tener el usuario y aplica los cambios de una vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allRoles.map((role) => {
                const isSelected = selectedRoles.includes(role.id);
                const isCurrentlyAssigned = userRoles.some(ur => ur.roleId === role.id);
                const willBeAdded = pendingChanges.toAdd.includes(role.id);
                const willBeRemoved = pendingChanges.toRemove.includes(role.id);
                
                return (
                  <div key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={`role-${role.id}`} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {role.name}
                      </label>
                      <div className="flex gap-1 mt-1">
                        {isCurrentlyAssigned && !willBeRemoved && (
                          <Badge variant="default" className="text-xs">Actual</Badge>
                        )}
                        {willBeAdded && (
                          <Badge variant="secondary" className="text-xs text-green-600">+Agregar</Badge>
                        )}
                        {willBeRemoved && (
                          <Badge variant="secondary" className="text-xs text-red-600">-Remover</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {hasChanges && (
              <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Tienes cambios pendientes
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {pendingChanges.toAdd.length > 0 && `${pendingChanges.toAdd.length} roles para agregar`}
                    {pendingChanges.toAdd.length > 0 && pendingChanges.toRemove.length > 0 && ', '}
                    {pendingChanges.toRemove.length > 0 && `${pendingChanges.toRemove.length} roles para remover`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetChanges}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => setIsBulkUpdateDialogOpen(true)}>
                    Aplicar Cambios
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmación para actualización masiva */}
      <AlertDialog open={isBulkUpdateDialogOpen} onOpenChange={setIsBulkUpdateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambios de roles</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres aplicar los siguientes cambios?
              <div className="mt-4 space-y-2">
                {pendingChanges.toAdd.length > 0 && (
                  <div>
                    <p className="font-medium text-green-600">Roles a agregar:</p>
                    <ul className="list-disc list-inside text-sm">
                      {pendingChanges.toAdd.map(roleId => {
                        const role = allRoles.find(r => r.id === roleId);
                        return <li key={roleId}>{role?.name}</li>;
                      })}
                    </ul>
                  </div>
                )}
                {pendingChanges.toRemove.length > 0 && (
                  <div>
                    <p className="font-medium text-red-600">Roles a remover:</p>
                    <ul className="list-disc list-inside text-sm">
                      {pendingChanges.toRemove.map(roleId => {
                        const role = allRoles.find(r => r.id === roleId);
                        return <li key={roleId}>{role?.name}</li>;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkUpdate}
              disabled={bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? 'Aplicando...' : 'Aplicar Cambios'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}