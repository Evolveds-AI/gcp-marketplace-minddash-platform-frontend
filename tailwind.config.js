/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/vistro-shell/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				dark: '#2563eb',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			/* === MindDash Design System === */
  			minddash: {
  				/* Celeste (Primario) */
  				celeste: {
  					50: '#e6fbff',
  					100: '#bff3fb',
  					200: '#8fe8f7',
  					300: '#5fddf2',
  					400: '#2fd2ee',
  					500: '#00a5cf', /* Base Primario */
  					600: '#008fb3',
  					700: '#007996',
  					800: '#006278',
  					900: '#004e64'
  				},
  				/* Verde (Secundario/Éxito) */
  				verde: {
  					50: '#ecfdf6',
  					100: '#d1fae5',
  					200: '#a7f3d0',
  					300: '#9fffcb',
  					400: '#7ae582',
  					500: '#25a18e', /* Base Secundario/Éxito */
  					600: '#1f8c7b',
  					700: '#197768',
  					800: '#136255',
  					900: '#0d4d42'
  				},
  				/* Neutros */
  				gray: {
  					50: '#f9fafb',
  					100: '#f3f4f6',
  					200: '#e5e7eb',
  					300: '#d1d5db',
  					400: '#9ca3af',
  					500: '#6b7280',
  					600: '#4b5563',
  					700: '#374151',
  					800: '#1f2937',
  					900: '#111827'
  				},
  				/* Fondos (Dark Theme) */
  				bg: '#0a0a0a',
  				surface: '#111111',
  				card: '#1a1a1a',
  				elevated: '#222222',
  				/* Bordes */
  				border: '#2a2a2a',
  				'border-subtle': '#333333',
  				/* Texto */
  				'text-primary': '#e5e7eb',
  				'text-secondary': '#9ca3af',
  				'text-muted': '#6b7280',
  				'text-inverse': '#0a0a0a',
  				/* Estados */
  				success: '#25a18e',
  				'success-hover': '#1f8c7b',
  				warning: '#f59e0b',
  				'warning-hover': '#d97706',
  				error: '#ef4444',
  				'error-hover': '#dc2626',
  				info: '#00a5cf',
  				'info-hover': '#008fb3'
  			},
  			/* Vistro Theme Colors */
  			'white-light': '#e0e6ed',
  			'white-dark': '#888ea8',
  			'dark-light': 'rgba(59,63,92,.15)',
  			success: {
  				DEFAULT: '#00ab55',
  				light: '#ddf5f0',
  				'dark-light': 'rgba(0,171,85,.15)',
  			},
  			danger: {
  				DEFAULT: '#e7515a',
  				light: '#fff5f5',
  				'dark-light': 'rgba(231,81,90,.15)',
  			},
  			warning: {
  				DEFAULT: '#e2a03f',
  				light: '#fff9ed',
  				'dark-light': 'rgba(226,160,63,.15)',
  			},
  			info: {
  				DEFAULT: '#2196f3',
  				light: '#e7f7ff',
  				'dark-light': 'rgba(33,150,243,.15)',
  			},
  			dark: {
  				DEFAULT: '#3b3f5c',
  				light: '#eaeaec',
  				'dark-light': 'rgba(59,63,92,.15)',
  			},
  			'vistro-black': {
  				DEFAULT: '#0e1726',
  				light: '#e3e4eb',
  				'dark-light': 'rgba(14,23,38,.15)',
  			},
  			darkBg: '#1f2937',
  			darkSecondary: '#374151',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		animation: {
  			shake: 'shake 0.5s ease-in-out',
  			shine: 'shine var(--duration, 14s) infinite linear'
  		},
  		keyframes: {
  			shine: {
  				'0%': {
  					backgroundPosition: '0% 0%'
  				},
  				'50%': {
  					backgroundPosition: '100% 100%'
  				},
  				'100%': {
  					backgroundPosition: '0% 0%'
  				}
  			},
  			shake: {
  				'0%, 100%': {
  					transform: 'translateX(0)'
  				},
  				'10%, 30%, 50%, 70%, 90%': {
  					transform: 'translateX(-2px)'
  				},
  				'20%, 40%, 60%, 80%': {
  					transform: 'translateX(2px)'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
