/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  eslint: {
    // Solo ignorar durante builds, no en desarrollo
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  images: {
    unoptimized: true,
    domains: ['quickchart.io'], // Permitir imágenes de QuickChart para fallback
  },
  // Asegurar que JavaScript se cargue correctamente
  experimental: {
    optimizeCss: false, // Desactivar optimización CSS que puede causar problemas
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  // Redirects automáticos para mantener compatibilidad con URLs antiguas
  async redirects() {
    return [
      {
        source: '/admin-client',
        destination: '/dashboard/admin',
        permanent: true,
      },
      {
        source: '/admin-client/:path*',
        destination: '/dashboard/admin/:path*',
        permanent: true,
      },
      {
        source: '/user-dashboard',
        destination: '/dashboard/user',
        permanent: true,
      },
      {
        source: '/client/:clientId',
        destination: '/dashboard/client/:clientId',
        permanent: true,
      },
      {
        source: '/client/:clientId/:path*',
        destination: '/dashboard/client/:clientId/:path*',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig;
// export default nextConfig;