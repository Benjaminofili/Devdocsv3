import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'DevDocs V2';
const DEFAULT_DESCRIPTION =
  'AI-powered README generator for GitHub repositories. Paste a repo URL, get a professional README in seconds. Built for developers.';
const BASE_URL = 'https://devdocs.dev'; // placeholder — update after deploy

/**
 * Manages document <head> for SEO: title, meta description, Open Graph,
 * Twitter Card, canonical link, and structured data.
 *
 * Call once per page/route to set page-specific metadata.
 */
export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  ogType = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — AI-Powered README Generator`;
  const canonicalUrl = `${BASE_URL}${path}`;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper to set/create a <meta> tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Basic meta
    setMeta('name', 'description', description);
    setMeta('name', 'author', 'DevDocs V2');
    setMeta('name', 'theme-color', '#6366f1');

    // Robots
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'en_US');
    // og:image is set once in Layout (static asset)

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);

    // Keywords (lightweight — mostly for legacy crawlers)
    setMeta(
      'name',
      'keywords',
      'readme generator, ai readme, github readme, developer documentation, devdocs, open source, markdown generator'
    );

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);

    // JSON-LD structured data (WebApplication)
    const ldId = 'devdocs-jsonld';
    let script = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = ldId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: BASE_URL,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'AI Stack Detection',
        'GitHub Repository Analysis',
        'Professional README Generation',
        'Markdown Preview & Export',
      ],
    });
  }, [fullTitle, description, canonicalUrl, ogType, noIndex]);

  return null; // head-only side-effects
}
