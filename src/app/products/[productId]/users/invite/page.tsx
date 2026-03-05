'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProductRoles } from '@/hooks/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, 
  Mail, 
  UserPlus, 
  Send,
  Users,
  Shield,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// Schema de validación
const inviteUserSchema = z.object({
  emails: z.array(z.string().email('Email inválido')).min(1, 'Debe agregar al menos un email'),
  roleIds: z.array(z.string()).optional(),
  message: z.string().optional(),
  sendWelcomeEmail: z.boolean(),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;

interface InviteUsersPageProps {}

export default function InviteUsersPage({}: InviteUsersPageProps) {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;

  // Estados locales
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      emails: [],
      roleIds: [],
      message: '',
      sendWelcomeEmail: true,
    },
  });

  const { watch, setValue, getValues } = form;
  const emails = watch('emails');
  const selectedRoleIds = watch('roleIds');

  // Query para obtener roles disponibles
  const {
    data: rolesData,
    isLoading: isLoadingRoles
  } = useProductRoles(productId, {
    page: 1,
    limit: 100,
    active: true
  });

  // Handlers
  const handleBack = () => {
    router.push(`/products/${productId}/users`);
  };

  const handleAddEmail = () => {
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) return;

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Por favor ingresa un email válido.');
      return;
    }

    // Verificar si ya existe
    if (emails.includes(trimmedEmail)) {
      toast.error('Este email ya está en la lista.');
      return;
    }

    setValue('emails', [...emails, trimmedEmail]);
    setEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setValue('emails', emails.filter(email => email !== emailToRemove));
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const currentRoles = selectedRoleIds || [];
    if (checked) {
      setValue('roleIds', [...currentRoles, roleId]);
    } else {
      setValue('roleIds', currentRoles.filter(id => id !== roleId));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const onSubmit = async (data: InviteUserForm) => {
    setIsSubmitting(true);
    try {
      // Aquí iría la llamada a la API para enviar las invitaciones
      // Por ahora simulamos la llamada
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Se han enviado ${data.emails.length} invitaciones correctamente.`);
      
      // Redirigir de vuelta a la lista de usuarios
      router.push(`/products/${productId}/users`);
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron enviar las invitaciones.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estado de carga
  if (isLoadingRoles) {
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
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          Volver a Usuarios
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Invitar Usuarios</h1>
          <p className="text-muted-foreground mt-2">
            Invita nuevos usuarios al producto y asigna roles iniciales
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Agregar emails */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Emails de Invitación
                </CardTitle>
                <CardDescription>
                  Agrega los emails de los usuarios que quieres invitar al producto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input para agregar emails */}
                <div className="flex gap-2">
                  <Input
                    placeholder="email@ejemplo.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddEmail}
                    disabled={!emailInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Lista de emails agregados */}
                {emails.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Usuarios a invitar ({emails.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {emails.map((email, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-2">
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="emails"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Selección de roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles Iniciales (Opcional)
                </CardTitle>
                <CardDescription>
                  Selecciona los roles que se asignarán automáticamente a los usuarios invitados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roles.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold">No hay roles disponibles</p>
                    <p className="text-muted-foreground mt-2">
                      Los usuarios serán invitados sin roles asignados
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoleIds?.includes(role.id) || false}
                          onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={`role-${role.id}`} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {role.name}
                          </label>
                          {role.type && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {role.type}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mensaje personalizado */}
            <Card>
              <CardHeader>
                <CardTitle>Mensaje de Bienvenida (Opcional)</CardTitle>
                <CardDescription>
                  Personaliza el mensaje que recibirán los usuarios invitados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Escribe un mensaje personalizado para los usuarios invitados..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Este mensaje se incluirá en el email de invitación
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Opciones adicionales */}
            <Card>
              <CardHeader>
                <CardTitle>Opciones de Invitación</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="sendWelcomeEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Enviar email de bienvenida
                        </FormLabel>
                        <FormDescription>
                          Los usuarios recibirán un email con instrucciones para acceder al producto
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Resumen de la invitación */}
            {emails.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">
                        Resumen de la invitación
                      </p>
                      <div className="text-sm text-blue-700 mt-2 space-y-1">
                        <p>• {emails.length} {emails.length === 1 ? 'usuario será invitado' : 'usuarios serán invitados'}</p>
                        <p>• {selectedRoleIds?.length || 0} {(selectedRoleIds?.length || 0) === 1 ? 'rol será asignado' : 'roles serán asignados'}</p>
                        <p>• {watch('sendWelcomeEmail') ? 'Se enviará' : 'No se enviará'} email de bienvenida</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botones de acción */}
            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={emails.length === 0 || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Invitaciones
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}