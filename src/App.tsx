import { useState } from 'react';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import AboutPage from './pages/AboutPage';
import Nav from './components/Nav';

export type Page = 'home' | 'map' | 'timeline' | 'about';

export default function App() {
  const [page, setPage] = useState<Page>('home');

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {page !== 'home' && <Nav current={page} onNavigate={setPage} />}
      {page === 'home' && <HomePage onNavigate={setPage} />}
      {page === 'map' && <MapPage />}
      {page === 'timeline' && <TimelinePage />}
      {page === 'about' && <AboutPage />}
    </div>
  );
}
