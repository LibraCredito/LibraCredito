-- =====================================================
-- TABELA UNIFICADA USER_JOURNEY_SIMULACOES
-- =====================================================
-- Esta migração cria a tabela user_journey_simulacoes que reúne
-- todos os campos das tabelas public.user_journey e public.simulacoes.
-- Também cria funções e triggers que mantêm a tabela sincronizada
-- após INSERT ou UPDATE nas tabelas originais.

-- 1. CRIAÇÃO DA TABELA
CREATE TABLE IF NOT EXISTS public.user_journey_simulacoes (
    simulacao_id UUID PRIMARY KEY,
    user_journey_id UUID,
    session_id TEXT NOT NULL,
    visitor_id UUID,
    -- Campos de user_journey
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer TEXT,
    landing_page TEXT,
    pages_visited JSONB,
    time_on_site INTEGER,
    device_info JSONB,
    uj_ip_address TEXT,
    uj_created_at TIMESTAMPTZ,
    uj_updated_at TIMESTAMPTZ,
    -- Campos de simulacoes
    nome_completo TEXT,
    email TEXT,
    telefone TEXT,
    cidade TEXT,
    valor_emprestimo NUMERIC,
    valor_imovel NUMERIC,
    parcelas INTEGER,
    tipo_amortizacao TEXT CHECK (tipo_amortizacao IN ('SAC','PRICE')),
    parcela_inicial NUMERIC,
    parcela_final NUMERIC,
    imovel_proprio TEXT CHECK (imovel_proprio IN ('proprio','terceiro')),
    sim_ip_address TEXT,
    user_agent TEXT,
    status TEXT CHECK (status IN ('novo','interessado','contatado','finalizado')),
    integrado_crm BOOLEAN,
    sim_created_at TIMESTAMPTZ,
    sim_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_journey_simulacoes_session_id
    ON public.user_journey_simulacoes(session_id);

-- 2. FUNÇÃO PARA SINCRONIZAR A PARTIR DE SIMULACOES
CREATE OR REPLACE FUNCTION public.sync_user_journey_simulacoes_from_simulacoes()
RETURNS TRIGGER AS $$
DECLARE
    uj_record public.user_journey%ROWTYPE;
BEGIN
    SELECT * INTO uj_record
    FROM public.user_journey
    WHERE session_id = NEW.session_id;

    INSERT INTO public.user_journey_simulacoes (
        simulacao_id, user_journey_id, session_id, visitor_id,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        referrer, landing_page, pages_visited, time_on_site, device_info,
        uj_ip_address, uj_created_at, uj_updated_at,
        nome_completo, email, telefone, cidade,
        valor_emprestimo, valor_imovel, parcelas, tipo_amortizacao,
        parcela_inicial, parcela_final, imovel_proprio,
        sim_ip_address, user_agent, status, integrado_crm,
        sim_created_at, sim_updated_at
    ) VALUES (
        NEW.id, COALESCE(uj_record.id, NULL), NEW.session_id, NEW.visitor_id,
        uj_record.utm_source, uj_record.utm_medium, uj_record.utm_campaign,
        uj_record.utm_term, uj_record.utm_content, uj_record.referrer,
        uj_record.landing_page, uj_record.pages_visited, uj_record.time_on_site,
        uj_record.device_info, uj_record.ip_address, uj_record.created_at,
        uj_record.updated_at,
        NEW.nome_completo, NEW.email, NEW.telefone, NEW.cidade,
        NEW.valor_emprestimo, NEW.valor_imovel, NEW.parcelas, NEW.tipo_amortizacao,
        NEW.parcela_inicial, NEW.parcela_final, NEW.imovel_proprio,
        NEW.ip_address, NEW.user_agent, NEW.status, NEW.integrado_crm,
        NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (simulacao_id) DO UPDATE SET
        user_journey_id = EXCLUDED.user_journey_id,
        session_id = EXCLUDED.session_id,
        visitor_id = EXCLUDED.visitor_id,
        utm_source = EXCLUDED.utm_source,
        utm_medium = EXCLUDED.utm_medium,
        utm_campaign = EXCLUDED.utm_campaign,
        utm_term = EXCLUDED.utm_term,
        utm_content = EXCLUDED.utm_content,
        referrer = EXCLUDED.referrer,
        landing_page = EXCLUDED.landing_page,
        pages_visited = EXCLUDED.pages_visited,
        time_on_site = EXCLUDED.time_on_site,
        device_info = EXCLUDED.device_info,
        uj_ip_address = EXCLUDED.uj_ip_address,
        uj_created_at = EXCLUDED.uj_created_at,
        uj_updated_at = EXCLUDED.uj_updated_at,
        nome_completo = EXCLUDED.nome_completo,
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        cidade = EXCLUDED.cidade,
        valor_emprestimo = EXCLUDED.valor_emprestimo,
        valor_imovel = EXCLUDED.valor_imovel,
        parcelas = EXCLUDED.parcelas,
        tipo_amortizacao = EXCLUDED.tipo_amortizacao,
        parcela_inicial = EXCLUDED.parcela_inicial,
        parcela_final = EXCLUDED.parcela_final,
        imovel_proprio = EXCLUDED.imovel_proprio,
        sim_ip_address = EXCLUDED.sim_ip_address,
        user_agent = EXCLUDED.user_agent,
        status = EXCLUDED.status,
        integrado_crm = EXCLUDED.integrado_crm,
        sim_created_at = EXCLUDED.sim_created_at,
        sim_updated_at = EXCLUDED.sim_updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNÇÃO PARA SINCRONIZAR A PARTIR DE USER_JOURNEY
CREATE OR REPLACE FUNCTION public.sync_user_journey_simulacoes_from_user_journey()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_journey_simulacoes
    SET
        user_journey_id = NEW.id,
        utm_source = NEW.utm_source,
        utm_medium = NEW.utm_medium,
        utm_campaign = NEW.utm_campaign,
        utm_term = NEW.utm_term,
        utm_content = NEW.utm_content,
        referrer = NEW.referrer,
        landing_page = NEW.landing_page,
        pages_visited = NEW.pages_visited,
        time_on_site = NEW.time_on_site,
        device_info = NEW.device_info,
        uj_ip_address = NEW.ip_address,
        uj_created_at = NEW.created_at,
        uj_updated_at = NEW.updated_at
    WHERE session_id = NEW.session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGERS
DROP TRIGGER IF EXISTS trg_sync_user_journey ON public.user_journey;
CREATE TRIGGER trg_sync_user_journey
AFTER INSERT OR UPDATE ON public.user_journey
FOR EACH ROW EXECUTE FUNCTION public.sync_user_journey_simulacoes_from_user_journey();

DROP TRIGGER IF EXISTS trg_sync_simulacoes ON public.simulacoes;
CREATE TRIGGER trg_sync_simulacoes
AFTER INSERT OR UPDATE ON public.simulacoes
FOR EACH ROW EXECUTE FUNCTION public.sync_user_journey_simulacoes_from_simulacoes();

-- FIM DA MIGRAÇÃO
