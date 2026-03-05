import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import SessionExpiredModal from '@/components/SessionExpiredModal';
import { ToastProvider } from '@/providers/toast-provider';
import { InsightProvider } from '@/contexts/InsightContext';
import FloatingInsightIndicator from '@/components/FloatingInsightIndicator';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MindDash',
  description: 'Plataforma de chatbots inteligentes para análisis de datos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="bg-background text-foreground" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('minddash-theme');var m=(t==='light'||t==='dark')?t:'dark';if(m==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
        <QueryProvider>
          <InsightProvider>
            {children}
            <FloatingInsightIndicator />
          </InsightProvider>
          <SessionExpiredModal />
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
