import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Copy,
  Download
} from 'lucide-react';
import { ConnectorType, TestConnectionResponse } from '@/types/connectors';
import { toast } from 'sonner';

interface ConnectorTesterProps {
  connectorId: string;
  connectorType: ConnectorType;
  onClose: () => void;
}

interface TestResult {
  id: string;
  timestamp: Date;
  type: 'connection' | 'request' | 'webhook';
  status: 'running' | 'success' | 'error';
  duration?: number;
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    body: string;
  };
  error?: string;
}

const ConnectorTester: React.FC<ConnectorTesterProps> = ({ 
  connectorId, 
  connectorType, 
  onClose 
}) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testConfig, setTestConfig] = useState({
    method: 'GET',
    endpoint: '',
    headers: '{}',
    body: '{}',
    webhookPayload: '{}'
  });

  const addTestResult = (result: Omit<TestResult, 'id' | 'timestamp'>) => {
    const newResult: TestResult = {
      ...result,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setTestResults(prev => [newResult, ...prev]);
    return newResult;
  };

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.id === id ? { ...result, ...updates } : result
    ));
  };

  const testConnection = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    
    const result = addTestResult({
      type: 'connection',
      status: 'running'
    });

    try {
      const response = await fetch(`/api/connectors/${connectorId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data: TestConnectionResponse = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok && data.success) {
        updateTestResult(result.id, {
          status: 'success',
          duration,
          response: {
            status: response.status,
            body: JSON.stringify(data, null, 2)
          }
        });
        toast.success('Conexión exitosa');
      } else {
        updateTestResult(result.id, {
          status: 'error',
          duration,
          error: data.error || 'Error desconocido',
          response: {
            status: response.status,
            body: JSON.stringify(data, null, 2)
          }
        });
        toast.error('Error en la conexión');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(result.id, {
        status: 'error',
        duration,
        error: error instanceof Error ? error.message : 'Error de red'
      });
      toast.error('Error de conexión');
    } finally {
      setIsRunning(false);
    }
  };

  const testApiRequest = async () => {
    if (connectorType !== ConnectorType.API) {
      toast.error('Esta función solo está disponible para conectores API');
      return;
    }

    setIsRunning(true);
    const startTime = Date.now();
    
    let headers: Record<string, string> = {};
    try {
      headers = JSON.parse(testConfig.headers);
    } catch (error) {
      toast.error('Headers inválidos - debe ser JSON válido');
      setIsRunning(false);
      return;
    }

    let body: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(testConfig.method)) {
      try {
        body = JSON.parse(testConfig.body);
      } catch (error) {
        toast.error('Body inválido - debe ser JSON válido');
        setIsRunning(false);
        return;
      }
    }

    const result = addTestResult({
      type: 'request',
      status: 'running',
      request: {
        method: testConfig.method,
        url: testConfig.endpoint,
        headers,
        body: body ? JSON.stringify(body) : undefined
      }
    });

    try {
      const response = await fetch(`/api/connectors/${connectorId}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: testConfig.method,
          endpoint: testConfig.endpoint,
          headers,
          body
        })
      });

      const responseData = await response.text();
      const duration = Date.now() - startTime;

      updateTestResult(result.id, {
        status: response.ok ? 'success' : 'error',
        duration,
        response: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData
        },
        error: response.ok ? undefined : `HTTP ${response.status}`
      });

      if (response.ok) {
        toast.success('Petición exitosa');
      } else {
        toast.error('Error en la petición');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(result.id, {
        status: 'error',
        duration,
        error: error instanceof Error ? error.message : 'Error de red'
      });
      toast.error('Error de conexión');
    } finally {
      setIsRunning(false);
    }
  };

  const testWebhook = async () => {
    if (connectorType !== ConnectorType.WEBHOOK) {
      toast.error('Esta función solo está disponible para conectores Webhook');
      return;
    }

    setIsRunning(true);
    const startTime = Date.now();
    
    let payload: any;
    try {
      payload = JSON.parse(testConfig.webhookPayload);
    } catch (error) {
      toast.error('Payload inválido - debe ser JSON válido');
      setIsRunning(false);
      return;
    }

    const result = addTestResult({
      type: 'webhook',
      status: 'running',
      request: {
        method: 'POST',
        url: `/api/webhooks/${connectorId}`,
        body: JSON.stringify(payload)
      }
    });

    try {
      const response = await fetch(`/api/webhooks/${connectorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.text();
      const duration = Date.now() - startTime;

      updateTestResult(result.id, {
        status: response.ok ? 'success' : 'error',
        duration,
        response: {
          status: response.status,
          body: responseData
        },
        error: response.ok ? undefined : `HTTP ${response.status}`
      });

      if (response.ok) {
        toast.success('Webhook procesado exitosamente');
      } else {
        toast.error('Error procesando webhook');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(result.id, {
        status: 'error',
        duration,
        error: error instanceof Error ? error.message : 'Error de red'
      });
      toast.error('Error de conexión');
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const exportResults = () => {
    const data = {
      connectorId,
      connectorType,
      timestamp: new Date().toISOString(),
      results: testResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connector-test-results-${connectorId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyResult = async (result: TestResult) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      toast.success('Resultado copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Tester de Conector</h3>
              <p className="text-gray-600">ID: {connectorId} | Tipo: {connectorType}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Limpiar
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Panel de configuración */}
          <div className="w-1/3 p-6 border-r overflow-y-auto">
            <div className="space-y-6">
              {/* Test de conexión */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Test de Conexión</h4>
                <Button 
                  onClick={testConnection} 
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? (
                    <Square className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Probar Conexión
                </Button>
              </Card>

              {/* Test de API */}
              {connectorType === ConnectorType.API && (
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Test de API</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="method">Método</Label>
                      <select
                        id="method"
                        value={testConfig.method}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, method: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="endpoint">Endpoint</Label>
                      <Input
                        id="endpoint"
                        value={testConfig.endpoint}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                        placeholder="/api/users"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="headers">Headers (JSON)</Label>
                      <Textarea
                        id="headers"
                        value={testConfig.headers}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, headers: e.target.value }))}
                        placeholder='{"Content-Type": "application/json"}'
                        rows={3}
                      />
                    </div>
                    
                    {['POST', 'PUT', 'PATCH'].includes(testConfig.method) && (
                      <div>
                        <Label htmlFor="body">Body (JSON)</Label>
                        <Textarea
                          id="body"
                          value={testConfig.body}
                          onChange={(e) => setTestConfig(prev => ({ ...prev, body: e.target.value }))}
                          placeholder='{"name": "test"}'
                          rows={4}
                        />
                      </div>
                    )}
                    
                    <Button 
                      onClick={testApiRequest} 
                      disabled={isRunning || !testConfig.endpoint}
                      className="w-full"
                    >
                      {isRunning ? (
                        <Square className="h-4 w-4 mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Ejecutar Petición
                    </Button>
                  </div>
                </Card>
              )}

              {/* Test de Webhook */}
              {connectorType === ConnectorType.WEBHOOK && (
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Test de Webhook</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="webhook-payload">Payload (JSON)</Label>
                      <Textarea
                        id="webhook-payload"
                        value={testConfig.webhookPayload}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, webhookPayload: e.target.value }))}
                        placeholder='{"event": "test", "data": {}}'
                        rows={6}
                      />
                    </div>
                    
                    <Button 
                      onClick={testWebhook} 
                      disabled={isRunning}
                      className="w-full"
                    >
                      {isRunning ? (
                        <Square className="h-4 w-4 mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Simular Webhook
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Panel de resultados */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h4 className="font-medium mb-4">Resultados de Tests</h4>
            
            {testResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay resultados de tests aún</p>
                <p className="text-sm">Ejecuta un test para ver los resultados aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testResults.map((result) => (
                  <Card key={result.id} className={`p-4 ${getStatusColor(result.status)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium capitalize">{result.type}</span>
                        <span className="text-sm text-gray-600">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                        {result.duration && (
                          <span className="text-sm text-gray-600">
                            ({result.duration}ms)
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyResult(result)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {result.request && (
                      <div className="mb-3">
                        <h5 className="font-medium text-sm mb-2">Request:</h5>
                        <div className="bg-white rounded p-2 text-sm font-mono">
                          <div>{result.request.method} {result.request.url}</div>
                          {result.request.headers && (
                            <div className="mt-1 text-gray-600">
                              Headers: {JSON.stringify(result.request.headers)}
                            </div>
                          )}
                          {result.request.body && (
                            <div className="mt-1 text-gray-600">
                              Body: {result.request.body}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {result.response && (
                      <div className="mb-3">
                        <h5 className="font-medium text-sm mb-2">Response:</h5>
                        <div className="bg-white rounded p-2 text-sm font-mono">
                          <div>Status: {result.response.status}</div>
                          {result.response.headers && (
                            <div className="mt-1 text-gray-600">
                              Headers: {JSON.stringify(result.response.headers)}
                            </div>
                          )}
                          <div className="mt-1 max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{result.response.body}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {result.error && (
                      <div>
                        <h5 className="font-medium text-sm mb-2 text-red-600">Error:</h5>
                        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                          {result.error}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectorTester;