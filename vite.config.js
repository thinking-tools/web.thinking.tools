import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const SITE_URL = 'https://thinking.tools';
const LANGUAGES = ['en', 'es', 'fr', 'de', 'cs'];

/** @returns {import('vite').Plugin} */
const sitemap = () => ({
  name: 'generate-sitemap',
  closeBundle() {
    const today = new Date().toISOString().split('T')[0];

    const paths = [
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      ...LANGUAGES.filter(l => l !== 'en').map(l => ({
        path: `/${l}`,
        priority: '0.8',
        changefreq: 'monthly',
      })),
    ];

    const hreflangs = path =>
      LANGUAGES.map(lang => {
        const href = lang === 'en' ? `${SITE_URL}/` : `${SITE_URL}/${lang}`;
        return `      <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
      })
        .concat(`      <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/" />`)
        .join('\n');

    const urls = paths
      .map(
        ({ path, priority, changefreq }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflangs(path)}
  </url>`,
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls}
</urlset>
`;

    writeFileSync(resolve('docs', 'sitemap.xml'), xml);
    console.log('\x1b[32m✓ sitemap.xml generated\x1b[0m');

    const robotsTxt = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

    writeFileSync(resolve('docs', 'robots.txt'), robotsTxt);
    console.log('\x1b[32m✓ robots.txt generated\x1b[0m');

    const llmsTxt = `# thinking.tools

> Open technology that runs anywhere, works for everyone.

thinking.tools is a Prague-based open-source technology company building privacy-first, decentralized systems. We create tools that respect user privacy, sovereignty, and the right to tinker.

## Project UNIMO

UNIMO is a privacy-first iCloud alternative for all devices (iOS, Android, Desktop). It provides file storage, photos, notes, and clipboard sync without Big Tech surveillance. Key features:

- End-to-end encrypted with post-quantum cryptography
- Cross-device sync for files, photos, notes, and clipboard
- Secure sharing with trusted contacts
- Self-hostable and fully auditable
- Built on open protocols and standard infrastructure

## Mission

We build open infrastructure on standard protocols — post-quantum crypto, distributed systems, self-hosted storage — wrapped in interfaces normal humans can actually use. No dark patterns, no manipulation, no data harvesting.

### Core Values

- **Empower agency**: Clear, honest tools that treat users like humans, not metrics
- **Built to tinker**: Fast, simple, open, and fork-able
- **Open & Connected**: Data lives where you point it, built on protocols that predate the attention economy

## Careers

We're a small team in Prague tackling hard problems. Open roles:

- Senior Mobile Engineer (Android)
- Fullstack Developer (TypeScript)
- Infra Engineer (SGX/TDX/SEV familiarity)

Contact: ahoy@thinking.tools

## Company Details

- **Legal name**: thinking.tools s.r.o.
- **Location**: Korunní 2569/108, Prague 10 - Vinohrady, 10100, Czechia
- **VAT ID**: CZ23956526

## Links

- Website: ${SITE_URL}
- GitHub: https://github.com/thinking-tools
- Codeberg: https://codeberg.org/thinking_tools
- LinkedIn: https://www.linkedin.com/company/thinking-dot-tools
- Bluesky: https://bsky.app/profile/thinkingtools.bsky.social
- Status: https://thinking-tools.instatus.com
`;

    writeFileSync(resolve('docs', 'llms.txt'), llmsTxt);
    console.log('\x1b[32m✓ llms.txt generated\x1b[0m');
  },
});

export default defineConfig({
  plugins: [tailwindcss(), sitemap()],
  // server: {
  //   host: '0.0.0.0',
  //   allowedHosts: ['.ngrok-free.app'],
  // },
  base: './',
  build: {
    outDir: 'docs',
    cssMinify: true,
    rollupOptions: { input: [resolve('index.html'), resolve('inference.html')] },
  },
});
