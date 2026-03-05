// Función para crear un cliente con ID de producto fijo
export function createClient(clientId, clientName, gcpName) {
  const productId = `${clientName.toLowerCase()}-product`;
  const path = `/dashboard/client/${clientId}/product/${productId}`;
  
  return {
    id: clientId,
    name: clientName,
    path: path,
    gcpName: gcpName,
    productId: productId
  };
}

// Función para validar si un productId pertenece a un cliente
export function isValidProductId(clientId, productId) {
  // Acepta tanto el formato fijo como el formato con timestamp, y también UUIDs para productos dinámicos
  const clientName = availableClients.find(client => client.id === clientId)?.name;
  if (!clientName) return false;
  
  const fixedFormat = `${clientName.toLowerCase()}-product`;
  const timestampPattern = new RegExp(`^${clientName}-\d+-\d+$`, 'i');
  
  // Patrón para UUID (formato: 550e8400-e29b-41d4-a716-446655440000)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return productId === fixedFormat || timestampPattern.test(productId) || uuidPattern.test(productId);
}

export const availableClients = [
    createClient('lisit', 'Lisit', 'lisit'),
    createClient('cintac', 'Cintac', 'cintac'),
    createClient('mecanic', 'Mecanic', 'mecanic'),
    createClient('restobar', 'Restobar', 'restobar'),
    createClient('minddash', 'MindDash', 'mindDash'),
    createClient('bayer', 'Bayer', 'bayer'),
    { 
      id: 'cliente4', 
      name: 'Cliente 4', 
      path: '/chatbots/proximamente', 
      gcpName: 'cliente4' 
    },
  ];
