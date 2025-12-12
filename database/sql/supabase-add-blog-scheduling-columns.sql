-- =====================================================
-- ADICIONA COLUNAS DE AGENDAMENTO AO BLOG_POSTS
-- =====================================================
-- Utilize este script para ambientes existentes que ainda
-- não possuem as colunas scheduled_at/published_at.
-- Ele é idempotente e pode ser executado com segurança.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD COLUMN scheduled_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Coluna scheduled_at adicionada à tabela blog_posts';
  ELSE
    RAISE NOTICE 'Coluna scheduled_at já existe na tabela blog_posts';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_posts'
      AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD COLUMN published_at TIMESTAMPTZ;
    RAISE NOTICE 'Coluna published_at adicionada à tabela blog_posts';
  ELSE
    RAISE NOTICE 'Coluna published_at já existe na tabela blog_posts';
  END IF;
END $$;

-- Índice para suportar listagens ordenadas por data de publicação/agendamento
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_at ON public.blog_posts(scheduled_at DESC);
