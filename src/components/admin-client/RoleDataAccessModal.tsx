'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiPlus, FiTrash2 } from '@/lib/icons';
import { toast } from 'sonner';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RoleDataAccess {
  id: string;
  product_id: string;
  name: string;
  table_names: string[];
  data_access: {
    filters?: Record<string, any>; // Old format for backward compatibility
    permissions?: string[];
    [key: string]: any; // New format: filters are stored directly as properties
  };
  metrics_access?: string[];
  priority_level?: string;
}

interface RoleDataAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RoleDataAccess | null;
  productId: string;
  onSuccess: () => void;
}

function parseYAMLDatasetsToNames(yamlContent: string): string[] {
  try {
    const datasetsMatch = yamlContent.match(/datasets:\s*([\s\S]*?)(?=\n\S|$)/);
    if (!datasetsMatch) return [];

    const datasetsSection = datasetsMatch[1];
    const tableMatches = Array.from(datasetsSection.matchAll(/^\s{2}([^:]+):/gm));

    const names: string[] = [];
    for (const match of tableMatches) {
      const fullTableName = match[1].trim();
      names.push(fullTableName);
    }

    return names;
  } catch {
    return [];
  }
}

function getShortTableName(table: string): string {
  const parts = table.split('.');
  return parts[parts.length - 1] || table;
}

