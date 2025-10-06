/**
 * Lazy-loaded Supabase Client
 * 
 * @description Implementação de carregamento dinâmico do cliente Supabase
 * para reduzir o bundle inicial e melhorar performance de LCP
 * 
 * OTIMIZAÇÃO: Cliente Supabase carregado apenas quando necessário
 * Reduz ~116KB do bundle inicial
 */

import type { Database, GetSimulacoesOptions } from './supabase';

// Cache do cliente para evitar múltiplas inicializações
let supabaseClient: any = null;
let supabaseApi: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Carrega o cliente Supabase dinamicamente
 */
async function loadSupabaseClient() {
  // Se já está em cache, retorna imediatamente
  if (supabaseClient && supabaseApi) {
    return { supabase: supabaseClient, supabaseApi };
  }
  
  // Se já está carregando, retorna a mesma promise
  if (loadingPromise) {
    return loadingPromise;
  }
  
  // Verificar configuração
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY'
    );
    loadingPromise = Promise.reject(error);
    return loadingPromise;
  }

  // Inicia o carregamento
  loadingPromise = import('@supabase/supabase-js')
    .then(async ({ createClient }) => {

      // Criar cliente
      const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false // Não precisamos de autenticação de usuário
        },
        global: {
          headers: {
            'Accept': 'application/json'
          }
        }
      });

      // Debug apenas em development
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        console.log('Supabase client loaded lazily');
        console.log('Supabase URL:', supabaseUrl);
        console.log('Supabase Key:', supabaseAnonKey?.substring(0, 20) + '...');
      }

      // Cache do cliente
      supabaseClient = client;

      // Criar API helper
      const api = {
        // Teste de conexão
        async testConnection() {
          try {
            const { error } = await client
              .from('parceiros')
              .select('*')
              .limit(1);
            
            if (error) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Supabase connection issue:', error.message);
              }
              return false;
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Conexão Supabase OK (lazy loaded)');
            }
            return true;
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Supabase connection failed:', error);
            }
            return false;
          }
        },

        // Simulações
        async createSimulacao(data: Database['public']['Tables']['simulacoes']['Insert']) {
          const { data: result, error } = await client
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

          let query = client
            .from('simulacoes')
            .select(
              'id,nome_completo,email,status,created_at,valor_emprestimo,valor_imovel,parcelas,session_id,visitor_id'
            )
            .not('nome_completo', 'is', null)
            .neq('nome_completo', '')
            .not('email', 'is', null)
            .neq('email', '')
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

        async updateSimulacaoStatus(id: string, status: string) {
          const { data, error } = await client
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
        ) {
          const { data: result, error } = await client
            .from('user_journey')
            .upsert(data, { onConflict: 'session_id' })
            .select('id')
            .single();

          if (error) throw error;
          return {
            ...data,
            id: result?.id || null
          } as UserJourneySimulacaoData;
        },

        // Parceiros
        async createParceiro(data: Database['public']['Tables']['parceiros']['Insert']) {
          const { data: result, error } = await client
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
          const { data, error } = await client
            .from('parceiros')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
          
          if (error) throw error;
          return data;
        },

        async updateParceiroStatus(id: string, status: string) {
          const { data, error } = await client
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
          const { data: result, error } = await client
            .from('user_journey')
            .update(data)
            .eq('session_id', sessionId)
            .select()
            .maybeSingle();

          if (error) throw error;
        },

        async getUserJourney(sessionId: string) {
          const { data, error } = await client
            .from('user_journey')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

          if (error) throw error;
          return data;
        },

        async getUserJourneysBySessionIds(sessionIds: string[]) {
          const { data, error } = await client
            .from('user_journey')
            .select('*')
            .in('session_id', sessionIds);

          if (error) throw error;
          return data || [];
        },

        async getUserJourneysByVisitorIds(visitorIds: string[]) {
          const { data, error } = await client
            .from('user_journey')
            .select('*')
            .in('visitor_id', visitorIds);

          if (error) throw error;
          return data || [];
        },

        // Blog Posts - lazy loaded
        async getAllBlogPosts() {
          const { data, error } = await client
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data || [];
        },

        async getPublishedBlogPosts() {
          const { data, error } = await client
            .from('blog_posts')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data || [];
        },

        async getBlogPostById(id: string) {
          const { data, error } = await client
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return data;
        },

        async getBlogPostBySlug(slug: string) {
          const { data, error } = await client
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .single();
          
          if (error) throw error;
          return data;
        },

        async createBlogPost(data: Database['public']['Tables']['blog_posts']['Insert']) {
          const { data: result, error } = await client
            .from('blog_posts')
            .insert(data)
            .select()
            .single();
          
          if (error) throw error;
          return result;
        },

        async updateBlogPost(id: string, data: Database['public']['Tables']['blog_posts']['Update']) {
          const { data: result, error } = await client
            .from('blog_posts')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          return result;
        },

        async deleteBlogPost(id: string) {
          const { error } = await client
            .from('blog_posts')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          return true;
        },

        // Storage operations
        async uploadBlogImage(file: File, fileName?: string): Promise<string> {
          await this.ensureBlogImagesBucketExists();

          const fileExt = file.name.split('.').pop();
          const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const filePath = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${finalFileName}`;

          const { data: _data, error } = await client.storage
            .from('blog-images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            });

          if (error) throw error;

          const { data: publicURL } = client.storage
            .from('blog-images')
            .getPublicUrl(filePath);

          return publicURL.publicUrl;
        },

        async ensureBlogImagesBucketExists(): Promise<void> {
          try {
            const { error } = await client.storage.from('blog-images').list('', { limit: 1 });

            if (error) {
              console.warn(
                'Bucket blog-images ausente ou sem permissão. Crie manualmente no Dashboard Supabase.'
              );
            }
          } catch (error) {
            console.error('Erro ao verificar bucket blog-images:', error);
          }
        }
      };

      // Cache da API
      supabaseApi = api;
      loadingPromise = null; // Limpa a promise após sucesso

      return { supabase: client, supabaseApi: api };
    })
    .catch(error => {
      loadingPromise = null; // Limpa a promise em caso de erro
      console.error('Error loading Supabase client:', error);
      throw error;
    });
  
  return loadingPromise;
}

/**
 * Getter para o cliente Supabase (lazy loaded)
 */
export async function getSupabaseClient() {
  const { supabase } = await loadSupabaseClient();
  return supabase;
}

/**
 * Getter para a API Supabase (lazy loaded)
 */
export async function getSupabaseApi() {
  const { supabaseApi } = await loadSupabaseClient();
  return supabaseApi;
}

/**
 * Função para preload do cliente Supabase
 * Útil quando você sabe que vai precisar do cliente em breve
 */
export function preloadSupabaseClient() {
  if (!supabaseClient && !loadingPromise) {
    loadSupabaseClient().catch(error => {
      console.error('Error preloading Supabase client:', error);
    });
  }
}

export default { getSupabaseClient, getSupabaseApi, preloadSupabaseClient };
