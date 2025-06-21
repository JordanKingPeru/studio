
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientProviders } from '@/components/client-providers';
import { AuthProvider } from '@/context/AuthContext'; // NUEVA IMPORTACIÓN
import ProtectedRoute from '@/components/auth/ProtectedRoute'; // NUEVA IMPORTACIÓN

export const metadata: Metadata = {
  title: 'OriGo - Intelligent Trip Planner',
  description: 'Plan and manage your trips with ease using OriGo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider> {/* ENVOLVEMOS CON AUTHPROVIDER */}
            <ClientProviders>
              <ProtectedRoute> {/* ENVOLVEMOS CON PROTECTEDROUTE */}
                {children}
              </ProtectedRoute>
              <Toaster />
            </ClientProviders>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
