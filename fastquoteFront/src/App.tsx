import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ChatPage } from './pages/ChatPage.tsx';
import { ProductosPage } from './pages/ProductosPage.tsx';
import type { DashboardSection } from './components/DashboardShell';

function App() {
  const [section, setSection] = useState<DashboardSection>('dashboard');

  const navigate = (nextSection: DashboardSection) => {
    setSection(nextSection);
  };

  const handleNavigate = (nextSection: DashboardSection) => navigate(nextSection);

  if (section === 'dashboard') {
    return <DashboardPage onNavigate={handleNavigate} />;
  }

  if (section === 'productos') {
    return <ProductosPage onNavigate={handleNavigate} />;
  }

  return <ChatPage onNavigate={handleNavigate} />;
}

export default App;
