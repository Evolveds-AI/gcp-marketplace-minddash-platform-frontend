import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { ApiConfig, AuthType, HttpMethod } from '@/types/connectors';

interface ApiConnectorFormProps {
  config: ApiConfig;
  onChange: (config: ApiConfig) => void;
}

const ApiConnectorForm: React.FC<ApiConnectorFormProps> = ({ config, onChange }) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const updateConfig = (updates: Partial<ApiConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateAuth = (authUpdates: Partial<ApiConfig['authentication']>) => {
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

  const renderAuthFields = () => {
    switch (config.authentication?.type) {
      case AuthType.BEARER:
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

      case AuthType.BASIC:
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

      case AuthType.API_KEY:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showSecrets.apiKey ? 'text' : 'password'}
                  value={config.authentication?.credentials?.apiKey || ''}
                  onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, apiKey: e.target.value } })}
                  placeholder="Clave de API"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('apiKey')}
                >
                  {showSecrets.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="api-key-header">Header Name</Label>
              <Input
                id="api-key-header"
                value={config.authentication?.credentials?.headerName || 'X-API-Key'}
                onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, headerName: e.target.value } })}
                placeholder="Nombre del header (ej: X-API-Key)"
              />
            </div>
          </div>
        );

      case AuthType.OAUTH2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="oauth-client-id">Client ID</Label>
              <Input
                id="oauth-client-id"
                value={config.authentication?.credentials?.clientId || ''}
                onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, clientId: e.target.value } })}
                placeholder="ID del cliente OAuth2"
              />
            </div>
            <div>
              <Label htmlFor="oauth-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="oauth-client-secret"
                  type={showSecrets.clientSecret ? 'text' : 'password'}
                  value={config.authentication?.credentials?.clientSecret || ''}
                  onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, clientSecret: e.target.value } })}
                  placeholder="Secreto del cliente"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('clientSecret')}
                >
                  {showSecrets.clientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="oauth-token-url">Token URL</Label>
              <Input
                id="oauth-token-url"
                value={config.authentication?.credentials?.tokenUrl || ''}
                onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, tokenUrl: e.target.value } })}
                placeholder="URL para obtener el token"
              />
            </div>
            <div>
              <Label htmlFor="oauth-scope">Scope</Label>
              <Input
                id="oauth-scope"
                value={config.authentication?.credentials?.scope || ''}
                onChange={(e) => updateAuth({ credentials: { ...config.authentication?.credentials, scope: e.target.value } })}
                placeholder="Alcance de permisos (opcional)"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuración básica */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Configuración Básica</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="base-url">URL Base</Label>
            <Input
              id="base-url"
              value={config.baseUrl || ''}
              onChange={(e) => updateConfig({ baseUrl: e.target.value })}
              placeholder="https://api.ejemplo.com"
            />
          </div>
          
          <div>
            <Label htmlFor="timeout">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={config.timeout || 30000}
              onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) || 30000 })}
              placeholder="30000"
            />
          </div>

          <div>
            <Label htmlFor="methods">Métodos HTTP Permitidos</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.values(HttpMethod).map((method) => (
                <label key={method} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.methods?.[method.toLowerCase() as keyof typeof config.methods] || false}
                    onChange={(e) => {
                      updateConfig({ 
                        methods: {
                          ...config.methods,
                          [method.toLowerCase() as keyof ApiConfig['methods']]: e.target.checked
                        }
                      });
                    }}
                  />
                  <span className="text-sm">{method}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Autenticación */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Autenticación</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="auth-type">Tipo de Autenticación</Label>
            <select
              id="auth-type"
              value={config.authentication?.type || AuthType.NONE}
              onChange={(e) => updateAuth({ type: e.target.value as AuthType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={AuthType.NONE}>Sin autenticación</option>
              <option value={AuthType.BEARER}>Bearer Token</option>
              <option value={AuthType.BASIC}>Basic Auth</option>
              <option value={AuthType.API_KEY}>API Key</option>
              <option value={AuthType.OAUTH2}>OAuth 2.0</option>
            </select>
          </div>
          
          {renderAuthFields()}
        </div>
      </Card>

      {/* Headers personalizados */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Headers Personalizados</h4>
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
                placeholder="Valor del header"
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
      </Card>

      {/* Configuración avanzada */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Configuración Avanzada</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="retry-attempts">Intentos de Reintento</Label>
            <Input
              id="retry-attempts"
              type="number"
              value={config.retryPolicy?.maxRetries || 3}
              onChange={(e) => updateConfig({
                retryPolicy: {
                  maxRetries: parseInt(e.target.value) || 3,
                  backoffMultiplier: config.retryPolicy?.backoffMultiplier || 2,
                  retryDelay: config.retryPolicy?.retryDelay || 1000
                }
              })}
              placeholder="3"
            />
          </div>
          
          <div>
            <Label htmlFor="retry-delay">Delay entre Reintentos (ms)</Label>
            <Input
              id="retry-delay"
              type="number"
              value={config.retryPolicy?.retryDelay || 1000}
              onChange={(e) => updateConfig({
                retryPolicy: {
                  maxRetries: config.retryPolicy?.maxRetries || 3,
                  backoffMultiplier: config.retryPolicy?.backoffMultiplier || 2,
                  retryDelay: parseInt(e.target.value) || 1000
                }
              })}
              placeholder="1000"
            />
          </div>

          <div>
            <Label htmlFor="data-transformation">Transformación de Datos (JSONPath)</Label>
            <Textarea
              id="data-transformation"
              value={config.dataTransformation?.responseTransform || ''}
              onChange={(e) => updateConfig({
                dataTransformation: {
                  ...config.dataTransformation,
                  responseTransform: e.target.value
                }
              })}
              placeholder="$.data[*] - Expresión JSONPath para extraer datos"
              rows={3}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ApiConnectorForm;