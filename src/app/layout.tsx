// src/app/layout.tsx
import type { Metadata } from 'next';

import { Providers } from './providers';
import '@/app/globals.css';


export const metadata: Metadata = {
  title: { default: 'profitOS — CFO Digital', template: '%s | profitOS' },
  description: 'Sistema de inteligência financeira para agências e PMEs. Controle seu fluxo de caixa, precifique projetos e tome decisões com dados.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
    <body >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
