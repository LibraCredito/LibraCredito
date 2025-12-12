/**
 * Página de administração simples
 * 
 * @page AdminDashboard
 * @description Dashboard básico para visualizar simulações e dados coletados
 * 
 * @features
 * - Lista de simulações
 * - Filtros básicos
 * - Dados de jornada do usuário
 * - Export simples
 * - Atualização de status
 * 
* @security
* - Acesso via URL simples (sem autenticação por ora)
* - Admin vê as informações completas
*/

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LocalSimulationService, type SessionGroupWithJourney } from '@/services/localSimulationService';

import { PartnersService } from '@/services/partnersService';
import { BlogService, type BlogPost } from '@/services/blogService';
import { AuthService, type LoginCredentials, type AuthUser } from '@/services/authService';
import AdminLogin from '@/components/AdminLogin';
import ImageUploader from '@/components/ImageUploader';
import StorageStats from '@/components/StorageStats';
import SupabaseDiagnostics from '@/components/SupabaseDiagnostics';
import UTMDetails from '@/components/UTMDetails';
import { ParceiroData } from '@/lib/supabase';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Download from 'lucide-react/dist/esm/icons/download';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Users from 'lucide-react/dist/esm/icons/users';
import Calculator from 'lucide-react/dist/esm/icons/calculator';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Handshake from 'lucide-react/dist/esm/icons/handshake';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Building from 'lucide-react/dist/esm/icons/building';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Save from 'lucide-react/dist/esm/icons/save';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import { formatBRL } from '@/utils/formatters';
import { renderMarkdown } from '@/utils/markdown';
import { formatPhone } from '@/utils/validations';

// Garante compatibilidade com scripts antigos que ainda referenciam
// window.getFilteredSessions antes da montagem do componente. Inicializa
// com função vazia para evitar ReferenceError durante o carregamento.
if (typeof window !== 'undefined' && !(window as any).getFilteredSessions) {
  (window as any).getFilteredSessions = () => [];
}

