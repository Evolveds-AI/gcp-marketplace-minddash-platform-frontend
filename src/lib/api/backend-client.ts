import { fetchRuntimeConfig } from '@/lib/runtime-config';

class BackendError extends Error {
  statusCode?: number;
  errorData?: unknown;

  constructor(message: string, statusCode?: number, errorData?: unknown) {
    super(message);
    this.name = 'BackendError';
    this.statusCode = statusCode;
    this.errorData = errorData;
  }
}

const BUILD_TIME_FALLBACK =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

async function getBackendApiBase(): Promise<string> {
  if (typeof window === 'undefined') return BUILD_TIME_FALLBACK;
  try {
    const cfg = await fetchRuntimeConfig();
    return cfg.backendApiUrl || BUILD_TIME_FALLBACK;
  } catch {
    return BUILD_TIME_FALLBACK;
  }
}

async function backendRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = await getBackendApiBase();
  const url = `${base}${path}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      ...(options.headers || {}),
    },
    body: options.body,
  });

  let data: any = null;
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const rawMessage = data && (data.detail || data.message || data.error);
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : rawMessage
        ? JSON.stringify(rawMessage)
        : `Error ${response.status} al llamar al backend`;

    throw new BackendError(message, response.status, data);
  }

  return data as T;
}

// Usamos tipo any para permitir que otras partes del código accedan
// a métodos adicionales sin romper el tipado actual.
export const backendClient: any = {
  /**
   * Organizaciones
   */

  // GET /organizations/getListOrganization
  async getAllOrganizations() {
    return backendRequest('/organizations/getListOrganization', {
      method: 'GET',
    });
  },

  // POST /organizations/getListOrganizationByUser
  async getOrganizationsByUser(userId: string) {
    return backendRequest('/organizations/getListOrganizationByUser', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  // POST /organizations/sendRegisterOrganization
  async createOrganization(payload: {
    name: string;
    company_name: string;
    description: string;
    country: string;
  }) {
    return backendRequest('/organizations/sendRegisterOrganization', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /organizations/updateOrganization
  async updateOrganization(payload: {
    id: string;
    name: string;
    company_name: string;
    description: string;
    country: string;
  }) {
    return backendRequest('/organizations/updateOrganization', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /organizations/deleteOrganization
  async deleteOrganization(id: string) {
    return backendRequest('/organizations/deleteOrganization', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  /**
   * Acceso a organizaciones
   */

  // POST /organizations/sendAccessOrganization
  async grantOrganizationAccess(payload: {
    organization_id: string;
    user_id: string;
    role_id: string;
  }) {
    return backendRequest('/organizations/sendAccessOrganization', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /organizations/updateAccessOrganization
  async updateOrganizationAccess(payload: {
    organization_id: string;
    user_id: string;
    role_id: string;
  }) {
    return backendRequest('/organizations/updateAccessOrganization', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /organizations/deleteAccessOrganization
  async revokeOrganizationAccess(payload: {
    organization_id: string;
    user_id: string;
  }) {
    return backendRequest('/organizations/deleteAccessOrganization', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  async getUserInfo(userId: string) {
    return backendRequest('/users/getInfoByUser', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  /**
   * Proyectos
   */

  // GET /projects/getListProject
  async getAllProjects() {
    return backendRequest('/projects/getListProject', {
      method: 'GET',
    });
  },

  // POST /projects/getListProjectByUser
  async getProjectsByUser(userId: string) {
    return backendRequest('/projects/getListProjectByUser', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  // POST /projects/sendRegistroProject
  async createProject(payload: {
    organization_id: string;
    name: string;
    description?: string | null;
    label?: string | null;
    label_color?: string | null;
  }) {
    return backendRequest('/projects/sendRegistroProject', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /projects/updateProject
  async updateProject(payload: {
    id: string;
    name: string;
    description?: string | null;
    label?: string | null;
    label_color?: string | null;
  }) {
    return backendRequest('/projects/updateProject', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /projects/deleteProject
  async deleteProject(projectId: string) {
    return backendRequest('/projects/deleteProject', {
      method: 'DELETE',
      body: JSON.stringify({ id: projectId }),
    });
  },

  /**
   * Acceso a proyectos
   */

  // POST /projects/sendAccessProject
  async grantProjectAccess(payload: {
    project_id: string;
    user_id: string;
    role_id?: string;
  }) {
    return backendRequest('/projects/sendAccessProject', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /projects/updateAccessProject
  async updateProjectAccess(payload: {
    id?: string;
    project_id: string;
    user_id: string;
    role_id: string;
  }) {
    return backendRequest('/projects/updateAccessProject', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /projects/deleteAccessProject
  async revokeProjectAccess(payload: { project_id: string; user_id: string }) {
    return backendRequest('/projects/deleteAccessProject', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Productos
   */

  // GET /products/getListProduct
  async getProducts() {
    return backendRequest('/products/getListProduct', {
      method: 'GET',
    });
  },

  // POST /products/getListProductByUser
  async getProductsByUser(userId: string) {
    return backendRequest('/products/getListProductByUser', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  // POST /products/sendRegistroProduct
  // Acepta tanto project_id como product_id (se mapea internamente a project_id)
  async createProduct(payload: {
    project_id?: string;
    product_id?: string;
    name: string;
    description?: string | null;
    language?: string | null;
    tipo?: string | null;
    config?: Record<string, any> | null;
    welcome_message?: string | null;
    label?: string | null;
    label_color?: string | null;
    max_users?: number | null;
    is_active_rag?: boolean | null;
    is_active_alerts?: boolean | null;
    is_active_insight?: boolean | null;
  }) {
    const { project_id, product_id, ...rest } = payload;
    const finalPayload = {
      project_id: project_id || product_id, // el backend requiere project_id
      ...rest,
    };

    return backendRequest('/products/sendRegistroProduct', {
      method: 'POST',
      body: JSON.stringify(finalPayload),
    });
  },

  // PUT /products/updateProduct
  async updateProduct(payload: any) {
    return backendRequest('/products/updateProduct', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /products/deleteProduct
  async deleteProduct(productId: string) {
    return backendRequest('/products/deleteProduct', {
      method: 'DELETE',
      body: JSON.stringify({ id: productId }),
    });
  },

  /**
   * Acceso a productos
   */

  // POST /products/sendAccessProduct
  async grantProductAccess(payload: {
    product_id: string;
    user_id: string;
    role_id?: string;
  }) {
    return backendRequest('/products/sendAccessProduct', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /products/updateAccessProduct
  async updateProductAccess(payload: {
    id?: string;
    product_id: string;
    user_id: string;
    role_id: string;
  }) {
    return backendRequest('/products/updateAccessProduct', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /products/deleteAccessProduct
  async revokeProductAccess(payload: { id: string }) {
    return backendRequest('/products/deleteAccessProduct', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Acceso a datos (roles y usuarios)
   */

  // POST /user-data-access/getRolesDataAccess
  async getRolesDataAccess(role_id?: string) {
    const body: Record<string, any> = {};
    if (role_id) {
      body.role_id = role_id;
    }

    return backendRequest('/user-data-access/getRolesDataAccess', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // POST /user-data-access/getRolesDataAccessByProduct
  async getRolesDataAccessByProduct(product_id: string) {
    return backendRequest('/user-data-access/getRolesDataAccessByProduct', {
      method: 'POST',
      body: JSON.stringify({ product_id }),
    });
  },

  // POST /user-data-access/getUserDataAccess
  async getUserDataAccess(user_data_access_id?: string) {
    const body: Record<string, any> = {};
    if (user_data_access_id) {
      body.user_data_access_id = user_data_access_id;
    }

    return backendRequest('/user-data-access/getUserDataAccess', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // POST /user-data-access/getUserDataAccessByRole
  async getUserDataAccessByRole(role_data_id: string) {
    return backendRequest('/user-data-access/getUserDataAccessByRole', {
      method: 'POST',
      body: JSON.stringify({ role_data_id }),
    });
  },

  // POST /user-data-access/getUserDataAccessByUser
  async getUserDataAccessByUser(user_id: string) {
    return backendRequest('/user-data-access/getUserDataAccessByUser', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
  },

  // POST /user-data-access/sendRegistroUserDataAccess
  async createUserDataAccess(payload: {
    role_data_id: string;
    user_id?: string | null;
    table_names?: string[] | null;
    data_access?: Record<string, any> | null;
    metrics_access?: Record<string, any> | null;
  }) {
    return backendRequest('/user-data-access/sendRegistroUserDataAccess', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /user-data-access/updateUserDataAccess
  async updateUserDataAccess(payload: {
    id: string;
    role_data_id: string;
    user_id?: string | null;
    table_names?: string[] | null;
    data_access?: Record<string, any> | null;
    metrics_access?: Record<string, any> | null;
  }) {
    return backendRequest('/user-data-access/updateUserDataAccess', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /user-data-access/deleteUserDataAccess
  async deleteUserDataAccess(id: string) {
    return backendRequest('/user-data-access/deleteUserDataAccess', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  /**
   * Roles de acceso a datos
   */

  // POST /user-data-access/sendRegistroRoleDataAccess
  async createRoleDataAccess(payload: {
    product_id: string;
    name: string;
    table_names: string[];
    data_access?: Record<string, any> | null;
    metrics_access?: Record<string, any> | null;
  }) {
    return backendRequest('/user-data-access/sendRegistroRoleDataAccess', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /user-data-access/updateRoleDataAccess
  async updateRoleDataAccess(payload: {
    id: string;
    product_id?: string;
    name?: string;
    table_names?: string[];
    data_access?: Record<string, any> | null;
    metrics_access?: Record<string, any> | null;
    priority_level?: string | null;
  }) {
    return backendRequest('/user-data-access/updateRoleDataAccess', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /user-data-access/deleteRoleDataAccess
  async deleteRoleDataAccess(id: string) {
    return backendRequest('/user-data-access/deleteRoleDataAccess', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  /**
   * Prompts & Examples
   */

  // POST /prompts_and_examples/examples/getListExamplesByProduct
  async getExamplesByProduct(product_id: string) {
    return backendRequest('/prompts_and_examples/examples/getListExamplesByProduct', {
      method: 'POST',
      body: JSON.stringify({ product_id }),
    });
  },

  // POST /prompts_and_examples/examples/sendRegisterExample
  async createExample(payload: {
    product_id: string;
    name: string;
    description?: string | null;
    data_query: string;
  }) {
    return backendRequest('/prompts_and_examples/examples/sendRegisterExample', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /prompts_and_examples/examples/sendUpdateExample
  async updateExample(payload: {
    id: string;
    name?: string;
    description?: string | null;
    data_query?: string;
  }) {
    return backendRequest('/prompts_and_examples/examples/sendUpdateExample', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /prompts_and_examples/examples/sendDeleteExample
  async deleteExample(id: string) {
    return backendRequest('/prompts_and_examples/examples/sendDeleteExample', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  // POST /prompts_and_examples/example/uploadByProduct
  async deployExamplesByProduct(payload: {
    product_id: string;
    bucket_name?: string;
    examples_yaml_path?: string;
    embeddings_npy_path?: string;
    model_name?: string;
  }) {
    return backendRequest('/prompts_and_examples/examples/uploadByProduct', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /user-data-access/sendRegisterDeployConfig
  async registerDeployConfig(payload: any) {
    return backendRequest('/user-data-access/sendRegisterDeployConfig', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /user-data-access/updateDeployConfig
  async updateDeployConfig(payload: {
    id: string;
    product_id: string;
    bucket_config?: string | null;
    gs_examples_agent?: string | null;
    gs_prompt_agent?: string | null;
    gs_prompt_sql?: string | null;
    gs_profiling_agent?: string | null;
    gs_metrics_config_agent?: string | null;
    client?: string | null;
  }) {
    return backendRequest('/user-data-access/updateDeployConfig', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /user-data-access/deleteDeployConfig
  async deleteDeployConfig(id: string) {
    return backendRequest('/user-data-access/deleteDeployConfig', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  // DELETE /semantic/deleteConfig
  async deleteSemanticConfig(id: string) {
    return backendRequest('/semantic/deleteConfig', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  /**
   * Conexiones de datos
   */

  // POST /connections/getDataConnections
  async getConnections(connectionId?: string) {
    return backendRequest('/connections/getDataConnections', {
      method: 'POST',
      body: JSON.stringify({ connection_id: connectionId }),
    });
  },

  // POST /connections/getDataConnectionsByOrganization
  async getConnectionsByOrganization(organizationId: string) {
    return backendRequest('/connections/getDataConnectionsByOrganization', {
      method: 'POST',
      body: JSON.stringify({ organization_id: organizationId }),
    });
  },

  // POST /connections/sendRegistroConnection
  async createConnection(payload: {
    organization_id: string;
    name: string;
    type: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    additional_params?: Record<string, any> | null;
    description?: string;
    is_active?: boolean;
  }) {
    const {
      organization_id,
      name,
      type,
      host,
      port,
      database,
      username,
      password,
      additional_params,
      description,
      is_active,
    } = payload;

    const configuration: Record<string, any> = {
      host,
      port,
      database,
      username,
      password,
      ...(additional_params || {}),
      description,
      is_active,
    };

    return backendRequest('/connections/sendRegistroConnection', {
      method: 'POST',
      body: JSON.stringify({
        organization_id,
        name,
        type,
        configuration,
      }),
    });
  },

  // PUT /connections/updateConnection
  async updateConnection(payload: {
    id: string;
    organization_id?: string;
    name?: string;
    type?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    additional_params?: Record<string, any> | null;
    description?: string;
    is_active?: boolean;
  }) {
    const {
      id,
      organization_id,
      name,
      type,
      host,
      port,
      database,
      username,
      password,
      additional_params,
      description,
      is_active,
    } = payload;

    const configuration: Record<string, any> = {
      host,
      port,
      database,
      username,
      password,
      ...(additional_params || {}),
      description,
      is_active,
    };

    const body: any = {
      id,
      name,
      type,
      configuration,
    };

    if (organization_id) {
      body.organization_id = organization_id;
    }

    return backendRequest('/connections/updateConnection', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // DELETE /connections/deleteConnection
  async deleteConnection(connectionId: string) {
    return backendRequest('/connections/deleteConnection', {
      method: 'DELETE',
      body: JSON.stringify({ id: connectionId }),
    });
  },

  // POST /mindsdb/meta
  async getMindsDBMeta(payload: any) {
    return backendRequest('/mindsdb/meta', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /mindsdb/connections - Crear conexión en MindsDB
  async createMindsDBConnection(payload: {
    server_url?: string | null;
    name: string;
    engine: 'postgres' | 'bigquery' | 'mysql';
    parameters: Record<string, any>;
  }) {
    return backendRequest('/mindsdb/connections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /mindsdb/updateConnections - Actualizar conexión en MindsDB
  async updateMindsDBConnection(payload: {
    server_url?: string | null;
    name: string;
    engine: 'postgres' | 'bigquery' | 'mysql';
    parameters: Record<string, any>;
  }) {
    return backendRequest('/mindsdb/updateConnections', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /mindsdb/dropConnections - Eliminar conexión de MindsDB
  async dropMindsDBConnection(payload: {
    server_url?: string | null;
    name: string;
    engine: 'postgres' | 'bigquery' | 'mysql';
  }) {
    return backendRequest('/mindsdb/dropConnections', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Semantic Layer
   */

  // POST /semantic/getConfigByID
  async getSemanticLayerConfigById(payload: { config_id: string }) {
    return backendRequest('/semantic/getConfigByID', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /semantic/getConfigsByProduct
  async getSemanticLayerConfigsByProduct(payload: { product_id: string }) {
    return backendRequest('/semantic/getConfigsByProduct', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /semantic/createConfig
  async createSemanticLayerConfig(payload: any) {
    return backendRequest('/semantic/createConfig', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /semantic/updateConfig
  async updateSemanticLayerConfig(payload: any) {
    return backendRequest('/semantic/updateConfig', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /semantic/deleteConfig
  async deleteSemanticLayerConfig(payload: { id: string }) {
    return backendRequest('/semantic/deleteConfig', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  // POST /semantic/layer/build
  async buildSemanticLayer(payload: any) {
    return backendRequest('/semantic/layer/build', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /semantic/layer/update
  async updateSemanticLayer(payload: any) {
    return backendRequest('/semantic/layer/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // GET /semantic/layer/fetch
  async fetchSemanticLayer(layerId: string) {
    const path = `/semantic/layer/fetch?layer_id=${encodeURIComponent(layerId)}`;
    return backendRequest(path, {
      method: 'GET',
    });
  },

  // POST /semantic/layer/describe
  async describeSemanticLayer(payload: any) {
    return backendRequest('/semantic/layer/describe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // GET /semantic/layer/describe?gs_uri=...
  async describeSemanticLayerFromGCS(gsUri: string) {
    return backendRequest(`/semantic/layer/describe?gs_uri=${encodeURIComponent(gsUri)}`, {
      method: 'GET',
    });
  },

  // POST /semantic/query/build-advanced
  async buildAdvancedSemanticQuery(payload: any) {
    return backendRequest('/semantic/query/build-advanced', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /semantic/query/run
  async runSemanticQuery(payload: any) {
    return backendRequest('/semantic/query/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Metrics
   */

  // POST /metrics/getMetricsByProduct
  async getMetricsByProduct(payload: { product_id: string }) {
    return backendRequest('/metrics/getMetricsByProduct', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /metrics/uploadByproduct
  async uploadMetricsByProduct(payload: { product_id: string; bucket_name: string; object_path: string }) {
    return backendRequest('/metrics/uploadByproduct', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /metrics/sendRegisterMetric
  async createMetric(payload: any) {
    return backendRequest('/metrics/sendRegisterMetric', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /metrics/updateMetric
  async updateMetric(payload: any) {
    return backendRequest('/metrics/updateMetric', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /metrics/deleteMetric
  async deleteMetric(payload: { id: string }) {
    return backendRequest('/metrics/deleteMetric', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  // POST /prompts_and_examples/prompts/getPromptsByproduct
  async getPromptsByProduct(product_id: string) {
    return backendRequest('/prompts_and_examples/prompts/getPromptsByproduct', {
      method: 'POST',
      body: JSON.stringify({ product_id }),
    });
  },

  // POST /prompts_and_examples/prompts/sendRegisterPrompt
  async createPrompt(payload: any) {
    return backendRequest('/prompts_and_examples/prompts/sendRegisterPrompt', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /prompts_and_examples/prompts/sendUpdatePrompt
  async updatePrompt(payload: any) {
    return backendRequest('/prompts_and_examples/prompts/sendUpdatePrompt', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /prompts_and_examples/prompts/sendDeletePrompt
  async deletePrompt(payload: { id: string }) {
    return backendRequest('/prompts_and_examples/prompts/sendDeletePrompt', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Alertas
   */

  // POST /alert/getAlertsByProduct - Obtener alertas por producto
  async getAlertsByProduct(product_id: string) {
    const url = `/alert/getAlertsByProduct?product_id=${encodeURIComponent(product_id)}`;
    return backendRequest(url, {
      method: 'POST',
    });
  },

  // POST /alert/sendRegistroAlerta - Crear nueva alerta
  async createAlert(payload: {
    product_id: string;
    prompt_alerta: string;
    codigo_cron: string;
    user_id: string;
    session_id: string;
    channel_product_type?: string;
    flg_habilitado?: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
  }) {
    return backendRequest('/alert/sendRegistroAlerta', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /alert/updateAlerta - Actualizar alerta
  async updateAlert(payload: {
    id: string;
    product_id?: string;
    prompt_alerta?: string;
    codigo_cron?: string;
    user_id?: string;
    session_id?: string;
    channel_product_type?: string;
    flg_habilitado?: boolean;
    fecha_inicio?: string;
    fecha_fin?: string;
  }) {
    return backendRequest('/alert/updateAlerta', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // POST /alert/sendAlerts - Enviar alerta inmediata (prueba manual)
  async sendAlert(payload: any) {
    return backendRequest('/alert/sendAlerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /alert/executeAlerts - Ejecutar todas las alertas programadas (normalmente usado por scheduler)
  async executeAlerts() {
    return backendRequest('/alert/executeAlerts', {
      method: 'POST',
    });
  },

  // DELETE /alert/deleteAlerta - Eliminar alerta
  async deleteAlert(id: string) {
    return backendRequest('/alert/deleteAlerta', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  /**
   * Channel Management
   */

  // POST /Channels/sendRegistroChannel
  async createChannel(payload: { name: string; description?: string | null }) {
    return backendRequest('/Channels/sendRegistroChannel', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // POST /Channels/sendRegistroChannelProduct
  async createChannelProduct(payload: {
    channel_id: string;
    product_id: string;
    channel_product_type?: string | null;
    configuration?: Record<string, any> | null;
  }) {
    return backendRequest('/Channels/sendRegistroChannelProduct', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /Channels/updateChannelProduct
  async updateChannelProduct(payload: {
    id: string;
    channel_id: string;
    product_id: string;
    channel_product_type?: string | null;
    configuration?: Record<string, any> | null;
  }) {
    return backendRequest('/Channels/updateChannelProduct', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /Channels/deleteChannelProduct
  async deleteChannelProduct(payload: { id: string }) {
    return backendRequest('/Channels/deleteChannelProduct', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Billing Management
   */

  // GET /billing/getListPlans
  async getBillingPlans() {
    return backendRequest('/billing/getListPlans', {
      method: 'GET',
    });
  },

  // POST /billing/getListQuotasByPlan
  async getQuotasByPlan(plan_id: string) {
    return backendRequest('/billing/getListQuotasByPlan', {
      method: 'POST',
      body: JSON.stringify({ plan_id }),
    });
  },

  // POST /billing/getBillingStatusByOrg
  async getBillingStatusByOrg(organization_id: string) {
    return backendRequest('/billing/getBillingStatusByOrg', {
      method: 'POST',
      body: JSON.stringify({ organization_id }),
    });
  },

  // POST /billing/sendRegistroOrgPlan
  async assignOrgPlan(payload: { id_plan: string; id_organization: string }) {
    return backendRequest('/billing/sendRegistroOrgPlan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /billing/updateOrgPlan
  async updateOrgPlan(payload: { id: string; id_plan: string; id_organization: string }) {
    return backendRequest('/billing/updateOrgPlan', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /billing/deleteOrgPlan
  async deleteOrgPlan(payload: { id: string }) {
    return backendRequest('/billing/deleteOrgPlan', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  // POST /billing/sendRegistroPlan
  async createPlan(payload: { plan_name: string; description?: string | null }) {
    return backendRequest('/billing/sendRegistroPlan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /billing/updatePlan
  async updatePlan(payload: { id: string; plan_name: string; description?: string | null }) {
    return backendRequest('/billing/updatePlan', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /billing/deletePlan
  async deletePlan(payload: { id: string }) {
    return backendRequest('/billing/deletePlan', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  // POST /billing/sendRegistroQuota
  async createQuota(payload: { id_plan: string; metric_name: string; level?: string | null; quota: number }) {
    return backendRequest('/billing/sendRegistroQuota', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // PUT /billing/updateQuota
  async updateQuota(payload: { id: string; id_plan: string; metric_name: string; level?: string | null; quota: number }) {
    return backendRequest('/billing/updateQuota', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // DELETE /billing/deleteQuota
  async deleteQuota(payload: { id: string }) {
    return backendRequest('/billing/deleteQuota', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },
};

