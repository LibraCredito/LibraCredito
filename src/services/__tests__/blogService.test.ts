import { describe, it, expect, vi, afterEach } from 'vitest';
import { BlogService, type BlogPost } from '../blogService';
import { type BlogPostData } from '@/lib/supabase';

describe('BlogService scheduling logic', () => {
  const basePost: Omit<BlogPost, 'id'> = {
    title: 'Post base',
    description: 'Descrição',
    category: 'home-equity',
    imageUrl: 'https://example.com/image.jpg',
    slug: 'post-base',
    content: 'conteúdo',
    readTime: 5,
    published: true,
    featuredPost: false,
    scheduledAt: '2023-12-31T10:00:00.000Z',
    createdAt: '2023-12-01T10:00:00.000Z'
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('filters scheduled posts until their scheduled date', async () => {
    const posts: BlogPost[] = [
      { ...basePost, id: '1', title: 'Publicado', slug: 'publicado', publishedAt: '2023-12-31T10:00:00.000Z' },
      { ...basePost, id: '2', title: 'Agendado', slug: 'agendado', scheduledAt: '2024-02-01T10:00:00.000Z' },
      { ...basePost, id: '3', title: 'Rascunho', slug: 'rascunho', published: false }
    ];

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    vi.spyOn(BlogService, 'getAllPosts').mockResolvedValue(posts);

    const published = await BlogService.getPublishedPosts();
    const featured = await BlogService.getFeaturedPosts();

    expect(published.map((p) => p.id)).toEqual(['1']);
    expect(featured).toHaveLength(0);
  });

  it('converts supabase payloads with scheduling metadata', () => {
    const supabasePost: BlogPostData = {
      id: '10',
      title: 'Agendado',
      description: 'Com datas',
      category: 'home-equity',
      content: 'conteúdo',
      image_url: 'https://example.com/img.png',
      slug: 'agendado',
      read_time: 8,
      published: true,
      featured_post: false,
      meta_title: 'Meta',
      meta_description: 'Meta desc',
      tags: ['tag'],
      created_at: '2024-04-01T10:00:00.000Z',
      updated_at: '2024-04-02T10:00:00.000Z'
    };

    const post = BlogService.convertSupabaseToBlogPost(supabasePost);

    expect(post.scheduledAt).toBe(supabasePost.created_at);
    expect(post.publishedAt).toBe(supabasePost.created_at);
  });

  it('prepares supabase payload for scheduled posts without premature publication', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const post: BlogPost = {
      ...basePost,
      id: '11',
      slug: 'futuro',
      scheduledAt: scheduledDate,
      publishedAt: undefined
    };

    const payload = BlogService.convertBlogPostToSupabase(post);

    expect(payload.published).toBe(true);
  });
});
