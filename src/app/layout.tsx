import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppPollarProvider } from '@/components/pollar-provider';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' });

// Prefer an explicitly configured URL; fall back to the Vercel-provided one so
// social cards resolve on preview deployments too.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

const title = 'AfriPuente — Local money. Connected continents.';
const description =
  'Pay from Nigeria to Bolivia with clear fees, local funding options, and payment tracking powered by Pollar on Stellar.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: '%s — AfriPuente' },
  description,
  applicationName: 'AfriPuente',
  keywords: ['remittance', 'Nigeria', 'Bolivia', 'Stellar', 'Pollar', 'USDC', 'payments'],
  openGraph: {
    type: 'website',
    siteName: 'AfriPuente',
    title,
    description,
    url: siteUrl,
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#080d19',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[var(--accent-ink)]"
        >
          Skip to content
        </a>
        <AppPollarProvider>{children}</AppPollarProvider>
      </body>
    </html>
  );
}
