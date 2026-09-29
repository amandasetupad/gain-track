import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slab-850 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-zinc-400 font-mono text-xs">© {new Date().getFullYear()} GainTrack</p>
        <nav className="flex items-center gap-4 text-sm" aria-label="Legal">
          <Link to="/privacy" className="text-zinc-400 hover:text-gain-400 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-zinc-400 hover:text-gain-400 transition-colors">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
