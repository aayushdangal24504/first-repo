import { AppShell } from '@/components/layout/AppShell';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { useAuthStore } from '@/store/auth-store';
import { useEffect } from 'react';

export const App = () => {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => { void hydrate(); }, [hydrate]);

  if (loading && !user) {
    return <div className="grid h-screen place-items-center bg-surface font-display text-3xl font-bold text-ink">Opening Ayvukta...</div>;
  }

  return user ? <AppShell key={user.id} /> : <AuthScreen />;
};
