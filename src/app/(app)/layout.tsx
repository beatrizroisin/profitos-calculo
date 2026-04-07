import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const user = session.user as any;
  if (!user.companyId) redirect('/register'); // Google user without company

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole={user.role} companyName={user.companyName} userName={user.name} avatarUrl={user.avatarUrl} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userName={user.name} companyName={user.companyName} userRole={user.role} avatarUrl={user.avatarUrl} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-in max-w-screen-2xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
