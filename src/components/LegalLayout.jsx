import React from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import Footer from './Footer';

export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-slab-950 flex flex-col">
      <header className="border-b border-slab-850 bg-slab-950/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 font-mono mb-2">{title}</h1>
        {updated && <p className="text-sm text-zinc-400 mb-8">Last updated: {updated}</p>}
        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
