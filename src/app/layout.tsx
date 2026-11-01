import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wall Vault',
  description: 'Wallpapers that download cropped to your exact screen size.',
};

export const viewport: Viewport = {
  themeColor: '#0E1114',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
