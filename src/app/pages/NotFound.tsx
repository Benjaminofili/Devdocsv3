import { Link } from 'react-router';
import { FileQuestion, Home, Zap } from 'lucide-react';
import { SEOHead } from '../components/SEOHead';

export function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <SEOHead title="Page Not Found" description="The page you're looking for doesn't exist." noIndex />
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-zinc-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm" style={{ fontWeight: 700 }}>
          ?
        </div>
      </div>
      <h1 className="text-zinc-100 text-4xl mb-2" style={{ fontWeight: 700 }}>404</h1>
      <p className="text-zinc-400 text-lg mb-1">Page not found</p>
      <p className="text-zinc-600 text-sm mb-8 max-w-sm">
        The page you're looking for doesn't exist. Maybe the README for this page wasn't generated yet.
      </p>
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm" style={{ fontWeight: 500 }}>
          <Home className="w-4 h-4" /> Go Home
        </Link>
        <Link to="/generate" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors text-sm" style={{ fontWeight: 500 }}>
          <Zap className="w-4 h-4" /> Generate README
        </Link>
      </div>
    </div>
  );
}