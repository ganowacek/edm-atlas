import { useState } from 'react';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import AboutPage from './pages/AboutPage';
import Nav from './components/Nav';
import GenrePanel from './components/GenrePanel';
import type { Genre } from './types';

export type Page = 'home' | 'map' | 'timeline' | 'about';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {page !== 'home' && (
        <Nav current={page} onNavigate={setPage} />
      )}
      {page === 'home' && <HomePage onNavigate={setPage} />}
      {page === 'map' && <MapPage onSelectGenre={setSelectedGenre} />}
      {page === 'timeline' && <TimelinePage onSelectGenre={setSelectedGenre} />}
      {page === 'about' && <AboutPage />}
      {selectedGenre && (
        <GenrePanel genre={selectedGenre} onClose={() => setSelectedGenre(null)} />
      )}
    </div>
  );
}
