'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronDown } from '@/lib/icons';

export interface Client {
  id: string;
  name: string;
  displayName: string;
  gcpName: string;
}

const defaultClients: Client[] = [
  { id: 'cliente1', name: 'cliente1', displayName: 'Cliente 1', gcpName: 'lisit' },
  { id: 'chatbotID3456', name: 'cliente2', displayName: 'Cliente 2', gcpName: 'cintac' },
  { id: 'chatbotID6789', name: 'cliente3', displayName: 'Cliente 3', gcpName: 'cliente3' },
  { id: 'cliente4', name: 'cliente4', displayName: 'Cliente 4', gcpName: 'cliente4' },
];

interface ClientSelectorProps {
  onClientSelect: (client: Client) => void;
  selectedClient?: Client;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  onClientSelect, 
  selectedClient 
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>(defaultClients);
  const [selected, setSelected] = useState<Client | undefined>(selectedClient);

  useEffect(() => {
    // Podría cargar clientes desde API
    setClients(defaultClients);
    
    // Si no hay cliente seleccionado, seleccionar el primero por defecto
    if (!selected && clients.length > 0) {
      setSelected(clients[0]);
      onClientSelect(clients[0]);
    }
  }, []);

  const handleSelectClient = (client: Client) => {
    setSelected(client);
    setIsOpen(false);
    onClientSelect(client);
    
    // Guardar la selección en localStorage
    localStorage.setItem('evolve-selected-client', JSON.stringify(client));
    
    // Redirigir según el cliente seleccionado con ID único
    if (client.id === 'cliente1') {
      router.push('/chatbot/lisa');
    } else if (client.id === 'cliente2') {
      router.push('/chatbot/chatbotID3456');
    } else if (client.id === 'cliente3') {
      router.push('/chatbot/chatbotID6789');
    } else {
      router.push('/selector'); // Si hay algún problema, volver al selector
    }
  };

  // Normalizar el nombre (minúsculas, sin espacios ni caracteres especiales)
  const normalizeClientName = (name: string): string => {
    return name.toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  return (
    <div className="relative inline-block text-left w-full">
      <div className="flex items-center mb-4">
        <span className="mr-2 text-sm font-medium text-gray-700">Demo de cliente:</span>
        <div className="relative w-48">
          <button
            type="button"
            className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => setIsOpen(!isOpen)}
          >
            {selected ? selected.displayName : 'Seleccionar cliente'}
            <FiChevronDown className="ml-2 h-5 w-5" aria-hidden="true" />
          </button>

          {isOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    className={`${
                      selected?.id === client.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`}
                    role="menuitem"
                    onClick={() => handleSelectClient(client)}
                  >
                    {client.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientSelector;
