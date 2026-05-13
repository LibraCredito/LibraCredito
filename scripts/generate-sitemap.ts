import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BlogService } from '../src/services/blogService';

// Basic localStorage polyfill for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  } as Storage;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = (process.env.SITE_URL || 'https://libracredito.com.br').replace(/\/$/, '');

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

const staticRoutes: SitemapEntry[] = [
  { loc: '/', changefreq: 'weekly', priority: 1 },
  { loc: '/simulacao', changefreq: 'weekly', priority: 0.9 },
  { loc: '/vantagens', changefreq: 'monthly', priority: 0.8 },
  { loc: '/quem-somos', changefreq: 'monthly', priority: 0.8 },
  { loc: '/blog', changefreq: 'weekly', priority: 0.8 },
  { loc: '/parceiros', changefreq: 'monthly', priority: 0.7 },
  { loc: '/politica-privacidade', changefreq: 'yearly', priority: 0.3 },
  { loc: '/politica-cookies', changefreq: 'yearly', priority: 0.3 },
];

const absoluteUrl = (pathOrUrl: string) => {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const pathname = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${BASE_URL}${pathname === '/' ? '/' : pathname}`;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const renderSitemapEntry = (entry: SitemapEntry) => {
  const lines = [`  <url>`, `    <loc>${escapeXml(absoluteUrl(entry.loc))}</loc>`];

  if (entry.lastmod) {
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  }

  if (entry.changefreq) {
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  }

  if (entry.priority !== undefined) {
    lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
  }

  lines.push(`  </url>`);
  return lines.join('\n');
};

async function generate() {
  const posts = await BlogService.getPublishedPosts();

  const blogRoutes: SitemapEntry[] = posts.map((post) => ({
    loc: `/blog/${post.slug}`,
    lastmod: new Date(post.updatedAt || post.createdAt || new Date()).toISOString(),
    changefreq: 'monthly',
    priority: 0.7,
  }));

  const seenUrls = new Set<string>();
  const sitemapItems = [...staticRoutes, ...blogRoutes]
    .filter((entry) => {
      const loc = absoluteUrl(entry.loc);
      if (seenUrls.has(loc)) {
        return false;
      }
      seenUrls.add(loc);
      return true;
    })
    .map(renderSitemapEntry)
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapItems}\n</urlset>`;

  const rssItems = posts
    .map(post => {
      const url = absoluteUrl(`/blog/${post.slug}`);
      const pubDate = new Date(post.createdAt || new Date()).toUTCString();
      return `  <item>\n    <title><![CDATA[${post.title}]]></title>\n    <link>${escapeXml(url)}</link>\n    <pubDate>${pubDate}</pubDate>\n  </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>Libra Crédito Blog</title>\n  <link>${escapeXml(absoluteUrl('/blog'))}</link>\n  <description>Últimos posts do blog</description>\n${rssItems}\n</channel>\n</rss>`;

  await writeFile(path.resolve(__dirname, '../public/sitemap.xml'), sitemap + '\n', 'utf-8');
  await writeFile(path.resolve(__dirname, '../public/rss.xml'), rss + '\n', 'utf-8');

  console.log('Generated sitemap.xml and rss.xml');
}

generate();
