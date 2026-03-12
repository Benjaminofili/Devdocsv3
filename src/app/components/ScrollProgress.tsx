import { useState, useEffect } from 'react';

/**
 * Thin gradient progress bar at the very top of the viewport
 * showing how far the user has scrolled down the page.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (progress <= 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px]">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
