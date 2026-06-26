import { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { EquipmentList } from './components/Equipment/EquipmentList';
import { ConsumablesList } from './components/Consumables/ConsumablesList';
import { TokensList } from './components/Tokens/TokensList';
import { LoginPage } from './components/Auth/LoginPage';
import { UsersPage } from './components/Auth/UsersPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import type { NavSection } from './types';

function AppInner() {
  const { user, loading } = useAuth();
  const [section, setSection] = useState<NavSection>('dashboard');

  // Ждём пока AuthContext проверит сохранённый токен
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--color-deep)' }}>
        <div className="flex flex-col items-center gap-4">
          {/* Neon spinner */}
          <div className="relative w-14 h-14">
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                border: '2px solid transparent',
                borderTopColor: '#00f5ff',
                borderRightColor: '#00f5ff44',
                filter: 'drop-shadow(0 0 6px #00f5ff)',
              }}
            />
            <div
              className="absolute inset-3 rounded-full animate-spin"
              style={{
                border: '1px solid transparent',
                borderBottomColor: '#b400ff',
                animationDirection: 'reverse',
                animationDuration: '0.8s',
                filter: 'drop-shadow(0 0 4px #b400ff)',
              }}
            />
          </div>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}
          >
            INITIALIZING...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const renderSection = () => {
    switch (section) {
      case 'dashboard':   return <Dashboard onNavigate={setSection} />;
      case 'equipment':   return <EquipmentList />;
      case 'consumables': return <ConsumablesList />;
      case 'tokens':      return <TokensList />;
      case 'users':       return <UsersPage currentUserId={user!.id} />;
    }
  };

  return (
    <Layout active={section} onNavigate={setSection}>
      {renderSection()}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ToastProvider>
  );
}

