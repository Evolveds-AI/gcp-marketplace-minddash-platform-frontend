'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  FiUser, 
  FiMessageSquare, 
  FiSettings, 
  FiUsers, 
  FiDatabase, 
  FiLink, 
  FiFilePlus,
  FiChevronDown,
  FiArrowRight
} from '@/lib/icons';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
  children?: NavigationItem[];
}

interface OptimizedNavigationProps {
  className?: string;
  collapsed?: boolean;
}

export default function OptimizedNavigation({ className = '', collapsed = false }: OptimizedNavigationProps) {
  const [userRole, setUserRole] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const adminDashboardHref = pathname?.startsWith('/dashboard/admin3') || pathname?.startsWith('/dashboard/vistro') ? '/dashboard/admin3' : '/dashboard/admin';

  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: FiUser,
      roles: ['super_admin', 'admin', 'user'],
      children: [
        {
          label: 'Administrador',
          href: adminDashboardHref,
          icon: FiSettings,
          roles: ['super_admin', 'admin']
        },
        {
          label: 'Usuario',
          href: '/dashboard/user',
          icon: FiUsers,
          roles: ['super_admin', 'admin', 'user']
        }
      ]
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: FiMessageSquare,
      roles: ['super_admin', 'admin', 'user'],
      children: [
        {
          label: 'Selector',
          href: '/chat/selector',
          icon: FiMessageSquare,
          roles: ['super_admin', 'admin', 'user']
        },
        {
          label: 'Próximamente',
          href: '/chat/coming-soon',
          icon: FiMessageSquare,
          roles: ['super_admin', 'admin', 'user']
        }
      ]
    },
    {
      label: 'Administración',
      href: '/admin',
      icon: FiSettings,
      roles: ['super_admin', 'admin'],
      children: [
        {
          label: 'Usuarios',
          href: '/admin/users',
          icon: FiUsers,
          roles: ['super_admin', 'admin']
        },
        {
          label: 'Integraciones',
          href: '/admin/integrations',
          icon: FiLink,
          roles: ['super_admin', 'admin'],
          children: [
            {
              label: 'Conectores',
              href: '/admin/integrations/connectors',
              icon: FiLink,
              roles: ['super_admin', 'admin']
            },
            {
              label: 'Fuentes de Datos',
              href: '/admin/integrations/data-sources',
              icon: FiDatabase,
              roles: ['super_admin', 'admin']
            }
          ]
        },
        {
          label: 'Configuración',
          href: '/admin/config',
          icon: FiFilePlus,
          roles: ['super_admin', 'admin'],
          children: [
            {
              label: 'YAML',
              href: '/admin/config/yaml',
              icon: FiFilePlus,
              roles: ['super_admin', 'admin']
            }
          ]
        },
        {
          label: 'Flujos',
          href: '/admin/flows',
          icon: FiFilePlus,
          roles: ['super_admin', 'admin']
        }
      ]
    },
    {
      label: 'Productos',
      href: '/products',
      icon: FiDatabase,
      roles: ['super_admin', 'admin']
    }
  ];

  useEffect(() => {
    const authData = localStorage.getItem('evolve-auth');
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        setUserRole(auth.role || '');
      } catch (e) {
        console.error('Error al obtener rol:', e);
      }
    }
  }, []);

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasAccess = (roles: string[]) => {
    return roles.includes(userRole);
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    if (!hasAccess(item.roles)) {
      return null;
    }

    const resolvedHref = item.href === '/dashboard/admin' ? adminDashboardHref : item.href;

    const isExpanded = expandedItems.includes(resolvedHref);
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(resolvedHref);

    return (
      <div key={resolvedHref} className={`mb-1 ${level > 0 ? 'ml-4' : ''}`}>
        <div
          className={`
            flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors
            ${active 
              ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
              : 'text-gray-700 hover:bg-gray-100'
            }
            ${collapsed ? 'justify-center' : ''}
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(resolvedHref);
            } else {
              router.push(resolvedHref);
            }
          }}
        >
          <div className="flex items-center">
            <item.icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
            {!collapsed && (
              <span className="font-medium">{item.label}</span>
            )}
          </div>
          {!collapsed && hasChildren && (
            <div className="ml-2">
              {isExpanded ? (
                <FiChevronDown className="w-4 h-4" />
              ) : (
                <FiArrowRight className="w-4 h-4" />
              )}
            </div>
          )}
        </div>
        
        {!collapsed && hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={`bg-white border-r border-gray-200 ${className}`}>
      <div className="p-4">
        <h2 className={`font-bold text-gray-800 mb-4 ${collapsed ? 'text-center text-sm' : 'text-lg'}`}>
          {collapsed ? 'Nav' : 'Navegación'}
        </h2>
        <div className="space-y-1">
          {navigationItems.map(item => renderNavigationItem(item))}
        </div>
      </div>
    </nav>
  );
}