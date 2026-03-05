'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProductUsers, useProductRoles } from '@/hooks/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  UserPlus, 
  Settings,
  ArrowLeft,
  Users,
  Filter
} from 'lucide-react';

interface ProductUsersPageProps {}

export default function ProductUsersPage({}: ProductUsersPageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;

  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Queries
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useProductUsers(productId, {
    page: currentPage,
    limit,
    search: searchTerm || undefined,
    roleId: selectedRole !== 'all' ? selectedRole : undefined,
  });

  const {
    data: rolesData,
    isLoading: isLoadingRoles
  } = useProductRoles(productId, {
    page: 1,
    limit: 100, // Obtener todos los roles para el filtro
    active: true
  });

  const handleBack = () => {
    router.push(`/products/${productId}`);
  };

  const handleManageUserRoles = (userId: string) => {
    router.push(`/products/${productId}/users/${userId}/roles`);
  };

  const handleAddUser = () => {
    router.push(`/products/${productId}/users/invite`);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset a la primera página
  };

  const handleRoleFilter = (roleId: string) => {
    setSelectedRole(roleId);
    setCurrentPage(1); // Reset a la primera página
  };

  // Estados de carga
  if (isLoadingUsers || isLoadingRoles) {
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

        {/* Filters skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado de error
  if (usersError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">Error al cargar usuarios</p>
              <p className="text-sm mt-2">
                {usersError?.message || 'No se pudieron cargar los usuarios del producto'}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Button 
                  onClick={() => refetchUsers()} 
                  variant="outline"
                >
                  Reintentar
                </Button>
                <Button 
                  onClick={handleBack}
                  variant="default"
                >
                  Volver al Producto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const users = usersData?.data || [];
  const totalUsers = usersData?.total || 0;
  const totalPages = usersData?.totalPages || 0;
  const roles = rolesData?.roles || [];

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
          Volver al Producto
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-2">
            Administra los usuarios y sus roles en este producto
          </p>
        </div>
        <Button onClick={handleAddUser} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invitar Usuario
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar usuarios por nombre o email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedRole} onValueChange={handleRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Total de usuarios
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles && u.roles.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Con roles asignados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => !u.roles || u.roles.length === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Sin roles asignados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Producto</CardTitle>
          <CardDescription>
            Lista de todos los usuarios con acceso a este producto y sus roles asignados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No hay usuarios</p>
              <p className="text-muted-foreground mt-2">
                {searchTerm || selectedRole !== 'all' 
                  ? 'No se encontraron usuarios con los filtros aplicados'
                  : 'Aún no hay usuarios asignados a este producto'
                }
              </p>
              {(!searchTerm && selectedRole === 'all') && (
                <Button 
                  onClick={handleAddUser} 
                  className="mt-4"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invitar primer usuario
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Roles Asignados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="w-[50px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name || user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role: any) => (
                            <Badge key={role.id} variant="secondary" className="text-xs">
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Sin roles
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString('es-ES')
                          : 'Nunca'
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleManageUserRoles(user.id)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Gestionar Roles
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * limit) + 1} a {Math.min(currentPage * limit, totalUsers)} de {totalUsers} usuarios
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}