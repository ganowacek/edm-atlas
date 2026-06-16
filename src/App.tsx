import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import AboutPage from './pages/AboutPage';
import Nav from './components/Nav';

export type Page = 'home' | 'map' | 'timeline' | 'about';
export type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const saved = window.localStorage.getItem('edm-atlas-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('edm-atlas-theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {page !== 'home' && <Nav current={page} onNavigate={setPage} theme={theme} onToggleTheme={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} />}
      {page === 'home' && <HomePage onNavigate={setPage} theme={theme} onToggleTheme={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} />}
      {page === 'map' && <MapPage />}
      {page === 'timeline' && <TimelinePage />}
      {page === 'about' && <AboutPage />}
    </div>
  );
}
