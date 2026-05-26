import { redirect } from 'next/navigation';

export default function Home() {
  // Simple redirect to dashboard for now
  // In a real app, this would check auth state first
  redirect('/login');
}
