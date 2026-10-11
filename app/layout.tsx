import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-ar' });

export const metadata: Metadata = {
  title: 'ASSET-TO-EXIT AI OPERATING SYSTEM',
  description: 'Institutional-grade asset investment and exit operating system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
