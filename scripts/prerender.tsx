import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FilledContext } from 'react-helmet-async';
import AppServer from '../src/AppServer';
import { BLOG_POSTS } from '../src/data/blogPosts';
import type { BlogPost } from '../src/services/blogService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteConfig {
  url: string;
  file: string;
  title?: string;
  description?: string;
  data?: any;
}

interface SupabaseBlogPostRow {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string | null;
  image_url: string | null;
  slug: string;
  read_time: number | null;
  published: boolean;
  featured_post: boolean;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

type SupabaseDatabase = {
  public: {
    Tables: {
      blog_posts: {
        Row: SupabaseBlogPostRow;
      };
    };
  };
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

function mapSupabasePost(row: SupabaseBlogPostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    content: row.content ?? '',
    imageUrl: row.image_url ?? '',
    slug: row.slug,
    readTime: row.read_time ?? 0,
    published: row.published,
    featuredPost: row.featured_post,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    tags: row.tags ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

let supabaseClient: SupabaseClient<SupabaseDatabase> | null = null;

function getSupabaseClient(): SupabaseClient<SupabaseDatabase> | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<SupabaseDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }

  return supabaseClient;
}

async function fetchPublishedPosts(): Promise<BlogPost[]> {
  const fallbackPosts = BLOG_POSTS.filter((post) => post.published);
  const client = getSupabaseClient();

  if (!client) {
    console.warn('Supabase credentials missing. Falling back to static blog posts.');
    return fallbackPosts;
  }

  try {
    const { data, error } = await client
      .from('blog_posts')
      .select(
        [
          'id',
          'title',
          'description',
          'category',
          'content',
          'image_url',
          'slug',
          'read_time',
          'published',
          'featured_post',
          'meta_title',
          'meta_description',
          'tags',
          'created_at',
          'updated_at',
        ].join(',')
      )
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data) {
      return fallbackPosts;
    }

    return data.map(mapSupabasePost);
  } catch (error) {
    console.error('Failed to fetch blog posts from Supabase, using fallback data.', error);
    return fallbackPosts;
  }
}

function injectHelmetData(html: string, helmetContext: FilledContext) {
  const { helmet } = helmetContext;
  let processedHtml = html;

  if (helmet) {
    const title = helmet.title.toString();
    if (title) {
      processedHtml = processedHtml.replace(/<title>.*?<\/title>/, title);
    }

    const htmlAttrs = helmet.htmlAttributes.toString();
    if (htmlAttrs) {
      processedHtml = processedHtml.replace(/<html[^>]*>/, `<html ${htmlAttrs}>`);
    }

    const bodyAttrs = helmet.bodyAttributes.toString();
    if (bodyAttrs) {
      processedHtml = processedHtml.replace('<body', `<body ${bodyAttrs}`);
    }

    const headTags = [
      helmet.meta.toString(),
      helmet.link.toString(),
      helmet.script.toString(),
      helmet.noscript.toString(),
      helmet.style.toString(),
      helmet.base.toString(),
    ]
      .filter(Boolean)
      .join('\n');

    if (headTags) {
      processedHtml = processedHtml.replace('</head>', `${headTags}\n</head>`);
    }
  }

  return processedHtml;
}

function injectInitialData(html: string, data: any) {
  if (!data) {
    return html;
  }

  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');
  const scriptTag = `<script id="__INITIAL_DATA__">window.__INITIAL_DATA__ = ${serialized};</script>`;

  const moduleScriptIndex = html.indexOf('<script type="module"');
  if (moduleScriptIndex !== -1) {
    return `${html.slice(0, moduleScriptIndex)}${scriptTag}\n    ${html.slice(moduleScriptIndex)}`;
  }

  const firstScriptIndex = html.indexOf('<script');
  if (firstScriptIndex !== -1) {
    return `${html.slice(0, firstScriptIndex)}${scriptTag}\n    ${html.slice(firstScriptIndex)}`;

  }

  return html.replace('</body>', `${scriptTag}\n</body>`);
}

async function renderPage(template: string, route: RouteConfig) {
  const helmetContext = {} as FilledContext;
  const appHtml = renderToString(
    <AppServer url={route.url} initialData={route.data} helmetContext={helmetContext} />
  );

  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  html = injectHelmetData(html, helmetContext);

  const helmet = helmetContext.helmet;

  if (route.title && !helmet?.title.toString()) {
    html = html.replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`);
  }

  if (route.description) {
    const helmetMeta = helmet?.meta.toString() ?? '';
    if (!/name="description"/i.test(helmetMeta)) {
      html = html.replace(
        /<meta name="description" content="[^"]*"\s*\/>/,
        `<meta name="description" content="${route.description}" />`
      );
    }
  }

  html = injectInitialData(html, route.data);

  const outPath = path.resolve(__dirname, '../dist', route.file);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html);
}

async function prerender() {
  const indexPath = path.resolve(__dirname, '../dist/index.html');
  const template = await readFile(indexPath, 'utf-8');

  const posts = await fetchPublishedPosts();

  await renderPage(template, { url: '/', file: 'index.html' });

  await renderPage(template, {
    url: '/blog',
    file: 'blog/index.html',
    title: 'Blog | Libra Crédito | Artigos e Dicas Financeiras',
    description:
      'Confira artigos e dicas sobre capital de giro, consolidação de dívidas e financiamento para reformas. Mantenha-se informado com o blog da Libra Crédito.',
    data: { posts },
  });

  for (const post of posts) {
    await renderPage(template, {
      url: `/blog/${post.slug}`,
      file: `blog/${post.slug}/index.html`,
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.description,
      data: { post },
    });
  }

  console.log('SSR prerender complete');
}

prerender();
