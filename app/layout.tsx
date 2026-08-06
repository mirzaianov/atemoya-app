import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';

import QueryProvider from '../src/components/query-provider';
import ToastProvider from '../src/components/toast-provider';

import styles from './layout.module.css';
import '../src/globals.css';

const isProduction = process.env.NODE_ENV === 'production';

export const metadata: Metadata = {
  description: 'A simple-to-use application to support you in organizing your tasks',
  title: 'Atemoya',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>
          <QueryProvider>
            <div className={styles.page}>{children}</div>
          </QueryProvider>
        </NuqsAdapter>
        <ToastProvider />
        {isProduction ? <Analytics /> : null}
      </body>
    </html>
  );
}
