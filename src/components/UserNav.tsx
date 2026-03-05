'use client';

import * as React from 'react';
import { 
  FiUser, 
  FiSettings, 
  FiLogOut, 
  FiHelpCircle, 
  FiMoon, 
  FiSun,
  FiChevronUp 
} from '@/lib/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';
import { startThemeTransition, applyAppTheme } from '@/lib/theme/theme-transition';

interface UserNavProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userRole?: string;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  collapsed?: boolean;
  themeMode?: 'light' | 'dark';
  onThemeChange?: (mode: 'light' | 'dark') => void;
}

export function UserNav({
  userName = 'Usuario',
  userEmail = 'usuario@ejemplo.com',
  userAvatar,
  userRole,
  onLogout,
  onProfileClick,
  onSettingsClick,
  onHelpClick,
  collapsed = false,
  themeMode = 'dark',
  onThemeChange,
}: UserNavProps) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(themeMode);
  const { applyThemeClass } = useThemeMode();

  React.useEffect(() => {
    setTheme(themeMode);
  }, [themeMode]);

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    startThemeTransition(() => {
      setTheme(nextTheme);
      applyAppTheme(nextTheme);
      onThemeChange?.(nextTheme);
    });
  };

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-minddash-celeste-500 focus:ring-offset-2 ${applyThemeClass(
              'hover:bg-minddash-card/40 focus:ring-offset-minddash-bg',
              'hover:bg-gray-100 focus:ring-offset-white'
            )}`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="bg-gradient-to-br from-minddash-celeste-400 to-minddash-celeste-600 text-white text-xs">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className={applyThemeClass('w-56 bg-[#1c1c1c] border-gray-700', 'w-56')} 
          align="end"
          side="right"
        >
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none flex items-center gap-2">
                {userName}
                {userRole === 'super_admin' && (
                  <Badge variant="destructive" className="text-xs px-2 py-0.5">
                    SUPER ADMIN
                  </Badge>
                )}
              </p>
              <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem 
              onClick={onProfileClick}
              className="cursor-pointer"
            >
              <FiUser className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onSettingsClick}
              className="cursor-pointer"
            >
              <FiSettings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={toggleTheme}
              className="cursor-pointer"
            >
              {theme === 'dark' ? (
                <FiSun className="mr-2 h-4 w-4" />
              ) : (
                <FiMoon className="mr-2 h-4 w-4" />
              )}
              <span>Cambiar tema</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onHelpClick}
            className="cursor-pointer"
          >
            <FiHelpCircle className="mr-2 h-4 w-4" />
            <span>Ayuda</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onLogout?.()}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <FiLogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-minddash-celeste-500 focus:ring-offset-2 ${applyThemeClass(
            'hover:bg-minddash-card/40 focus:ring-offset-minddash-bg',
            'hover:bg-gray-100 focus:ring-offset-white'
          )}`}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="bg-gradient-to-br from-minddash-celeste-400 to-minddash-celeste-600 text-white text-sm">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <p className={`truncate font-medium ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>{userName}</p>
            <p className={`truncate text-xs ${applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}`}>{userEmail}</p>
          </div>
          <FiChevronUp className={`h-4 w-4 flex-shrink-0 ${applyThemeClass('text-gray-400', 'text-gray-600')}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className={applyThemeClass('w-56 bg-[#1c1c1c] border-gray-700', 'w-56')} 
        align="end"
        side="top"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={onProfileClick}
            className="cursor-pointer"
          >
            <FiUser className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onSettingsClick}
            className="cursor-pointer"
          >
            <FiSettings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={toggleTheme}
            className="cursor-pointer"
          >
            {theme === 'dark' ? (
              <FiSun className="mr-2 h-4 w-4" />
            ) : (
              <FiMoon className="mr-2 h-4 w-4" />
            )}
            <span>Cambiar tema</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onHelpClick}
          className="cursor-pointer"
        >
          <FiHelpCircle className="mr-2 h-4 w-4" />
          <span>Ayuda</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onLogout?.()}
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <FiLogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
