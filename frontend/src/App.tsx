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
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
            Загрузка...
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

