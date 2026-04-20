// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', });

export const metadata: Metadata = {
  title: { default: 'profitOS — CFO Digital', template: '%s | profitOS' },
  description: 'Sistema de inteligência financeira para agências e PMEs. Controle seu fluxo de caixa, precifique projetos e tome decisões com dados.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
