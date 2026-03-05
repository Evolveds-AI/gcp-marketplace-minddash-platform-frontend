'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  FlowDefinition,
  FlowNode,
  FlowEdge,
  FlowCategory,
  FlowStatus,
  NodeCategory,
  NodeConfig,
  TriggerType,
  TriggerConfig,
  ActionConfig,
  ConditionConfig,
  TransformConfig,
  IntegrationConfig,
  CreateFlowDTO,
  UpdateFlowDTO
} from '@/types/flows';

interface FlowEditorProps {
  flowId?: string;
  initialFlow?: FlowDefinition;
  onSave?: (flow: CreateFlowDTO | UpdateFlowDTO) => Promise<void>;
  onExecute?: (flowId: string, triggerData?: any) => Promise<void>;
  readOnly?: boolean;
}

const nodeTypes = {
  trigger: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border-2 border-blue-500">
      <div className="font-bold text-blue-700">🚀 {data.label}</div>
      <div className="text-xs text-blue-600">{data.triggerType}</div>
    </div>
  ),
  action: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-100 border-2 border-green-500">
      <div className="font-bold text-green-700">⚡ {data.label}</div>
      <div className="text-xs text-green-600">{data.actionType}</div>
    </div>
  ),
  condition: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-500">
      <div className="font-bold text-yellow-700">❓ {data.label}</div>
      <div className="text-xs text-yellow-600">Condición</div>
    </div>
  ),
  transform: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-100 border-2 border-purple-500">
      <div className="font-bold text-purple-700">🔄 {data.label}</div>
      <div className="text-xs text-purple-600">Transformación</div>
    </div>
  ),
  integration: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-orange-100 border-2 border-orange-500">
      <div className="font-bold text-orange-700">🔗 {data.label}</div>
      <div className="text-xs text-orange-600">{data.integrationType}</div>
    </div>
  )
};

const FlowEditorComponent: React.FC<FlowEditorProps> = ({
  flowId,
  initialFlow,
  onSave,
  onExecute,
  readOnly = false
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [flowCategory, setFlowCategory] = useState<FlowCategory>(FlowCategory.AUTOMATION);
  const [flowStatus, setFlowStatus] = useState<FlowStatus>(FlowStatus.DRAFT);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState<NodeCategory>(NodeCategory.TRIGGER);

  // Cargar flujo inicial
  useEffect(() => {
    if (initialFlow) {
      setFlowName(initialFlow.name);
      setFlowDescription(initialFlow.description || '');
      setFlowCategory(initialFlow.category);
      setFlowStatus(initialFlow.status);
      
      // Buscar la versión activa para obtener nodes y edges
      const activeVersion = initialFlow.versions?.find(v => v.isActive);
      if (activeVersion?.definition) {
        setNodes(activeVersion.definition.nodes || []);
        setEdges(activeVersion.definition.edges || []);
      } else {
        setNodes([]);
        setEdges([]);
      }
    }
  }, [initialFlow, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, readOnly]
  );

  const addNode = useCallback(
    (type: NodeCategory) => {
      if (readOnly) return;
      
      // Crear configuración por defecto según el tipo de nodo
      let defaultConfig: NodeConfig;
      
      switch (type) {
        case NodeCategory.TRIGGER:
          defaultConfig = {
            type: TriggerType.MANUAL,
            schedule: { cronExpression: '0 0 * * *', timezone: 'UTC' }
          } as TriggerConfig;
          break;
        case NodeCategory.ACTION:
          defaultConfig = {
            type: 'http',
            parameters: {},
            timeout: 30000
          } as ActionConfig;
          break;
        case NodeCategory.CONDITION:
          defaultConfig = {
            expression: 'true',
            variables: {},
            operator: 'AND',
            conditions: []
          } as ConditionConfig;
          break;
        case NodeCategory.TRANSFORM:
          defaultConfig = {
            inputSchema: {},
            outputSchema: {},
            transformations: []
          } as TransformConfig;
          break;
        case NodeCategory.INTEGRATION:
          defaultConfig = {
            connectorId: '',
            operation: 'READ',
            parameters: {}
          } as IntegrationConfig;
          break;
        default:
          defaultConfig = {
            type: 'default',
            parameters: {}
          } as ActionConfig;
      }
      
      const newNode: FlowNode = {
        id: `${type.toLowerCase()}-${Date.now()}`,
        type: type.toLowerCase(),
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {
          label: `Nuevo ${type}`,
          category: type,
          config: defaultConfig
        }
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, readOnly]
  );

  const handleSave = async () => {
    if (!onSave || readOnly) return;
    
    setIsLoading(true);
    try {
      const flowData = {
        name: flowName,
        description: flowDescription,
        category: flowCategory,
        status: flowStatus,
        nodes,
        edges,
        variables: {},
        settings: {}
      };

      if (flowId) {
        await onSave(flowData as UpdateFlowDTO);
      } else {
        await onSave(flowData as CreateFlowDTO);
      }
    } catch (error) {
      console.error('Error saving flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!onExecute || !flowId) return;
    
    setIsLoading(true);
    try {
      await onExecute(flowId, {});
    } catch (error) {
      console.error('Error executing flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Nombre del flujo"
            className="text-xl font-bold border-none outline-none"
            disabled={readOnly}
          />
          <select
            value={flowCategory}
            onChange={(e) => setFlowCategory(e.target.value as FlowCategory)}
            className="px-3 py-1 border rounded"
            disabled={readOnly}
          >
            <option value="AUTOMATION">Automatización</option>
            <option value="INTEGRATION">Integración</option>
            <option value="WORKFLOW">Flujo de trabajo</option>
            <option value="ANALYTICS">Analíticas</option>
          </select>
          <select
            value={flowStatus}
            onChange={(e) => setFlowStatus(e.target.value as FlowStatus)}
            className="px-3 py-1 border rounded"
            disabled={readOnly}
          >
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="ARCHIVED">Archivado</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          )}
          {flowId && (
            <button
              onClick={handleExecute}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? 'Ejecutando...' : 'Ejecutar'}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <div className="bg-gray-50 border-b p-2 flex items-center space-x-2">
          <span className="text-sm font-medium">Agregar nodo:</span>
          <button
            onClick={() => addNode(NodeCategory.TRIGGER)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            🚀 Trigger
          </button>
          <button
            onClick={() => addNode(NodeCategory.ACTION)}
            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            ⚡ Acción
          </button>
          <button
            onClick={() => addNode(NodeCategory.CONDITION)}
            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            ❓ Condición
          </button>
          <button
            onClick={() => addNode(NodeCategory.TRANSFORM)}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            🔄 Transformar
          </button>
          <button
            onClick={() => addNode(NodeCategory.INTEGRATION)}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          >
            🔗 Integración
          </button>
        </div>
      )}

      {/* Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          
          {/* Info Panel */}
          <Panel position="top-right" className="bg-white p-4 rounded shadow">
            <div className="text-sm">
              <div><strong>Nodos:</strong> {nodes.length}</div>
              <div><strong>Conexiones:</strong> {edges.length}</div>
              <div><strong>Estado:</strong> {flowStatus}</div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Description */}
      {!readOnly && (
        <div className="bg-white border-t p-4">
          <textarea
            value={flowDescription}
            onChange={(e) => setFlowDescription(e.target.value)}
            placeholder="Descripción del flujo..."
            className="w-full p-2 border rounded resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  );
};

const FlowEditor: React.FC<FlowEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowEditorComponent {...props} />
    </ReactFlowProvider>
  );
};

export default FlowEditor;