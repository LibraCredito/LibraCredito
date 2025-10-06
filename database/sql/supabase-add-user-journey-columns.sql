-- =====================================================
-- ADICIONAR COLUNAS FALTANTES EM USER_JOURNEY - LIBRA CRÉDITO
-- =====================================================
-- Este script garante que a tabela user_journey possua as mesmas
-- colunas utilizadas pelo frontend para rastrear UTMs e dados de contato.
-- Ele pode ser executado com segurança múltiplas vezes.
-- =====================================================

-- Permitir landing_page nula para compatibilidade com registros antigos
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'landing_page'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_journey ALTER COLUMN landing_page DROP NOT NULL;
        RAISE NOTICE 'Restrição NOT NULL removida de user_journey.landing_page';
    END IF;
END
$$;

-- Adicionar visitor_id (UUID que relaciona sessão e visitante)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'visitor_id'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN visitor_id UUID;
        RAISE NOTICE 'Coluna visitor_id adicionada à tabela user_journey';
    END IF;
END
$$;

-- Índice para visitor_id
CREATE INDEX IF NOT EXISTS idx_user_journey_visitor_id ON public.user_journey(visitor_id);

-- Campos de identificação básicos do lead
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'nome_completo'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN nome_completo TEXT;
        RAISE NOTICE 'Coluna nome_completo adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'email'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN email TEXT;
        RAISE NOTICE 'Coluna email adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'telefone'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN telefone TEXT;
        RAISE NOTICE 'Coluna telefone adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'cidade'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN cidade TEXT;
        RAISE NOTICE 'Coluna cidade adicionada à tabela user_journey';
    END IF;
END
$$;

-- Campos financeiros vinculados à simulação
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'valor_emprestimo'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN valor_emprestimo NUMERIC;
        RAISE NOTICE 'Coluna valor_emprestimo adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'valor_imovel'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN valor_imovel NUMERIC;
        RAISE NOTICE 'Coluna valor_imovel adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'parcelas'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN parcelas INTEGER;
        RAISE NOTICE 'Coluna parcelas adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'tipo_amortizacao'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN tipo_amortizacao TEXT;
        RAISE NOTICE 'Coluna tipo_amortizacao adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'parcela_inicial'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN parcela_inicial NUMERIC;
        RAISE NOTICE 'Coluna parcela_inicial adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'parcela_final'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN parcela_final NUMERIC;
        RAISE NOTICE 'Coluna parcela_final adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'imovel_proprio'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN imovel_proprio TEXT;
        RAISE NOTICE 'Coluna imovel_proprio adicionada à tabela user_journey';
    END IF;
END
$$;

-- Status e metadados adicionais
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN status TEXT;
        RAISE NOTICE 'Coluna status adicionada à tabela user_journey';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_journey'
          AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE public.user_journey ADD COLUMN user_agent TEXT;
        RAISE NOTICE 'Coluna user_agent adicionada à tabela user_journey';
    END IF;
END
$$;

-- Comentários descritivos
COMMENT ON COLUMN public.user_journey.visitor_id IS 'Identificador persistente do visitante (UUID)';
COMMENT ON COLUMN public.user_journey.nome_completo IS 'Nome informado na jornada';
COMMENT ON COLUMN public.user_journey.valor_emprestimo IS 'Valor solicitado na simulação associado a esta jornada';
COMMENT ON COLUMN public.user_journey.tipo_amortizacao IS 'Tipo de amortização selecionado pelo usuário';
COMMENT ON COLUMN public.user_journey.status IS 'Status de qualificação do lead vinculado à jornada';

-- Resultado final
SELECT
    '✅ user_journey sincronizada com o frontend' AS status,
    COUNT(*) FILTER (WHERE visitor_id IS NOT NULL) AS jornadas_com_visitor,
    COUNT(*) FILTER (WHERE utm_source IS NOT NULL) AS jornadas_com_utm
FROM public.user_journey;
