import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppPollarProvider } from '@/components/pollar-provider';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AfriPuente — Local money. Connected continents.',
  description:
    'Pay a Bolivian recipient from Nigeria. Fund in naira, settle on Stellar, deliver bolivianos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppPollarProvider>{children}</AppPollarProvider>
      </body>
    </html>
  );
}
