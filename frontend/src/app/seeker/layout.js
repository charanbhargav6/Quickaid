'use client';
import Sidebar from '@/components/Sidebar';

export default function SeekerLayout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
