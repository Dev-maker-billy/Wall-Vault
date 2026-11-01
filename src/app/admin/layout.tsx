import type { Metadata } from 'next';
import AdminPwa from '@/components/admin/AdminPwa';

export const metadata: Metadata = {
  title: 'Vault Admin',
  robots: { index: false, follow: false },
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'Vault Admin', statusBarStyle: 'black-translucent' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminPwa />
      {children}
    </>
  );
}
