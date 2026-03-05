'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiArrowRight } from '@/lib/icons';

interface BreadcrumbItem {
  label: string;
  href: string;
  isLast?: boolean;
}

const pathLabels: Record<string, string> = {
  'dashboard': 'Dashboard',
  'admin': 'Administrador',
  'user': 'Usuario',
  'chat': 'Chat',
  'selector': 'Selector',
  'coming-soon': 'Próximamente',
  'integrations': 'Integraciones',
  'connectors': 'Conectores',
  'data-sources': 'Fuentes de Datos',
  'config': 'Configuración',
  'yaml': 'YAML',
  'users': 'Usuarios',
  'flows': 'Flujos',
  'products': 'Productos',
  'roles': 'Roles'
};

interface BreadcrumbsProps {
  className?: string;
  showHome?: boolean;
}

export default function Breadcrumbs({ className = '', showHome = true }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (!pathname) return [];
    const pathSegments = pathname.split('/').filter(segment => segment !== '');
    const breadcrumbs: BreadcrumbItem[] = [];
    
    if (showHome) {
      breadcrumbs.push({
        label: 'Inicio',
        href: '/'
      });
    }
    
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Manejar IDs dinámicos (como [chatbotId], [productId], etc.)
      let label = pathLabels[segment] || segment;
      
      // Si es un ID (contiene solo números o es un UUID), usar un label más descriptivo
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^\d+$/.test(segment)) {
        const previousSegment = pathSegments[index - 1];
        if (previousSegment === 'chat') {
          label = `Chat #${segment.slice(0, 8)}`;
        } else if (previousSegment === 'products') {
          label = `Producto #${segment.slice(0, 8)}`;
        } else if (previousSegment === 'users') {
          label = `Usuario #${segment.slice(0, 8)}`;
        } else {
          label = `#${segment.slice(0, 8)}`;
        }
      }
      
      breadcrumbs.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        href: currentPath,
        isLast: index === pathSegments.length - 1
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <nav className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.href} className="flex items-center">
          {index > 0 && (
            <FiArrowRight className="w-4 h-4 mx-2 text-gray-400" />
          )}
          
          {breadcrumb.isLast ? (
            <span className="font-medium text-gray-900">
              {breadcrumb.label}
            </span>
          ) : (
            <Link 
              href={breadcrumb.href}
              className="hover:text-blue-600 transition-colors duration-200"
            >
              {index === 0 && showHome ? (
                <div className="flex items-center">
                  <FiUser className="w-4 h-4 mr-1" />
                  {breadcrumb.label}
                </div>
              ) : (
                breadcrumb.label
              )}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

// Hook para obtener el breadcrumb actual
export function useBreadcrumb() {
  const pathname = usePathname();
  
  const getCurrentPageTitle = (): string => {
    if (!pathname) return 'Inicio';
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    
    if (!lastSegment) return 'Inicio';
    
    return pathLabels[lastSegment] || lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  };
  
  return {
    currentPageTitle: getCurrentPageTitle(),
    pathname
  };
}