export default function RoleDataAccessModal({ isOpen, onClose, role, productId, onSuccess }: RoleDataAccessModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    priority_level: '',
    metrics_access_list: [] as string[],
    table_names_list: [] as string[],
    filters: [{ key: '', value: '' }]
  });
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (role) {
      // Extract filters from data_access
      // New format: filters are directly in data_access (not in data_access.filters)
      // Also handle backward compatibility with old format (data_access.filters)
      const dataAccess = role.data_access || {};
      let filters: Record<string, any> = {};
      
      if (dataAccess.filters) {
        // Old format: data_access.filters exists
        filters = dataAccess.filters;
      } else {
        // New format: filters are directly in data_access
        // Extract all properties except 'permissions'
        filters = { ...dataAccess };
        delete filters.permissions;
      }
      
      // Convert filters object to array format
      // Each filter should be displayed as "key": value in the input field
      const filterEntries = Object.entries(filters).map(([key, value]) => {
        // Skip condition_X keys (old format)
        if (key.startsWith('condition_')) {
          // For old format, show the value in the key field
          return { key: String(value), value: '' };
        }
        // For new format, display as "key": value JSON string
        try {
          const valueJson = JSON.stringify(value);
          const keyValueString = `"${key}": ${valueJson}`;
          return { key: keyValueString, value: '' };
        } catch {
          // Fallback if value can't be stringified
          return { key: `"${key}": ${String(value)}`, value: '' };
        }
      });
      
      setFormData({
        name: role.name,
        priority_level: role.priority_level || '',
        metrics_access_list: role.metrics_access || [],
        table_names_list: role.table_names || [],
        filters: filterEntries.length > 0 ? filterEntries : [{ key: '', value: '' }]
      });
    } else {
      setFormData({
        name: '',
        priority_level: '',
        metrics_access_list: [],
        table_names_list: [],
        filters: [{ key: '', value: '' }]
      });
    }
  }, [role]);

  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const authData = localStorage.getItem('evolve-auth');
        if (!authData) {
          toast.error('Sesión expirada');
          return;
        }

        const { accessToken: token } = JSON.parse(authData);

        try {
          const metricsResponse = await fetch('/api/backend/metrics/product', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: productId })
          });

          if (metricsResponse.ok) {
            const metricsResult = await metricsResponse.json();
            const metricsData = Array.isArray(metricsResult.data) ? metricsResult.data : [];
            const metricNames = Array.from<string>(
              new Set<string>(
                metricsData
                  .map((m: any) => m.metric_name || m.name)
                  .filter((name: string | undefined): name is string => Boolean(name))
              )
            );
            setAvailableMetrics(metricNames);
          } else {
            setAvailableMetrics([]);
          }
        } catch {
          setAvailableMetrics([]);
        }

        try {
          const configResponse = await fetch('/api/backend/semantic', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: productId })
          });

          if (!configResponse.ok) {
            setAvailableTables([]);
            return;
          }

          const configResult = await configResponse.json();
          const rawData = configResult.data;
          const configs = Array.isArray(rawData?.configs)
            ? rawData.configs
            : Array.isArray(rawData)
              ? rawData
              : [];

          if (configs.length === 0) {
            setAvailableTables([]);
            return;
          }

          const tableSet = new Set<string>();

          for (const config of configs) {
            const gsUri = config.object_path_saved || config.gs_uri || config.url;
            if (!gsUri) continue;

            try {
              const describeResponse = await fetch(
                `/api/backend/semantic/layer/describe?gs_uri=${encodeURIComponent(gsUri)}`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                }
              );

              if (!describeResponse.ok) {
                continue;
              }

              const describeResult = await describeResponse.json();
              const rawDatasets =
                (describeResult && describeResult.data && describeResult.data.datasets) ||
                describeResult?.datasets ||
                [];

              const datasets: any[] = Array.isArray(rawDatasets)
                ? rawDatasets
                : rawDatasets && typeof rawDatasets === 'object'
                  ? Object.values(rawDatasets)
                  : [];

              datasets.forEach((dataset: any) => {
                if (!dataset) return;
                const table = dataset.table || dataset.name;
                if (!table) return;
                const schema = dataset.schema || 'public';
                tableSet.add(`${schema}.${table}`);
              });
            } catch {
              // Ignorar errores de describe individuales y continuar con las demás configs
              continue;
            }
          }

          setAvailableTables(Array.from(tableSet));
        } catch {
          setAvailableTables([]);
        }
      } catch {
        setAvailableMetrics([]);
        setAvailableTables([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [isOpen, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Por favor completa el nombre del rol');
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      
      const { accessToken: token } = JSON.parse(authData);

      // Build filters object - parse the key-value format from input
      // The filter.key contains a key-value pair in JSON format (e.g., "facturacion_argentina.BU.in": ["BU CENTRO"])
      // Parse it and store as a dictionary
      const filtersObj: Record<string, any> = {};
      formData.filters.forEach((filter) => {
        const expression = filter.key?.trim();
        if (expression) {
          try {
            // Try to parse as JSON object first (e.g., {"key": "value"})
            let parsed: any = null;
            try {
              parsed = JSON.parse(expression);
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                // It's a valid JSON object, merge it into filtersObj
                Object.assign(filtersObj, parsed);
              }
            } catch {
              // If not a complete JSON object, try to parse as a key-value pair string
              // Format: "key": value or "key": ["value"]
              const keyValueMatch = expression.match(/^"([^"]+)"\s*:\s*([\s\S]+)$/);
              if (keyValueMatch) {
                const key = keyValueMatch[1];
                const valueStr = keyValueMatch[2].trim();
                
                // Try to parse the value as JSON
                try {
                  const value = JSON.parse(valueStr);
                  filtersObj[key] = value;
                } catch (parseError) {
                  // If value is not valid JSON, try to wrap it in quotes and parse again
                  try {
                    const value = JSON.parse(`"${valueStr}"`);
                    filtersObj[key] = value;
                  } catch {
                    // If still fails, store as string
                    filtersObj[key] = valueStr;
                  }
                }
              } else {
                // If it doesn't match key-value format, check if filter.value exists
                if (filter.value && filter.value.trim()) {
                  filtersObj[filter.key] = filter.value;
                }
              }
            }
          } catch (error) {
            console.warn('Error parsing filter expression:', expression, error);
            // Fallback: if filter.value exists, use it
            if (filter.value && filter.value.trim()) {
              filtersObj[filter.key] = filter.value;
            }
          }
        }
      });

      // Build data_access object - filters should be stored directly, not wrapped in a "filters" key
      const hasFilters = Object.keys(filtersObj).length > 0;
      
      let dataAccess: any = {};
      if (hasFilters) {
        // Store filters directly in data_access (not wrapped in "filters" key)
        // data_access should be: {"facturacion_argentina.BU.in": ["BU CENTRO"], ...}
        dataAccess = { ...filtersObj };
      }
      // If no filters, data_access remains {} (empty object)

      const payload = {
        product_id: productId,
        name: formData.name,
        table_names: formData.table_names_list,
        data_access: dataAccess,
        metrics_access: formData.metrics_access_list.length > 0 ? formData.metrics_access_list : null,
        priority_level: formData.priority_level || null
      };

      if (role) {
        const response = await fetch(`/api/backend/role-data-access/${role.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Error al actualizar rol');
        
        toast.success('Rol actualizado exitosamente');
      } else {
        const response = await fetch('/api/backend/role-data-access/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Error al crear rol');
        
        toast.success('Rol creado exitosamente');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al guardar el rol');
    }
  };

  const handleAddFilter = () => {
    setFormData({ ...formData, filters: [...formData.filters, { key: '', value: '' }] });
  };

  const handleRemoveFilter = (index: number) => {
    setFormData({ ...formData, filters: formData.filters.filter((_, i) => i !== index) });
  };

  const handleFilterChange = (index: number, field: 'key' | 'value', value: string) => {
    const newFilters = [...formData.filters];
    newFilters[index][field] = value;
    setFormData({ ...formData, filters: newFilters });
  };

  const toggleMetric = (metric: string) => {
    if (formData.metrics_access_list.includes(metric)) {
      setFormData({ ...formData, metrics_access_list: formData.metrics_access_list.filter(m => m !== metric) });
    } else {
      setFormData({ ...formData, metrics_access_list: [...formData.metrics_access_list, metric] });
    }
  };

  const toggleTable = (table: string) => {
    if (formData.table_names_list.includes(table)) {
      setFormData({ ...formData, table_names_list: formData.table_names_list.filter(t => t !== table) });
    } else {
      setFormData({ ...formData, table_names_list: [...formData.table_names_list, table] });
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="glass-panel border border-white/10 rounded-2xl p-0 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl bg-minddash-surface/90 flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 flex-shrink-0">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{role ? 'Editar Rol de Acceso' : 'Crear Nuevo Rol de Acceso'}</h3>
              <p className="text-xs text-gray-400 mt-1 font-medium">Define las capacidades y restricciones de datos para este rol.</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"><FiX className="w-5 h-5" /></button>
          </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Configuración Básica */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Configuración Básica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Nombre del Rol <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Analista de Ventas Latam" className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600" required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Nivel del Rol</label>
                  <Select value={formData.priority_level || undefined} onValueChange={(next) => setFormData({ ...formData, priority_level: next })}>
                    <SelectTrigger className="w-full bg-black/40 border-white/10 text-white h-[42px]">
                      <SelectValue placeholder="Selecciona un nivel" />
                    </SelectTrigger>
                    <SelectContent className="bg-minddash-card border-white/10 text-white">
                      <SelectItem value="Nivel 1">Nivel 1</SelectItem>
                      <SelectItem value="Nivel 2">Nivel 2</SelectItem>
                      <SelectItem value="Nivel 3">Nivel 3</SelectItem>
                      <SelectItem value="Nivel 4">Nivel 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Prioridad para resolución de conflictos de permisos.</p>
                </div>
              </div>
            </div>

            {/* Acceso a Capa Semántica */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Acceso a Capa Semántica</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Métricas a Acceder</label>
                  <div className="bg-black/40 rounded-lg border border-white/10 p-1 max-h-56 overflow-y-auto custom-scrollbar">
                    {loadingOptions ? (
                      <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        Cargando...
                      </div>
                    ) : availableMetrics.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-500 px-4">
                        No hay métricas configuradas.
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {availableMetrics.map((metric) => (
                          <label key={metric} className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-white/5 rounded-md transition-colors group">
                            <input 
                              type="checkbox" 
                              checked={formData.metrics_access_list.includes(metric)} 
                              onChange={() => toggleMetric(metric)} 
                              className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500/40 checked:bg-blue-600 checked:border-blue-600 transition-all" 
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{metric}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Selecciona las métricas visibles para este rol.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Tablas de la BD a Acceder</label>
                  <div className="bg-black/40 rounded-lg border border-white/10 p-1 max-h-56 overflow-y-auto custom-scrollbar">
                    {loadingOptions ? (
                      <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        Cargando...
                      </div>
                    ) : availableTables.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-500 px-4">
                        No se encontraron tablas.
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {availableTables.map((table) => (
                          <label key={table} className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-white/5 rounded-md transition-colors group">
                            <input 
                              type="checkbox" 
                              checked={formData.table_names_list.includes(table)} 
                              onChange={() => toggleTable(table)} 
                              className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500/40 checked:bg-blue-600 checked:border-blue-600 transition-all" 
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate" title={table}>{getShortTableName(table)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Tablas base requeridas para los cálculos.</p>
                </div>
              </div>
            </div>

            {/* Filtros Personalizados */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Filtros Personalizados (Row-Level Security)</h4>
              
              <div className="space-y-3">
                {formData.filters.map((filter, index) => (
                  <div key={index} className="bg-black/20 rounded-lg border border-white/10 p-4 hover:border-white/20 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wide">Filtro {index + 1}: Restricción de Datos</h5>
                      {formData.filters.length > 1 && (
                        <button type="button" onClick={() => handleRemoveFilter(index)} className="text-gray-500 hover:text-red-400 transition-colors p-1"><FiTrash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          value={filter.key} 
                          onChange={(e) => handleFilterChange(index, 'key', e.target.value)} 
                          placeholder="Ej: users.country IN ('CL', 'AR')" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white font-mono text-xs focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors placeholder:text-gray-700" 
                        />
                      </div>
                      <p className="text-[10px] text-gray-500">Expresión SQL válida para cláusula WHERE.</p>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={handleAddFilter} className="mt-4 flex items-center space-x-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-2 rounded-lg hover:bg-blue-500/20 border border-blue-500/20">
                <FiPlus className="w-3.5 h-3.5" />
                <span>Añadir Nuevo Filtro</span>
              </button>
            </div>
          </form>
        </div>

          {/* Botones */}
          <div className="flex items-center justify-end space-x-3 p-5 border-t border-white/10 bg-black/20 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10">Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={loadingOptions}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-900/20 hover:scale-[1.02]"
            >
              {role ? 'Guardar Cambios' : 'Crear Rol'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
}
