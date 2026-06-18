import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import Nav from './components/Nav';

const HomePage = lazy(() => import('./pages/HomePage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

export type Page = 'home' | 'map' | 'timeline' | 'about';
export type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem('edm-atlas-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage may be unavailable in privacy-focused browsing contexts.
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function pageFromHash(): Page {
  const candidate = window.location.hash.slice(1);
  return candidate === 'map' || candidate === 'timeline' || candidate === 'about' ? candidate : 'home';
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('edm-atlas-theme', theme);
    } catch {
      // The theme still works for this session when persistence is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const syncPage = () => setPage(pageFromHash());
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  const navigate = useCallback((nextPage: Page) => {
    if (nextPage === page) return;
    window.location.hash = nextPage === 'home' ? '' : nextPage;
    setPage(nextPage);
  }, [page]);

  const toggleTheme = useCallback(() => {
    setTheme((value) => value === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {page !== 'home' && <Nav current={page} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />}
      <Suspense fallback={<div className="min-h-screen" aria-label="Loading page" />}>
        {page === 'home' && <HomePage onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />}
        {page === 'map' && <MapPage />}
        {page === 'timeline' && <TimelinePage />}
        {page === 'about' && <AboutPage />}
      </Suspense>
    </div>
  );
}
