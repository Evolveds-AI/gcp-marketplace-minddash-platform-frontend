import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { WebhookConfig, WebhookMethod, WebhookAuthType } from '@/types/connectors';
import { toast } from 'sonner';

interface WebhookConnectorFormProps {
  config: WebhookConfig;
  onChange: (config: WebhookConfig) => void;
  connectorId?: string;
}

const WebhookConnectorForm: React.FC<WebhookConnectorFormProps> = ({ 
  config, 
  onChange, 
  connectorId 
}) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const updateConfig = (updates: Partial<WebhookConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateAuth = (authUpdates: Partial<WebhookConfig['authentication']>) => {
    updateConfig({
      authentication: { 
        type: config.authentication?.type || 'bearer',
        credentials: config.authentication?.credentials || {},
        ...config.authentication, 
        ...authUpdates 
      }
    });
  };

  const updateHeaders = (headers: Record<string, string>) => {
    updateConfig({ headers });
  };

  const addHeader = () => {
    const headers = config.headers || {};
    headers[''] = '';
    updateHeaders(headers);
  };

  const removeHeader = (key: string) => {
    const headers = { ...config.headers };
    delete headers[key];
    updateHeaders(headers);
  };

  const updateHeaderKey = (oldKey: string, newKey: string) => {
    const headers = { ...config.headers };
    const value = headers[oldKey];
    delete headers[oldKey];
    headers[newKey] = value;
    updateHeaders(headers);
  };

  const updateHeaderValue = (key: string, value: string) => {
    const headers = { ...config.headers };
    headers[key] = value;
    updateHeaders(headers);
  };

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  const generateWebhookUrl = () => {
    if (!connectorId) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com';
    return `${baseUrl}/api/webhooks/${connectorId}`;
  };

  const renderAuthFields = () => {
    switch (config.authentication?.type) {
      case WebhookAuthType.SIGNATURE:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-secret">Secret para Firma</Label>
              <div className="relative">
                <Input
                  id="webhook-secret"
                  type={showSecrets.webhookSecret ? 'text' : 'password'}
                  value={config.authentication?.credentials?.secret || ''}
                  onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, secret: e.target.value } })}
                  placeholder="Secreto para validar la firma del webhook"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('webhookSecret')}
                >
                  {showSecrets.webhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="signature-header">Header de Firma</Label>
              <Input
                id="signature-header"
                value={config.authentication?.credentials?.signatureHeader || 'X-Hub-Signature-256'}
                onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, signatureHeader: e.target.value } })}
                placeholder="Nombre del header que contiene la firma"
              />
            </div>
            <div>
              <Label htmlFor="signature-algorithm">Algoritmo de Firma</Label>
              <select
                id="signature-algorithm"
                value={config.authentication?.credentials?.algorithm || 'sha256'}
                onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, algorithm: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="sha1">SHA-1</option>
                <option value="sha256">SHA-256</option>
                <option value="sha512">SHA-512</option>
              </select>
            </div>
          </div>
        );

      case WebhookAuthType.BEARER:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bearer-token">Bearer Token</Label>
              <div className="relative">
                <Input
                  id="bearer-token"
                  type={showSecrets.bearerToken ? 'text' : 'password'}
                  value={config.authentication?.credentials?.token || ''}
                  onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, token: e.target.value } })}
                  placeholder="Token de autenticación"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('bearerToken')}
                >
                  {showSecrets.bearerToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        );

      case WebhookAuthType.BASIC:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="basic-username">Usuario</Label>
              <Input
                id="basic-username"
                value={config.authentication?.credentials?.username || ''}
                onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, username: e.target.value } })}
                placeholder="Nombre de usuario"
              />
            </div>
            <div>
              <Label htmlFor="basic-password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="basic-password"
                  type={showSecrets.basicPassword ? 'text' : 'password'}
                  value={config.authentication?.credentials?.password || ''}
                  onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, password: e.target.value } })}
                  placeholder="Contraseña"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('basicPassword')}
                >
                  {showSecrets.basicPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* URL del Webhook */}
      {connectorId && (
        <Card className="p-4 bg-blue-50">
          <h4 className="font-medium mb-2">URL del Webhook</h4>
          <div className="flex items-center gap-2">
            <Input
              value={generateWebhookUrl()}
              readOnly
              className="flex-1 bg-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(generateWebhookUrl(), 'webhookUrl')}
            >
              {copiedField === 'webhookUrl' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Usa esta URL para configurar el webhook en el servicio externo
          </p>
        </Card>
      )}

      {/* Configuración básica */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Configuración Básica</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="webhook-url">URL del Webhook</Label>
            <Input
              id="webhook-url"
              value={config.url || ''}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="https://mi-app.com/webhook-endpoint"
            />
          </div>
          
          <div>
            <Label htmlFor="webhook-method">Método HTTP</Label>
            <select
              id="webhook-method"
              value={config.method || 'POST'}
              onChange={(e) => updateConfig({ method: e.target.value as WebhookConfig['method'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div>
            <Label htmlFor="webhook-timeout">Timeout (ms)</Label>
            <Input
              id="webhook-timeout"
              type="number"
              value={config.timeout || 30000}
              onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) || 30000 })}
              placeholder="30000"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="webhook-async"
              checked={config.async || false}
              onChange={(e) => updateConfig({ async: e.target.checked })}
            />
            <Label htmlFor="webhook-async">Procesamiento Asíncrono</Label>
          </div>
        </div>
      </Card>

      {/* Autenticación */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Autenticación</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="webhook-auth-type">Tipo de Autenticación</Label>
            <select
              id="webhook-auth-type"
              value={config.authentication?.type || WebhookAuthType.NONE}
              onChange={(e) => updateAuth({ type: e.target.value as WebhookAuthType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={WebhookAuthType.NONE}>Sin autenticación</option>
              <option value={WebhookAuthType.SIGNATURE}>Validación de Firma</option>
              <option value={WebhookAuthType.BEARER}>Bearer Token</option>
              <option value={WebhookAuthType.BASIC}>Basic Auth</option>
            </select>
          </div>
          
          {renderAuthFields()}
        </div>
      </Card>

      {/* Headers personalizados */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Headers Requeridos</h4>
          <Button type="button" variant="outline" size="sm" onClick={addHeader}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar Header
          </Button>
        </div>
        
        <div className="space-y-2">
          {Object.entries(config.headers || {}).map(([key, value], index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={key}
                onChange={(e) => updateHeaderKey(key, e.target.value)}
                placeholder="Nombre del header"
                className="flex-1"
              />
              <Input
                value={value}
                onChange={(e) => updateHeaderValue(key, e.target.value)}
                placeholder="Valor esperado"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeHeader(key)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Headers que deben estar presentes en las peticiones del webhook
        </p>
      </Card>

      {/* Configuración de Cola (si es asíncrono) */}
      {config.async && (
        <Card className="p-4">
          <h4 className="font-medium mb-4">Configuración de Cola</h4>
          <div className="space-y-4">
            <div>
              <Label htmlFor="queue-priority">Prioridad de la Cola</Label>
              <select
                id="queue-priority"
                value={config.queueConfig?.priority || 'normal'}
                onChange={(e) => updateConfig({
                  queueConfig: {
                    priority: e.target.value as 'low' | 'normal' | 'high',
                    delay: config.queueConfig?.delay || 0,
                    attempts: config.queueConfig?.attempts || 3
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="queue-delay">Delay de Procesamiento (ms)</Label>
              <Input
                id="queue-delay"
                type="number"
                value={config.queueConfig?.delay || 0}
                onChange={(e) => updateConfig({
                  queueConfig: {
                    priority: config.queueConfig?.priority || 'normal',
                    delay: parseInt(e.target.value) || 0,
                    attempts: config.queueConfig?.attempts || 3
                  }
                })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="queue-attempts">Intentos de Reintento</Label>
              <Input
                id="queue-attempts"
                type="number"
                value={config.queueConfig?.attempts || 3}
                onChange={(e) => updateConfig({
                  queueConfig: {
                    priority: config.queueConfig?.priority || 'normal',
                    delay: config.queueConfig?.delay || 0,
                    attempts: parseInt(e.target.value) || 3
                  }
                })}
                placeholder="3"
              />
            </div>

            <div>
              <Label htmlFor="queue-retry-delay">Delay entre Reintentos (ms)</Label>
              <Input
                id="queue-retry-delay"
                type="number"
                value={config.retryPolicy?.retryDelay || 5000}
                onChange={(e) => updateConfig({ 
                  retryPolicy: {
                    ...config.retryPolicy,
                    maxRetries: config.retryPolicy?.maxRetries || 3,
                    backoffMultiplier: config.retryPolicy?.backoffMultiplier || 2,
                    retryDelay: parseInt(e.target.value) || 5000
                  }
                })}
                placeholder="5000"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Configuración de validación de firma */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Validación de Firma</h4>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="signature-validation-enabled"
              checked={config.signatureValidation?.enabled || false}
              onChange={(e) => updateConfig({ 
                signatureValidation: {
                  ...config.signatureValidation,
                  enabled: e.target.checked,
                  algorithm: config.signatureValidation?.algorithm || 'sha256',
                  secretKey: config.signatureValidation?.secretKey || '',
                  headerName: config.signatureValidation?.headerName || 'X-Hub-Signature-256'
                }
              })}
            />
            <Label htmlFor="signature-validation-enabled">Habilitar Validación de Firma</Label>
          </div>

          {config.signatureValidation?.enabled && (
            <>
              <div>
                <Label htmlFor="signature-algorithm">Algoritmo</Label>
                <select
                   id="signature-algorithm"
                   value={config.signatureValidation?.algorithm || 'sha256'}
                   onChange={(e) => updateConfig({
                     signatureValidation: {
                       enabled: config.signatureValidation?.enabled || false,
                       algorithm: e.target.value as 'sha1' | 'sha256' | 'md5',
                       secretKey: config.signatureValidation?.secretKey || '',
                       headerName: config.signatureValidation?.headerName || 'X-Hub-Signature-256'
                     }
                   })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="sha1">SHA1</option>
                  <option value="sha256">SHA256</option>
                  <option value="md5">MD5</option>
                </select>
              </div>

              <div>
                <Label htmlFor="signature-secret">Clave Secreta</Label>
                <Input
                   id="signature-secret"
                   type="password"
                   value={config.signatureValidation?.secretKey || ''}
                   onChange={(e) => updateConfig({
                     signatureValidation: {
                       enabled: config.signatureValidation?.enabled || false,
                       algorithm: config.signatureValidation?.algorithm || 'sha256',
                       secretKey: e.target.value,
                       headerName: config.signatureValidation?.headerName || 'X-Hub-Signature-256'
                     }
                   })}
                  placeholder="Clave secreta para validar la firma"
                />
              </div>

              <div>
                <Label htmlFor="signature-header">Nombre del Header</Label>
                <Input
                   id="signature-header"
                   value={config.signatureValidation?.headerName || 'X-Hub-Signature-256'}
                   onChange={(e) => updateConfig({
                     signatureValidation: {
                       enabled: config.signatureValidation?.enabled || false,
                       algorithm: config.signatureValidation?.algorithm || 'sha256',
                       secretKey: config.signatureValidation?.secretKey || '',
                       headerName: e.target.value
                     }
                   })}
                  placeholder="X-Hub-Signature-256"
                />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default WebhookConnectorForm;