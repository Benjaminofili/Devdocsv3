import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header';
import { WaitlistModal } from './WaitlistModal';
import { Toaster } from 'sonner';
import { getDevDocsIconSVG } from './DevDocsIcon';
import { ScrollProgress } from './ScrollProgress';
import { BackToTop } from './BackToTop';
import { CommandPalette } from './CommandPalette';

/**
 * Renders the DevDocs SVG icon onto a canvas at the given size
 * and returns a PNG data-URI. Used to build PWA manifest icons.
 */
function renderIconToPng(size: number): Promise<string> {
  return new Promise((resolve) => {
    const svgString = getDevDocsIconSVG();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

/**
 * Generates a PWA Web App Manifest with dynamically-rendered PNG icons
 * and injects it as a <link rel="manifest"> in <head>.
 */
async function injectManifest() {
  const sizes = [48, 72, 96, 128, 144, 192, 256, 384, 512];
  const icons = await Promise.all(
    sizes.map(async (size) => {
      const src = await renderIconToPng(size);
      return {
        src,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any maskable',
      };
    })
  );

  // Also add the raw SVG as an icon entry (modern browsers)
  const svgEncoded = `data:image/svg+xml,${encodeURIComponent(getDevDocsIconSVG())}`;
  icons.push({
    src: svgEncoded,
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any maskable',
  });

  const manifest = {
    name: 'DevDocs V2 — AI-Powered README Generator',
    short_name: 'DevDocs',
    description:
      'Generate professional README files for your GitHub repositories in seconds using AI-powered stack detection.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#6366f1',
    orientation: 'portrait-primary',
    categories: ['developer tools', 'productivity', 'utilities'],
    icons,
  };

  const blob = new Blob([JSON.stringify(manifest)], {
    type: 'application/json',
  });
  const manifestUrl = URL.createObjectURL(blob);

  let link = document.querySelector(
    'link[rel="manifest"]'
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = manifestUrl;
}

export function Layout() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    document.documentElement.lang = 'en';

    // --- Favicon from custom SVG icon ---
    const svgString = getDevDocsIconSVG();
    const encoded = `data:image/svg+xml,${encodeURIComponent(svgString)}`;
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = encoded;

    // Apple touch icon — render a 180px PNG for iOS
    renderIconToPng(180).then((pngUri) => {
      if (!pngUri) return;
      let apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (!apple) {
        apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        document.head.appendChild(apple);
      }
      apple.href = pngUri;
    });

    // --- PWA manifest ---
    injectManifest();

    // --- Base meta that doesn't change per-page ---
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('name', 'viewport', 'width=device-width, initial-scale=1');
    setMeta('name', 'theme-color', '#6366f1');
    setMeta('name', 'mobile-web-app-capable', 'yes');
    setMeta('name', 'apple-mobile-web-app-capable', 'yes');
    setMeta('name', 'apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('name', 'apple-mobile-web-app-title', 'DevDocs');
    setMeta('property', 'og:image', 'https://devdocs.dev/og-image.png'); // placeholder
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <ScrollProgress />
      {/* Skip-to-content for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <WaitlistModal />
      <CommandPalette />
      <BackToTop />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #3f3f46',
            color: '#f4f4f5',
          },
        }}
      />
    </div>
  );
}