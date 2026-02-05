import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { useNavigate, Link } from 'react-router-dom';
import { BlogService, type BlogPost } from '@/services/blogService';
import { useIsMobile } from '@/hooks/use-mobile';

const FALLBACK_IMAGE_URL = 'https://placehold.co/1280x720?text=Blog+Image';

const BlogSection: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const loadLatestPosts = async () => {
      try {
        const allPosts = await BlogService.getPublishedPosts();
        // Pegar apenas os 3 posts mais recentes
        setPosts(allPosts.slice(0, 3));
      } catch (error) {
        console.error('Erro ao carregar posts do blog:', error);
        // Fallback para posts fictícios se houver erro
        setPosts([
          {
            id: '1',
            title: "Como calcular o valor do empréstimo com garantia de imóvel",
            description: "Descubra como determinar o valor ideal para seu empréstimo baseado no valor do seu imóvel.",
            imageUrl: "https://placehold.co/600x400?text=Blog+Image",
            category: "home-equity",
            readTime: 5,
            slug: "como-calcular-valor-emprestimo",
            createdAt: new Date().toISOString(),
            published: true
          },
          {
            id: '2',
            title: "Vantagens do Home Equity vs Financiamento Tradicional",
            description: "Compare as modalidades e entenda qual é a melhor opção para seu perfil e necessidades.",
            imageUrl: "https://placehold.co/600x400?text=Blog+Image",
            category: "home-equity",
            readTime: 7,
            slug: "vantagens-home-equity",
            createdAt: new Date().toISOString(),
            published: true
          },
          {
            id: '3',
            title: "Documentos necessários para crédito com garantia de imóvel",
            description: "Lista completa dos documentos necessários para agilizar seu processo de aprovação.",
            imageUrl: "https://placehold.co/600x400?text=Blog+Image",
            category: "documentacao",
            readTime: 4,
            slug: "documentos-necessarios",
            createdAt: new Date().toISOString(),
            published: true
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (shouldLoad) {
      loadLatestPosts();
    }
  }, [shouldLoad]);

  // Start loading when section enters the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    const element = document.getElementById('blog-section');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  const handleGoToBlog = () => {
    navigate('/blog');
  };

  return (
    <section id="blog-section" className={`${isMobile ? 'py-12' : 'py-16'} bg-white`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'} font-bold text-[#003399] mb-4`}>
            Blog Libra
          </h2>
          <p className={`${isMobile ? 'text-base px-2' : 'text-lg'} text-gray-600 max-w-2xl mx-auto mb-6 md:mb-8`}>
            Fique por dentro das novidades e dicas sobre crédito com garantia de imóvel
          </p>
          
          <Button 
            onClick={handleGoToBlog}
            size={isMobile ? "default" : "lg"}
            className={`${isMobile ? 'mb-8' : 'mb-12'} bg-[#003399] hover:bg-[#003399]/90 text-white`}
          >
            Ver Todos os Posts
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full aspect-video bg-gray-200 rounded-t-lg"></div>
                <CardHeader className="pb-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-full"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {posts.map((post) => (
              <Link 
                key={post.id} 
                to={`/blog/${post.slug}`}
                className="block group"
              >
                <Card className="hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 overflow-hidden h-full">
                  {/* Imagem do post */}
                  <div className="aspect-video overflow-hidden rounded-t-lg bg-white">
                    <img
                      src={post.imageUrl || FALLBACK_IMAGE_URL}
                      alt={post.metaTitle ?? post.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      width={1280}
                      height={720}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.dataset.fallback !== 'true') {
                          target.src = FALLBACK_IMAGE_URL;
                          target.dataset.fallback = 'true';
                        }
                      }}
                    />
                  </div>
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(post.createdAt || '').toLocaleDateString('pt-BR')}
                      <Clock className="w-4 h-4 ml-4 mr-1" />
                      {post.readTime} min
                    </div>
                    <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} leading-tight text-[#003399] group-hover:text-[#0044aa] transition-colors`}>
                      {post.metaTitle ?? post.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'} leading-relaxed mb-4 line-clamp-2`}>
                      {post.metaDescription ?? post.description}
                    </p>
                    <div className="flex items-center text-[#003399] group-hover:text-[#0044aa] transition-colors">
                      <span className="text-sm font-medium">Ler mais</span>
                      <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
