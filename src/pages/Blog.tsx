import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Search from 'lucide-react/dist/esm/icons/search';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Home from 'lucide-react/dist/esm/icons/home';
import Building from 'lucide-react/dist/esm/icons/building';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import MobileLayout from '@/components/MobileLayout';
import WaveSeparator from '@/components/ui/WaveSeparator';
import { BlogService, type BlogPost as BlogPostType } from '@/services/blogService';
import { useIsMobile } from '@/hooks/use-mobile';
import Seo from '@/components/Seo';

// Usar o tipo do BlogService
type BlogPost = BlogPostType;

const CATEGORIES = [
  {
    id: 'home-equity',
    name: 'Home Equity',
    icon: Home,
    description: 'Crédito com garantia de imóvel - melhores condições'
  },
  {
    id: 'cgi',
    name: 'Capital de Giro',
    icon: TrendingUp,
    description: 'Soluções inteligentes para capital de giro empresarial'
  },
  {
    id: 'consolidacao',
    name: 'Consolidação de Dívidas',
    icon: Wallet,
    description: 'Organize suas finanças e reduza juros'
  },
  {
    id: 'credito-rural',
    name: 'Crédito Rural',
    icon: Building,
    description: 'Financiamento para propriedades rurais e agronegócio'
  },
  {
    id: 'documentacao',
    name: 'Documentação',
    icon: FileText,
    description: 'Guias sobre documentos e regularização'
  },
  {
    id: 'score-credito',
    name: 'Score e Crédito',
    icon: CreditCard,
    description: 'Dicas para melhorar seu score e análise de crédito'
  },
  {
    id: 'educacao-financeira',
    name: 'Educação Financeira',
    icon: BookOpen,
    description: 'Conhecimento para decisões financeiras conscientes'
  },
  {
    id: 'reformas',
    name: 'Projetos/Reformas',
    icon: Home,
    description: 'Realize seus projetos com as melhores condições'
  }
];

interface BlogProps { initialPosts?: BlogPost[]; }

const Blog: React.FC<BlogProps> = ({ initialPosts = [] }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const resolvedInitialPosts = useMemo(() => {
    if (initialPosts.length > 0) {
      return initialPosts;
    }

    if (typeof window !== 'undefined' && Array.isArray(window.__INITIAL_DATA__?.posts)) {
      return window.__INITIAL_DATA__?.posts ?? [];
    }

    return [];
  }, [initialPosts]);

  const [posts, setPosts] = useState<BlogPost[]>(resolvedInitialPosts);
  const [loading, setLoading] = useState(resolvedInitialPosts.length === 0);

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog Libra Crédito',
    description:
      'Confira artigos e dicas sobre capital de giro, consolidação de dívidas e financiamento para reformas. Mantenha-se informado com o blog da Libra Crédito.',
    url: 'https://libracredito.com.br/blog'
  };

  useEffect(() => {
    // Carregar posts do BlogService
    const loadPosts = async () => {
      try {
        const allPosts = await BlogService.getPublishedPosts();
        setPosts(allPosts);
      } catch (error) {
        console.error('Erro ao carregar posts:', error);
      } finally {
        setLoading(false);
      }
    };
    if (resolvedInitialPosts.length === 0) {
      setLoading(true);
    }
    loadPosts();
  }, [initialPosts, resolvedInitialPosts.length]);

  useEffect(() => {
    setPosts(resolvedInitialPosts);
  }, [resolvedInitialPosts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__INITIAL_DATA__ = undefined;
    }
  }, []);

  const handleSimular = () => {
    navigate('/simulacao');
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MobileLayout>
      <Seo
        title="Blog | Libra Crédito | Artigos e Dicas Financeiras"
        description="Confira artigos e dicas sobre capital de giro, consolidação de dívidas e financiamento para reformas. Mantenha-se informado com o blog da Libra Crédito."
        canonicalUrl="https://libracredito.com.br/blog"
        jsonLd={blogJsonLd}
        schemaId="blog-schema"
      />
      <WaveSeparator variant="hero" height="md" inverted />
      
      <div className="bg-white pb-8 md:pb-12">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-4 mt-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-libra-navy mb-2">
              Blog Libra Crédito
            </h1>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar artigos..."
                className="pl-10 pr-4 py-3 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          {isMobile ? (
            <Carousel className="mb-8">
              <CarouselContent className="-ml-2">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <CarouselItem key={category.id} className="basis-1/3 pl-2">
                      <Button
                        variant="outline"
                        className={`h-auto p-3 flex flex-col items-center gap-1 whitespace-normal hover:bg-libra-blue/5 ${
                          selectedCategory === category.id ? 'border-libra-blue text-libra-blue' : ''
                        }`}
                        onClick={() =>
                          setSelectedCategory(
                            selectedCategory === category.id ? null : category.id
                          )
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-semibold text-center leading-tight break-words">
                          {category.name}
                        </span>
                      </Button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="-left-4" />
              <CarouselNext className="-right-4" />
            </Carousel>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-8">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant="outline"
                    className={`h-auto p-2 flex flex-col items-center gap-1 whitespace-normal hover:bg-libra-blue/5 ${
                      selectedCategory === category.id ? 'border-libra-blue text-libra-blue' : ''
                    }`}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === category.id ? null : category.id
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold text-center leading-tight break-words">
                      {category.name}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Blog Posts */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm animate-pulse">
                    <div className="aspect-video bg-gray-200 rounded-t-xl"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-full mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <article>
                      <div className="aspect-video overflow-hidden rounded-t-xl bg-white">
                        <img
                          src={post.imageUrl}
                          alt={post.metaTitle ?? post.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          width={1280}
                          height={720}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://placehold.co/1280x720?text=Blog+Image';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <span className="text-sm text-libra-blue font-medium">
                          {CATEGORIES.find(cat => cat.id === post.category)?.name}
                        </span>
                        <h3 className="text-lg font-bold text-libra-navy mt-2 mb-2 group-hover:text-libra-blue transition-colors">
                          {post.metaTitle ?? post.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {post.metaDescription ?? post.description}
                        </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{new Date(post.createdAt || '').toLocaleDateString('pt-BR')}</span>
                        <span>{post.readTime} min de leitura</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">Nenhum post encontrado</div>
              <p className="text-gray-400">Tente ajustar os filtros ou termo de busca</p>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <section className="py-12 bg-white border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-libra-navy mb-4`}>
                Já tem o conhecimento? Agora é a hora!
              </h2>
              <p className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-600 mb-6`}>
                Aplique o que aprendeu e descubra suas condições personalizadas
              </p>
              <Button
                onClick={handleSimular}
                size="lg"
                className="bg-red-600 text-white hover:bg-red-700 font-semibold px-8 py-3 text-lg"
              >
                Simular Agora
              </Button>
            </div>
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default Blog;
