import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ReviewModal from '@/components/ReviewModal';

export const dynamic = 'force-dynamic';

export default async function SeekerLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'seeker' && profile.role !== 'both' && profile.role !== 'admin')) {
    redirect('/login');
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
        <ReviewModal />
      </main>
    </div>
  );
}