const AdminDashboard: React.FC = () => {
  // Estados de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<'simulacoes' | 'parceiros' | 'blog' | 'configuracoes'>('simulacoes');
  
  // Estados para simulações agrupadas por visitante
  const [visitorGroups, setVisitorGroups] = useState<SessionGroupWithJourney[]>([]);


  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroNome, setFiltroNome] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    novos: 0,
    interessados: 0,
    contatados: 0,
    finalizados: 0
  });
  
  // Estados para parceiros
  const [parceiros, setParceiros] = useState<ParceiroData[]>([]);
  
  // Estados para blog
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [postForm, setPostForm] = useState<Partial<BlogPost>>({});
  const [loadingBlog, setLoadingBlog] = useState(false);
  const [filtroStatusBlog, setFiltroStatusBlog] = useState<string>('todos');
  const [filtroTituloBlog, setFiltroTituloBlog] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [editorMode, setEditorMode] = useState<'write' | 'preview' | 'split'>('write');
  
  // Estados para configurações do simulador interno
  const [simulationConfig, setSimulationConfig] = useState({
    valorMinimo: 100000,
    valorMaximo: 5000000,
    parcelasMin: 36,
    parcelasMax: 180,
    juros: 1.19,
    custoOperacional: 11.0,
    dfiPercentual: 0.014,
    prestamistaPercentual: 0.035,
    taxaAdministrativa: 40
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingParceiros, setLoadingParceiros] = useState(false);
  const [filtroStatusParceiros, setFiltroStatusParceiros] = useState<string>('todos');
  const [filtroNomeParceiros, setFiltroNomeParceiros] = useState('');
  const [statsParceiros, setStatsParceiros] = useState({
    total: 0,
    pendentes: 0,
    aprovados: 0,
    rejeitados: 0,
    em_analise: 0
  });

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      if (AuthService.isAuthenticated() && AuthService.isTokenValid()) {
        const user = AuthService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
      setCheckingAuth(false);
    };
    
    checkAuth();
  }, []);

  // Carregar dados quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadSimulacoes();
      loadParceiros();
      loadBlogPosts();
      loadSimulationConfig();
    }
  }, [isAuthenticated]);

  // Funções de autenticação
  const handleLogin = async (credentials: LoginCredentials) => {
    setLoginLoading(true);
    setLoginError('');

    try {
      const user = await AuthService.login(credentials);
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      setLoginError((error as Error).message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('simulacoes');
  };
  
  // Carregar posts do blog
  const loadBlogPosts = async () => {
    setLoadingBlog(true);
    try {
      const posts = await BlogService.getAllPosts();
      setBlogPosts(posts);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    } finally {
      setLoadingBlog(false);
    }
  };
  
  // Carregar configurações do simulador local
  const loadSimulationConfig = async () => {
    try {
      const storedConfig = localStorage.getItem('libra_simulation_config');
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        setSimulationConfig({
          valorMinimo: config.valorMinimo || 100000,
          valorMaximo: config.valorMaximo || 5000000,
          parcelasMin: config.parcelasMin || 36,
          parcelasMax: config.parcelasMax || 180,
          juros: config.juros || 1.19,
          custoOperacional: config.custoOperacional || 11.0,
          dfiPercentual: config.dfiPercentual || 0.014,
          prestamistaPercentual: config.prestamistaPercentual || 0.035,
          taxaAdministrativa: config.taxaAdministrativa || 40
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };
  
  // Função para contar palavras de forma segura
  const countWords = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(' ').filter(word => word.length > 0).length;
  };

  const formatDateTimeLocal = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };



  // Função para inserir texto no editor
  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = document.querySelector('textarea[placeholder*="Conteúdo do post"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = before + (selectedText || placeholder) + after;
    
    const newContent = textarea.value.substring(0, start) + textToInsert + textarea.value.substring(end);
    setPostForm({...postForm, content: newContent});

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + (selectedText || placeholder).length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };
  
  // Salvar post
  const handleSavePost = async () => {
    if (!postForm.title || !postForm.description || !postForm.category || !postForm.content) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const now = new Date();
    const scheduledDate = postForm.scheduledAt ? new Date(postForm.scheduledAt) : now;
    const isAlreadyPublished = editingPost?.published ?? false;

    if (scheduledDate.getTime() < now.getTime() && !isAlreadyPublished) {
      alert('A data/hora de publicação não pode ser no passado');
      return;
    }

    const slug = postForm.slug?.trim() || BlogService.generateSlug(postForm.title);
    const published = postForm.published ?? false;
    const featuredPost = postForm.featuredPost ?? false;

    const payload: BlogPost = {
      ...postForm,
      slug,
      published,
      featuredPost,
      scheduledAt: scheduledDate.toISOString(),
      readTime: postForm.readTime || BlogService.calculateReadTime(postForm.content || '')
    };

    const isPublishedNow = BlogService.isPostPublished(payload, now);
    payload.publishedAt = published && isPublishedNow ? postForm.publishedAt || now.toISOString() : postForm.publishedAt;

    try {
      if (editingPost?.id) {
        await BlogService.updatePost(editingPost.id, payload);
      } else {
        await BlogService.createPost(payload);
      }
      
      await loadBlogPosts();
      setShowPostEditor(false);
      setPostForm({});
      setEditingPost(null);
    } catch (error) {
      console.error('Erro ao salvar post:', error);
      alert('Erro ao salvar post: ' + (error as Error).message);
    }
  };
  
  // Deletar post
  const handleDeletePost = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este post?')) return;
    
    try {
      await BlogService.deletePost(id);
      await loadBlogPosts();
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      alert('Erro ao deletar post');
    }
  };
  
  // Salvar configurações do simulador local
  const handleSaveConfig = async () => {
    setLoadingConfig(true);
    try {
      localStorage.setItem('libra_simulation_config', JSON.stringify(simulationConfig));
      alert('Configurações do simulador salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setLoadingConfig(false);
    }
  };
  
  // Carregar parceiros
  const loadParceiros = async () => {
    setLoadingParceiros(true);
    try {
      const data = await PartnersService.getParceiros(100);
      setParceiros(data);
      calculateStatsParceiros(data);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
    } finally {
      setLoadingParceiros(false);
    }
  };
  
  const calculateStatsParceiros = (data: ParceiroData[]) => {
    const stats = {
      total: data.length,
      pendentes: data.filter(p => p.status === 'pendente').length,
      aprovados: data.filter(p => p.status === 'aprovado').length,
      rejeitados: data.filter(p => p.status === 'rejeitado').length,
      em_analise: data.filter(p => p.status === 'em_analise').length
    };
    setStatsParceiros(stats);
  };
  
  const updateParceiroStatus = async (id: string, newStatus: string) => {
    try {
      await PartnersService.updatePartnerStatus(id, newStatus);
      await loadParceiros();
    } catch (error) {
      console.error('Erro ao atualizar status do parceiro:', error);
    }
  };

  const loadSimulacoes = async () => {
    setLoading(true);
    try {
      const data = await LocalSimulationService.getSimulacoesAgrupadas({
        limit: 1000,
        status: filtroStatus !== 'todos' ? filtroStatus : undefined,
        searchTerm: filtroNome.trim() ? filtroNome : undefined
      });
      const completed = data.filter(group => {
        const sim = group.simulacoes[0];
        return (
          !!sim.nome_completo?.trim() &&
          !!sim.email?.trim() &&
          sim.status !== 'novo'
        );
      });
      setVisitorGroups(completed);

      calculateStats(completed);
    } catch (error) {
      console.error('Erro ao carregar simulações:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: SessionGroupWithJourney[]) => {

    const stats = {
      total: data.length,
      novos: data.filter(s => s.simulacoes[0]?.status === 'novo').length,
      interessados: data.filter(s => s.simulacoes[0]?.status === 'interessado').length,
      contatados: data.filter(s => s.simulacoes[0]?.status === 'contatado').length,
      finalizados: data.filter(s => s.simulacoes[0]?.status === 'finalizado').length
    };
    setStats(stats);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await LocalSimulationService.updateSimulationStatus(id, newStatus);
      await loadSimulacoes();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const exportToCSV = () => {
    const filteredData = getFilteredVisitors();

    const csv = [
      'Grupo,Quantidade,Data,Nome,Email,Valor Emprestimo,Valor Imovel,Parcelas,Status,Sessao,Visitante',
      ...filteredData.map(group => {
        const s = group.simulacoes[0];
        return [
          group.visitor_id,
          group.total_simulacoes,
          s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
          s.nome_completo,
          s.email,
          s.valor_emprestimo,
          s.valor_imovel,
          s.parcelas,
          s.status,
          group.primary_session_id || '',
          s.visitor_id || ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getFilteredVisitors = () => {

    return visitorGroups.filter(group => {
      const sim = group.simulacoes[0];
      const matchStatus = filtroStatus === 'todos' || sim.status === filtroStatus;
      const matchNome = !filtroNome || sim.nome_completo.toLowerCase().includes(filtroNome.toLowerCase());
      return matchStatus && matchNome;
    });
  };


  useEffect(() => {
    (window as any).getFilteredSessions = getFilteredVisitors;
  }, [visitorGroups, filtroStatus, filtroNome]);
  
  const getFilteredParceiros = () => {
    return parceiros.filter(p => {
      const matchStatus = filtroStatusParceiros === 'todos' || p.status === filtroStatusParceiros;
      const matchNome = !filtroNomeParceiros || p.nome.toLowerCase().includes(filtroNomeParceiros.toLowerCase());
      return matchStatus && matchNome;
    });
  };
  
  const getFilteredBlogPosts = () => {
    return blogPosts.filter(post => {
      const now = new Date();
      const isPublished = BlogService.isPostPublished(post, now);
      const isScheduled = BlogService.isPostScheduled(post, now);
      const matchStatus =
        filtroStatusBlog === 'todos' ||
        (filtroStatusBlog === 'published' && isPublished && !post.featuredPost) ||
        (filtroStatusBlog === 'scheduled' && isScheduled) ||
        (filtroStatusBlog === 'draft' && !post.published) ||
        (filtroStatusBlog === 'featured' && post.featuredPost && isPublished) ||
        (filtroStatusBlog === 'featured_scheduled' && post.featuredPost && isScheduled);
      
      const matchTitle = !filtroTituloBlog || 
        post.title.toLowerCase().includes(filtroTituloBlog.toLowerCase()) ||
        post.description.toLowerCase().includes(filtroTituloBlog.toLowerCase());

      return matchStatus && matchTitle;
    });
  };

  const now = new Date();
  const publishedBlogPosts = blogPosts.filter(post => BlogService.isPostPublished(post, now));
  const scheduledBlogPosts = blogPosts.filter(post => BlogService.isPostScheduled(post, now));
  const draftBlogPosts = blogPosts.filter(post => !post.published);
  const featuredPublishedPosts = blogPosts.filter(post => post.featuredPost && BlogService.isPostPublished(post, now));
  const featuredScheduledPosts = blogPosts.filter(post => post.featuredPost && BlogService.isPostScheduled(post, now));
  
  const exportParceirosToCsv = () => {
    const filteredData = getFilteredParceiros();
    const csv = [
      'Data,Nome,Email,Telefone,Cidade,CNPJ,Tempo Home Equity,Perfil Cliente,Ramo Atuacao,Origem,Status',
      ...filteredData.map(p => [
        new Date(p.created_at!).toLocaleDateString(),
        p.nome,
        p.email,
        p.telefone,
        p.cidade,
        p.cnpj || '',
        p.tempo_home_equity,
        p.perfil_cliente,
        p.ramo_atuacao,
        p.origem,
        p.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parceiros_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredVisitors = getFilteredVisitors();


  const filteredParceiros = getFilteredParceiros();

  // Mostrar loading durante verificação inicial
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-libra-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Mostrar tela de login se não autenticado
  if (!isAuthenticated) {
    return (
      <AdminLogin 
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Admin - Libra Crédito</h1>
            <p className="text-gray-600">Gestão de simulações, leads e parceiros</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
        
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('simulacoes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'simulacoes'
                  ? 'border-libra-blue text-libra-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calculator className="w-4 h-4 inline mr-2" />
              Simulações
            </button>
            <button
              onClick={() => setActiveTab('parceiros')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'parceiros'
                  ? 'border-libra-blue text-libra-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Handshake className="w-4 h-4 inline mr-2" />
              Parceiros
            </button>
            <button
              onClick={() => setActiveTab('blog')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'blog'
                  ? 'border-libra-blue text-libra-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Blog
            </button>
            <button
              onClick={() => setActiveTab('configuracoes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configuracoes'
                  ? 'border-libra-blue text-libra-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configurações
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'simulacoes' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Visitantes</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leads Novos</p>
                    <p className="text-3xl font-bold text-green-600">{stats.novos}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Interessados</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.interessados}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contatados</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.contatados}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros e Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Buscar por nome..."
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                  />
                </div>
                
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="interessado">Interessado</SelectItem>
                    <SelectItem value="contatado">Contatado</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={loadSimulacoes} disabled={loading} variant="outline">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>

                <Button onClick={exportToCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visitantes ({filteredVisitors.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Campanha & Origem</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Valores</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Simulações</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitors.map((visitor) => {
                      const simulacao = visitor.simulacoes[0];
                      return (
                      <TableRow key={visitor.visitor_id}>
                        <TableCell className="text-sm">
                          {simulacao.created_at ? new Date(simulacao.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}
                          <br />
                          <span className="text-gray-500 text-xs">
                            {simulacao.created_at ? new Date(simulacao.created_at).toLocaleTimeString('pt-BR') : ''}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs">
                          <UTMDetails visitor={visitor} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {simulacao.nome_completo}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{simulacao.email}</div>
                          <div className="text-gray-500 text-xs break-all">
                            Sessão: {visitor.primary_session_id || 'N/D'}
                          </div>
                          <div className="text-gray-500 text-xs break-all">
                            Grupo: {visitor.visitor_id}
                          </div>
                          {visitor.journey_status && (
                            <div className="text-gray-500 text-xs">
                              Jornada: {visitor.journey_status}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-semibold text-green-600">
                            {simulacao.valor_emprestimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          <div className="text-gray-500 text-xs">
                            Imóvel: {simulacao.valor_imovel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </TableCell>
                        <TableCell>{simulacao.parcelas ? `${simulacao.parcelas}x` : '—'}</TableCell>
                        <TableCell>{visitor.total_simulacoes}</TableCell>
                        <TableCell>
                          <Select
                            value={simulacao.status || 'novo'}
                            onValueChange={(value) => updateStatus(simulacao.id!, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="novo">Novo</SelectItem>
                              <SelectItem value="interessado">Interessado</SelectItem>
                              <SelectItem value="contatado">Contatado</SelectItem>
                              <SelectItem value="finalizado">Finalizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredVisitors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma simulação encontrada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {activeTab === 'parceiros' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Parceiros</p>
                    <p className="text-3xl font-bold text-blue-600">{statsParceiros.total}</p>
                  </div>
                  <Handshake className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pendentes</p>
                    <p className="text-3xl font-bold text-yellow-600">{statsParceiros.pendentes}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Aprovados</p>
                    <p className="text-3xl font-bold text-green-600">{statsParceiros.aprovados}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rejeitados</p>
                    <p className="text-3xl font-bold text-red-600">{statsParceiros.rejeitados}</p>
                  </div>
                  <Building className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros e Ações - Parceiros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Buscar por nome..."
                    value={filtroNomeParceiros}
                    onChange={(e) => setFiltroNomeParceiros(e.target.value)}
                  />
                </div>
                
                <Select value={filtroStatusParceiros} onValueChange={setFiltroStatusParceiros}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={loadParceiros} disabled={loadingParceiros} variant="outline">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingParceiros ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>

                <Button onClick={exportParceirosToCsv} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parceiros ({filteredParceiros.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Experiência</TableHead>
                      <TableHead>Ramo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParceiros.map((parceiro) => (
                      <TableRow key={parceiro.id}>
                        <TableCell className="text-sm">
                          {parceiro.created_at ? new Date(parceiro.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}
                          <br />
                          <span className="text-gray-500 text-xs">
                            {parceiro.created_at ? new Date(parceiro.created_at).toLocaleTimeString('pt-BR') : ''}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {parceiro.nome}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{parceiro.email}</div>
                          <div className="text-gray-500">{formatPhone(parceiro.telefone)}</div>
                        </TableCell>
                        <TableCell>{parceiro.cidade}</TableCell>
                        <TableCell className="text-sm">
                          {parceiro.cnpj && parceiro.cnpj.length >= 8 ? 
                            `${parceiro.cnpj.substring(0, 8)}****` : 
                            parceiro.cnpj || 'Não informado'
                          }
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{parceiro.tempo_home_equity}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {parceiro.ramo_atuacao}
                        </TableCell>
                        <TableCell className="text-sm">
                          {parceiro.origem}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={parceiro.status || 'pendente'} 
                            onValueChange={(value) => updateParceiroStatus(parceiro.id!, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_analise">Em Análise</SelectItem>
                              <SelectItem value="aprovado">Aprovado</SelectItem>
                              <SelectItem value="rejeitado">Rejeitado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredParceiros.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum parceiro encontrado.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {activeTab === 'blog' && (
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Blog</h2>
              <p className="text-gray-600">Criar, editar e gerenciar posts do blog</p>
            </div>
              <Button
                onClick={() => {
                  setEditingPost(null);
                  setPostForm({
                    published: true,
                    featuredPost: false,
                    scheduledAt: new Date().toISOString()
                  });
                  setShowPostEditor(true);
                }}
                className="bg-libra-blue hover:bg-libra-blue/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Post
            </Button>
          </div>

          {showPostEditor && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{editingPost ? 'Editar Post' : 'Novo Post'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Título</label>
                    <Input 
                      placeholder="Título do post" 
                      value={postForm.title || ''}
                      onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoria</label>
                    <Select 
                      value={postForm.category || ''} 
                      onValueChange={(value) => setPostForm({...postForm, category: value as BlogPost['category']})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home-equity">Home Equity</SelectItem>
                        <SelectItem value="cgi">Capital de Giro</SelectItem>
                        <SelectItem value="consolidacao">Consolidação</SelectItem>
                        <SelectItem value="educacao-financeira">Educação Financeira</SelectItem>
                        <SelectItem value="score-credito">Score e Crédito</SelectItem>
                        <SelectItem value="credito-rural">Crédito Rural</SelectItem>
                        <SelectItem value="documentacao">Documentação</SelectItem>
                        <SelectItem value="reformas">Reformas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <Input 
                    placeholder="Breve descrição do post" 
                    value={postForm.description || ''}
                    onChange={(e) => setPostForm({...postForm, description: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Imagem do Post</label>
                  <ImageUploader
                    currentImage={postForm.imageUrl}
                    onImageUpload={(imageUrl) => setPostForm({...postForm, imageUrl})}
                    onImageRemove={() => setPostForm({...postForm, imageUrl: ''})}
                    maxSize={5}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug</label>
                    <Input 
                      placeholder="url-do-post" 
                      value={postForm.slug || ''}
                      onChange={(e) => setPostForm({...postForm, slug: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {postForm.title ? `Sugestão: ${BlogService.generateSlug(postForm.title)}` : 'Deixe vazio para gerar automaticamente'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tempo de Leitura (min)</label>
                    <Input 
                      type="number" 
                      placeholder="5" 
                      value={postForm.readTime || ''}
                      onChange={(e) => setPostForm({...postForm, readTime: parseInt(e.target.value) || 0})}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {postForm.content ? `Auto: ${(() => {
                        try {
                          return BlogService.calculateReadTime(postForm.content);
                        } catch (error) {
                          console.error('Erro ao calcular tempo de leitura:', error);
                          return 5;
                        }
                      })()} min` : 'Calculado automaticamente'}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Data e hora de publicação</label>
                      <Input
                        type="datetime-local"
                        min={formatDateTimeLocal(new Date().toISOString())}
                        value={formatDateTimeLocal(postForm.scheduledAt)}
                        onChange={(e) => setPostForm({
                          ...postForm,
                          scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Defina quando o post deve ser publicado. Datas passadas não são permitidas para novos agendamentos.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="published"
                        checked={postForm.published || false}
                        onChange={(e) => setPostForm({...postForm, published: e.target.checked})}
                        className="rounded"
                      />
                      <label htmlFor="published" className="text-sm font-medium">
                        Publicar imediatamente
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="featured"
                        checked={postForm.featuredPost || false}
                        onChange={(e) => setPostForm({...postForm, featuredPost: e.target.checked})}
                        className="rounded"
                      />
                      <label htmlFor="featured" className="text-sm font-medium">
                        Post em destaque
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Conteúdo</label>
                  <div className="border border-gray-300 rounded-md">
                    {/* Editor Header */}
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>📝 Editor de Markdown</span>
                          <span>•</span>
                          <span>Palavras: {countWords(postForm.content || '')}</span>
                        </div>
                        
                        {/* Editor Mode Toggle */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={editorMode === 'write' ? 'default' : 'outline'}
                            onClick={() => setEditorMode('write')}
                            className="h-7 text-xs"
                          >
                            Escrever
                          </Button>
                          <Button
                            size="sm"
                            variant={editorMode === 'preview' ? 'default' : 'outline'}
                            onClick={() => setEditorMode('preview')}
                            className="h-7 text-xs"
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant={editorMode === 'split' ? 'default' : 'outline'}
                            onClick={() => setEditorMode('split')}
                            className="h-7 text-xs"
                          >
                            Dividido
                          </Button>
                        </div>
                      </div>
                      
                      {/* Formatting Toolbar */}
                      {editorMode !== 'preview' && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('**', '**', 'texto em negrito')}
                            className="h-7 text-xs font-bold"
                            title="Negrito"
                          >
                            B
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('*', '*', 'texto em itálico')}
                            className="h-7 text-xs italic"
                            title="Itálico"
                          >
                            I
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('[', '](url)', 'texto do link')}
                            className="h-7 text-xs"
                            title="Link"
                          >
                            🔗
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('## ', '', 'Título da seção')}
                            className="h-7 text-xs"
                            title="Título H2"
                          >
                            H2
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('### ', '', 'Subtítulo')}
                            className="h-7 text-xs"
                            title="Título H3"
                          >
                            H3
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('- ', '', 'item da lista')}
                            className="h-7 text-xs"
                            title="Lista"
                          >
                            •
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('> ', '', 'citação')}
                            className="h-7 text-xs"
                            title="Citação"
                          >
                            "
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertText('`', '`', 'código')}
                            className="h-7 text-xs font-mono"
                            title="Código Inline"
                          >
                            &lt;/&gt;
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Editor Content */}
                    <div className={`flex ${editorMode === 'split' ? 'divide-x' : ''}`}>
                      {/* Text Editor */}
                      {(editorMode === 'write' || editorMode === 'split') && (
                        <div className={editorMode === 'split' ? 'w-1/2' : 'w-full'}>
                          <textarea 
                            className="w-full h-80 p-4 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="# Título do Post

## Introdução
Escreva seu conteúdo aqui...

### Subtítulo
- Item 1
- Item 2

**Texto em negrito**
*Texto em itálico*

[Link para site](https://exemplo.com)

> Esta é uma citação

`código inline`"
                            value={postForm.content || ''}
                            onChange={(e) => setPostForm({...postForm, content: e.target.value})}
                          />
                        </div>
                      )}
                      
                      {/* Preview */}
                      {(editorMode === 'preview' || editorMode === 'split') && (
                        <div className={`${editorMode === 'split' ? 'w-1/2' : 'w-full'} h-80 overflow-y-auto`}>
                          <div 
                            className="p-4 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: renderMarkdown(postForm.content || '') || '<p class="text-gray-400 italic">Nada para mostrar ainda. Digite algo no editor.</p>'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    💡 Dica: Use os botões de formatação ou digite Markdown diretamente. Imagens: &lt;img src="url" alt="descrição" /&gt;
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="bg-libra-blue hover:bg-libra-blue/90"
                    onClick={handleSavePost}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPostEditor(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!showPostEditor && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Posts do Blog</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => loadBlogPosts()}
                      disabled={loadingBlog}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${loadingBlog ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-4 mt-4">
                  <Select 
                    value={filtroStatusBlog} 
                    onValueChange={setFiltroStatusBlog}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="published">Publicados</SelectItem>
                      <SelectItem value="scheduled">Agendados</SelectItem>
                      <SelectItem value="draft">Rascunhos</SelectItem>
                      <SelectItem value="featured">Em Destaque</SelectItem>
                      <SelectItem value="featured_scheduled">Destaques Agendados</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input 
                    placeholder="Buscar por título..."
                    value={filtroTituloBlog}
                    onChange={(e) => setFiltroTituloBlog(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
              <div className="space-y-4">
                {loadingBlog ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Carregando posts...
                    </div>
                  </div>
                ) : getFilteredBlogPosts().length > 0 ? (
                  getFilteredBlogPosts().map((post) => {
                    const isScheduled = BlogService.isPostScheduled(post, now);
                    const isPublishedPost = BlogService.isPostPublished(post, now);
                    const scheduledDate = BlogService.getScheduledDate(post);

                    return (
                      <div key={post.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="w-20 h-20 object-cover rounded-lg border"
                              width={80}
                              height={80}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/80x80?text=Image';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg text-gray-900 truncate">
                                    {post.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {post.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                                      {post.category}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      📖 {post.readTime} min
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      🕒 {post.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                                    </span>
                                    {isScheduled && (
                                      <span className="text-xs text-blue-600">
                                        Agendado para {scheduledDate.toLocaleString('pt-BR')}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge
                                      variant={isPublishedPost ? "default" : isScheduled ? "outline" : "secondary"}
                                      className="text-xs"
                                    >
                                      {isPublishedPost ? '✅ Publicado' : isScheduled ? '⏳ Agendado' : '📝 Rascunho'}
                                    </Badge>
                                    {isPublishedPost && post.publishedAt && (
                                      <Badge variant="outline" className="text-xs">
                                        Publicado em {new Date(post.publishedAt).toLocaleDateString('pt-BR')}
                                      </Badge>
                                    )}
                                    {post.featuredPost && (
                                      <Badge variant="outline" className="text-xs">
                                        ⭐ Destaque
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPost(post);
                                setPostForm({
                                  ...post,
                                  scheduledAt: post.scheduledAt || post.createdAt || new Date().toISOString()
                                });
                                setShowPostEditor(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('/blog/' + post.slug, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePost(post.id!)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <FileText className="w-16 h-16 mx-auto mb-4" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {filtroStatusBlog === 'todos' ? 'Nenhum post encontrado' : 'Nenhum post com este filtro'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {filtroStatusBlog === 'todos' 
                        ? 'Comece criando seu primeiro post do blog!'
                        : 'Tente ajustar os filtros ou crie um novo post.'
                      }
                    </p>
                    <Button
                      onClick={() => {
                        setEditingPost(null);
                        setPostForm({
                          published: true,
                          featuredPost: false,
                          scheduledAt: new Date().toISOString()
                        });
                        setShowPostEditor(true);
                      }}
                      className="bg-libra-blue hover:bg-libra-blue/90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Post
                    </Button>
                  </div>
                )}

                {getFilteredBlogPosts().length > 0 && (
                  <div className="mt-8 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {blogPosts.length}
                        </div>
                        <div className="text-sm text-gray-500">Total de Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {publishedBlogPosts.length}
                        </div>
                        <div className="text-sm text-gray-500">Publicados (ativos)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {scheduledBlogPosts.length}
                        </div>
                        <div className="text-sm text-gray-500">Agendados</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {draftBlogPosts.length}
                        </div>
                        <div className="text-sm text-gray-500">Rascunhos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {featuredPublishedPosts.length}
                        </div>
                        <div className="text-sm text-gray-500">Destaques Publicados</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {featuredScheduledPosts.length}
                        </div>
                        <div className="text-sm text-gray-500">Destaques Agendados</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      )}
      
      {activeTab === 'configuracoes' && (
        <div>
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Simulador Interno</CardTitle>
                <p className="text-gray-600">Configure os parâmetros do simulador local. Essas configurações serão aplicadas em todas as simulações do site.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Limites de Valor do Empréstimo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Valor Mínimo (R$)</label>
                      <Input 
                        type="number"
                        value={simulationConfig.valorMinimo}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig, 
                          valorMinimo: parseInt(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Valor mínimo para empréstimo</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Valor Máximo (R$)</label>
                      <Input 
                        type="number"
                        value={simulationConfig.valorMaximo}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig, 
                          valorMaximo: parseInt(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Valor máximo para empréstimo</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Limites de Parcelas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Parcelas Mínimas</label>
                      <Input 
                        type="number"
                        value={simulationConfig.parcelasMin}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig, 
                          parcelasMin: parseInt(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Quantidade mínima de parcelas</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Parcelas Máximas</label>
                      <Input 
                        type="number"
                        value={simulationConfig.parcelasMax}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig, 
                          parcelasMax: parseInt(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Quantidade máxima de parcelas</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Taxa de Juros e Custos Operacionais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Taxa de Juros (% a.m.)</label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={simulationConfig.juros}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig, 
                          juros: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Taxa de juros mensal para cálculos (ex: 1.19 = 1,19% a.m.)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">% de Custos da Operação</label>
                      <Input 
                        type="number" 
                        step="0.1"
                        value={simulationConfig.custoOperacional}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig, 
                          custoOperacional: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentual de custos inclusos (avaliação, cartório, impostos)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">DFI, Prestamista e Taxa Administrativa</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">% DFI</label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={simulationConfig.dfiPercentual}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig,
                          dfiPercentual: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentual do seguro DFI (mensal)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">% Prestamista</label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={simulationConfig.prestamistaPercentual}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig,
                          prestamistaPercentual: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentual do seguro prestamista (mensal)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Taxa Administrativa (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={simulationConfig.taxaAdministrativa}
                        onChange={(e) => setSimulationConfig({
                          ...simulationConfig,
                          taxaAdministrativa: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Valor fixo acrescido em cada parcela</p>
                    </div>
                  </div>
                </div>

                
                <div className="pt-4 border-t">
                  <Button 
                    className="bg-libra-blue hover:bg-libra-blue/90"
                    onClick={handleSaveConfig}
                    disabled={loadingConfig}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loadingConfig ? 'Salvando...' : 'Salvar Todas as Configurações'}
                  </Button>
                  <p className="text-sm text-gray-600 mt-2">
                    ✅ Configurações são aplicadas automaticamente ao simulador interno
                  </p>
                  <div className="text-xs text-gray-500 mt-3 space-y-1">
                    <p><strong>Valores atuais:</strong></p>
                    <p>• Empréstimo: {simulationConfig.valorMinimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a {simulationConfig.valorMaximo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p>• Parcelas: {simulationConfig.parcelasMin} a {simulationConfig.parcelasMax} meses</p>
                    <p>• Taxa: {simulationConfig.juros}% a.m. + {simulationConfig.custoOperacional}% de custos</p>
                    <p>• DFI: {simulationConfig.dfiPercentual}% | Prestamista: {simulationConfig.prestamistaPercentual}%</p>
                    <p>• Taxa Adm.: R$ {simulationConfig.taxaAdministrativa}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <p className="text-gray-600">Configurações do sistema e notificações</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações por Email</h4>
                    <p className="text-sm text-gray-600">Receber notificações de novas simulações</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Backup Automático</h4>
                    <p className="text-sm text-gray-600">Backup diário dos dados</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email para Notificações</label>
                  <Input placeholder="admin@libracredito.com.br" />
                </div>
                
                <Button className="bg-libra-blue hover:bg-libra-blue/90">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Diagnóstico/Cache</h3>
              <StorageStats />
              <SupabaseDiagnostics />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;