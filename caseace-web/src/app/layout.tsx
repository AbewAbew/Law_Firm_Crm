// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/theme/ThemeProvider';
import { Toaster } from 'react-hot-toast';
import NavigationProgress from '@/components/ProgressBar';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CaseAce',
  description: 'Law Firm Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NavigationProgress />
        <PerformanceMonitor />
        <ThemeProvider>
          <Toaster position="bottom-right" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}