/**
 * Configuração do cliente Supabase
 * 
 * @file supabase.ts
 * @description Configuração centralizada do cliente Supabase para integração com banco de dados
 * 
 * @features
 * - Cliente configurado com URL e API Key
 * - Tipos TypeScript para tabelas
 * - Configurações de segurança
 * 
 * @security
 * - API Key anônima (somente leitura/escrita conforme RLS)
 * - URLs e keys em variáveis de ambiente para produção
 * 
 * @database_schema
 * - simulacoes: Dados de simulação de crédito
 * - user_journey: Tracking de jornada do usuário
 */

import { createClient } from '@supabase/supabase-js';
import {
  SIMULATION_PLACEHOLDER_EMAIL,
  SIMULATION_PLACEHOLDER_NAME,
  SIMULATION_PLACEHOLDER_PHONE
} from '@/constants/simulationPlaceholders';

// Configurações do Supabase - obtidas de variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação obrigatória das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '⚠️ Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY'
  );
}

// Log para debug (apenas em development)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key:', supabaseAnonKey.substring(0, 20) + '...');
}

// Tipos TypeScript para as tabelas
export interface SimulacaoData {
  id?: string;
  session_id: string;
  visitor_id?: string | null;
  nome_completo: string;
  email: string;
  telefone: string;
  cidade: string;
  valor_emprestimo: number;
  valor_imovel: number;
  parcelas: number;
  tipo_amortizacao: string;
  parcela_inicial?: number | null;
  parcela_final?: number | null;
  imovel_proprio?: 'proprio' | 'terceiro' | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  time_on_site?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  status?: string | null;
  integrado_crm?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface ParceiroData {
  id?: string;
  session_id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  cnpj?: string;
  tempo_home_equity: string;
  perfil_cliente: string;
  ramo_atuacao: string;
  origem: string;
  mensagem?: string;
  ip_address?: string;
  user_agent?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}


export interface PageVisit {
  url: string;
  timestamp: string;
  time_spent?: number;
}

export interface DeviceInfo {
  user_agent: string;
  screen_resolution: string;
  viewport_size: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
}

export interface UserJourneyData {
  id?: string;
  session_id: string;
  visitor_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  pages_visited?: PageVisit[];
  time_on_site?: number;
  device_info?: DeviceInfo;
  ip_address?: string | null;
  user_agent?: string | null;
  nome_completo?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  valor_emprestimo?: number | null;
  valor_imovel?: number | null;
  parcelas?: number | null;
  tipo_amortizacao?: string | null;
  parcela_inicial?: number | null;
  parcela_final?: number | null;
  imovel_proprio?: 'proprio' | 'terceiro' | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type UserJourneySimulacaoData = UserJourneyData;

export interface UserJourneySummary {
  session_id: string | null;
  visitor_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  time_on_site?: number | null;
  status?: string | null;
}

export interface PageVisit {
  url: string;
  timestamp: string;
  time_spent?: number;
}

export interface DeviceInfo {
  user_agent: string;
  screen_resolution: string;
  viewport_size: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
}

export interface GetSimulacoesOptions {
  limit?: number;
  page?: number;
  status?: string;
  searchTerm?: string;
}

export interface BlogPostData {
  id?: string;
  title: string;
  description: string;
  category: string;
  content: string;
  image_url?: string;
  slug: string;
  read_time?: number;
  published: boolean;
  featured_post: boolean;
  scheduled_at?: string | null;
  published_at?: string | null;
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

// Schema do banco para TypeScript
export interface Database {
  public: {
    Tables: {
      simulacoes: {
        Row: SimulacaoData;
        Insert: Omit<SimulacaoData, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SimulacaoData, 'id' | 'created_at'>>;
      };
      parceiros: {
        Row: ParceiroData;
        Insert: Omit<ParceiroData, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ParceiroData, 'id' | 'created_at'>>;
      };
      user_journey: {
        Row: UserJourneyData;
        Insert: Omit<UserJourneyData, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserJourneyData, 'id' | 'created_at'>>;
      };
      blog_posts: {
        Row: BlogPostData;
        Insert: Omit<BlogPostData, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BlogPostData, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// Cliente Supabase tipado
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false // Não precisamos de autenticação de usuário
    },
    global: {
      headers: {
        'Accept': 'application/json'
      }
    }
  }
);

// Funções auxiliares para operações no banco
export const supabaseApi = {
  // Teste de conexão
  async testConnection() {
    try {
      const { error } = await supabase
        .from('parceiros')
        .select('*')
        .limit(1);

      if (error) {
        // Log silencioso para evitar poluição do console
        if (import.meta.env.DEV) {
          console.warn('Supabase connection issue:', error.message);
        }
        return false;
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ Conexão Supabase OK');
      }
      return true;
    } catch (error) {
      // Evitar console errors em produção
      if (import.meta.env.DEV) {
        console.warn('Supabase connection failed:', error);
      }
      return false;
    }
  },

  // Simulações
  async createSimulacao(data: Database['public']['Tables']['simulacoes']['Insert']) {
    const { data: result, error } = await supabase
      .from('simulacoes')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  async getSimulacoes(options: GetSimulacoesOptions = {}) {
    const {
      limit = 1000,
      page = 1,
      status,
      searchTerm
    } = options;

    const from = Math.max(0, (page - 1) * limit);
    const to = from + limit - 1;

    let query = supabase
      .from('simulacoes')
      .select(
        [
          'id',
          'nome_completo',
          'email',
          'telefone',
          'status',
          'created_at',
          'valor_emprestimo',
          'valor_imovel',
          'parcelas',
          'tipo_amortizacao',
          'session_id',
          'visitor_id',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_term',
          'utm_content',
          'landing_page',
          'referrer',
          'time_on_site'
        ].join(',')
      )
      .not('nome_completo', 'is', null)
      .neq('nome_completo', '')
      .neq('nome_completo', SIMULATION_PLACEHOLDER_NAME)
      .not('email', 'is', null)
      .neq('email', '')
      .neq('email', SIMULATION_PLACEHOLDER_EMAIL)
      .not('telefone', 'is', null)
      .neq('telefone', '')
      .neq('telefone', SIMULATION_PLACEHOLDER_PHONE)
      .neq('status', 'novo')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    if (searchTerm) {
      const sanitizedTerm = `%${searchTerm.trim()}%`;
      query = query.or(
        `nome_completo.ilike.${sanitizedTerm},email.ilike.${sanitizedTerm}`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async updateSimulacaoStatus(
    id: string,
    status: string
  ): Promise<Pick<SimulacaoData, 'id' | 'status'>> {
    const { data, error } = await supabase
      .from('simulacoes')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) throw error;
    return data ?? { id, status };
  },

  // User Journey
  async createUserJourney(
    data: Database['public']['Tables']['user_journey']['Insert']
  ): Promise<UserJourneyData> {
    const { data: result, error } = await supabase
      .from('user_journey')
      .upsert(data, { onConflict: 'session_id' })
      .select()
      .single();

    if (error) throw error;
    return (result ?? {
      ...data,
      id: undefined
    }) as UserJourneyData;
  },

  // Parceiros
  async createParceiro(
    data: Database['public']['Tables']['parceiros']['Insert']
  ): Promise<ParceiroData> {
    const { data: result, error } = await supabase
      .from('parceiros')
      .insert(data)
      .select('id')
      .single();

    if (error) throw error;
    return {
      ...data,
      id: result?.id || null
    } as ParceiroData;
  },

  async getParceiros(limit = 50) {
    const { data, error } = await supabase
      .from('parceiros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async updateParceiroStatus(
    id: string,
    status: string
  ): Promise<Pick<ParceiroData, 'id' | 'status'>> {
    const { data, error } = await supabase
      .from('parceiros')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) throw error;
    return data ?? { id, status };
  },

  async updateUserJourney(
    sessionId: string,
    data: Database['public']['Tables']['user_journey']['Update']
  ) {
    const { data: result, error } = await supabase
      .from('user_journey')
      .update(data)
      .eq('session_id', sessionId)
      .select()
      .maybeSingle();

    if (error) throw error;
  },

  async getUserJourney(sessionId: string) {
    const { data, error } = await supabase
      .from('user_journey')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getUserJourneysBySessionIds(
    sessionIds: string[]
  ): Promise<UserJourneyData[]> {
    const { data, error } = await supabase
      .from('user_journey')
      .select('*')
      .in('session_id', sessionIds);

    if (error) throw error;
    return (data || []) as UserJourneyData[];
  },

  async getUserJourneysByVisitorIds(
    visitorIds: string[]
  ): Promise<UserJourneyData[]> {
    const { data, error } = await supabase
      .from('user_journey')
      .select('*')
      .in('visitor_id', visitorIds);

    if (error) throw error;
    return (data || []) as UserJourneyData[];
  },

  // Analytics
  async getSimulacaoStats() {
    const { data, error } = await supabase
      .rpc('get_simulacao_stats'); // Função SQL customizada
    
    if (error) throw error;
    return data;
  },

  // Blog Posts
  async getBlogPostSummaries() {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'id,title,description,category,image_url,slug,read_time,published,featured_post,scheduled_at,published_at,meta_title,meta_description,created_at,updated_at'
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPublishedBlogPosts() {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .or(`scheduled_at.lte.${now},scheduled_at.is.null`)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getBlogPostById(id: string) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBlogPostBySlug(slug: string) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'id,title,description,category,content,image_url,slug,read_time,published,featured_post,scheduled_at,published_at,meta_title,meta_description,tags,created_at,updated_at'
      )
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createBlogPost(data: Database['public']['Tables']['blog_posts']['Insert']) {
    const { data: result, error } = await supabase
      .from('blog_posts')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  async updateBlogPost(id: string, data: Database['public']['Tables']['blog_posts']['Update']) {
    const { data: result, error } = await supabase
      .from('blog_posts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  async deleteBlogPost(id: string) {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getBlogPostsByCategory(category: string) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('category', category)
      .eq('published', true)
      .or(`scheduled_at.lte.${now},scheduled_at.is.null`)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getFeaturedBlogPosts() {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('featured_post', true)
      .eq('published', true)
      .or(`scheduled_at.lte.${now},scheduled_at.is.null`)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Upload de imagem para Supabase Storage
  async uploadBlogImage(file: File, fileName?: string): Promise<string> {
    // Verificar se o bucket existe e criar se necessário
    await this.ensureBlogImagesBucketExists();

    const fileExt = file.name.split('.').pop();
    const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${finalFileName}`;

    const { error } = await supabase.storage
      .from('blog-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;

    // Retornar URL pública da imagem
    const { data: publicURL } = supabase.storage
      .from('blog-images')
      .getPublicUrl(filePath);

    return publicURL.publicUrl;
  },

  // Garantir que o bucket blog-images existe
  async ensureBlogImagesBucketExists(): Promise<void> {
    try {
      // Apenas verifica acesso; criação deve ser feita manualmente via dashboard
      const { error } = await supabase.storage.from('blog-images').list('', { limit: 1 });

      if (error) {
        console.warn(
          'Bucket blog-images ausente ou sem permissão. Crie manualmente no Dashboard Supabase.'
        );
      }
    } catch (error) {
      console.error('Erro ao verificar bucket blog-images:', error);
    }
  },

  async deleteBlogImage(imageUrl: string) {
    // Extrair o path da URL
    const urlParts = imageUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'blog-images');
    if (bucketIndex === -1) return false;

    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from('blog-images')
      .remove([filePath]);
    
    if (error) throw error;
    return true;
  }
};

export default supabase;
