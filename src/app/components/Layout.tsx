import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header';
import { WaitlistModal } from './WaitlistModal';
import { Toaster } from 'sonner';

export function Layout() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <WaitlistModal />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #3f3f46',
            color: '#f4f4f5',
          },
        }}
      />
    </div>
  );
}