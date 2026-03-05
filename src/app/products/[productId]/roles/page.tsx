'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { RolesList, RoleTypeBadge } from '@/components/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Filter } from 'lucide-react';
import { ProductRole } from '@/types/roles/index';

interface RolesPageProps {}

export default function RolesPage({}: RolesPageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'DYNAMIC' | 'STATIC'>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);



  const handleCreateRole = () => {
    router.push(`/products/${productId}/roles/create`);
  };

  const handleEditRole = (role: ProductRole) => {
    router.push(`/products/${productId}/roles/${role.id}/edit`);
  };

  const handleDeleteRole = (roleId: string) => {
    // TODO: Implementar confirmación y eliminación de rol
    console.log('Delete role:', roleId);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleTypeFilter = (value: string) => {
    setSelectedType(value as 'all' | 'DYNAMIC' | 'STATIC');
  };

  const handleStatusFilter = (value: string) => {
    setShowActiveOnly(value === 'active');
  };



  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Roles</h1>
          <p className="text-muted-foreground mt-2">
            Administra los roles y permisos del producto
          </p>
        </div>
        <Button onClick={handleCreateRole} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Crear Rol
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtra y busca roles específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar roles..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por tipo */}
            <Select value={selectedType} onValueChange={handleTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="DYNAMIC">Dinámico</SelectItem>
                <SelectItem value="STATIC">Estático</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por estado */}
            <Select value={showActiveOnly ? 'active' : 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Solo activos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de roles */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Roles del Producto</CardTitle>
              <CardDescription>
                Gestiona los roles y permisos del producto
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RolesList
            productId={productId}
            onEdit={handleEditRole}
            onDelete={handleDeleteRole}
          />
          

        </CardContent>
      </Card>
    </div>
  );
}