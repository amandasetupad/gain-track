import React from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slab-950 flex flex-col">
      <header className="border-b border-slab-850">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link
            to="/"
            className="flex items-center gap-2 text-gain-500 font-semibold tracking-tight hover:text-gain-400 transition-colors"
            aria-label="GainTrack home"
          >
            <Dumbbell className="w-6 h-6" aria-hidden="true" />
            <span className="font-mono">GainTrack</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="font-mono text-gain-400 text-sm mb-2">404</p>
        <h1 className="text-2xl font-bold text-zinc-100 font-mono mb-2">Page not found</h1>
        <p className="text-zinc-400 text-sm mb-8 max-w-sm">
          That URL doesn’t match a GainTrack page. Check the link or head back home.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-gain-500 hover:bg-gain-600 text-slab-950 font-semibold rounded-lg transition-colors"
        >
          Go home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
