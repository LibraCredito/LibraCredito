import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Tag from 'lucide-react/dist/esm/icons/tag';
import { Button } from '@/components/ui/button';
import MobileLayout from '@/components/MobileLayout';
import WaveSeparator from '@/components/ui/WaveSeparator';
import { BlogService, type BlogPost as BlogPostType } from '@/services/blogService';
import Seo from '@/components/Seo';
import { renderMarkdown } from '@/utils/markdown';

type BlogPost = BlogPostType;

interface BlogPostPageProps { initialPost?: BlogPost; }

const BlogPost: React.FC<BlogPostPageProps> = ({ initialPost }) => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);

  useEffect(() => {
    const loadPost = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const foundPost = await BlogService.getPostWithContent(slug);
        if (foundPost) {
          setPost(foundPost);
        }
      } catch (error) {
        console.error('Erro ao carregar post:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!initialPost || !initialPost.content) {
      loadPost();
    } else {
      setLoading(false);
    }
  }, [slug, initialPost]);

  if (loading) {
    return (
      <MobileLayout>
        <WaveSeparator variant="hero" height="md" inverted />
        <div className="bg-white flex-1 pb-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-libra-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando post...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!post) {
    return (
      <MobileLayout>
        <WaveSeparator variant="hero" height="md" inverted />
        <div className="bg-white flex-1 pb-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-libra-navy mb-4">Post não encontrado</h1>
            <p className="text-gray-600 mb-6">O post que você está procurando não existe ou foi removido.</p>
            <Link to="/blog">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Blog
              </Button>
            </Link>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Renderiza conteúdo Markdown com sanitização e estilos
  const renderContent = (content: string) => renderMarkdown(content);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://libracredito.com.br';
  const postUrl = post ? `${origin}/blog/${post.slug}` : '';
  const logoUrl = `${origin}/images/logos/logo-azul.png`;
  const datePublished = post?.createdAt ? new Date(post.createdAt).toISOString() : undefined;
  const dateModified = post?.updatedAt ? new Date(post.updatedAt).toISOString() : undefined;

  return (
    <MobileLayout>
      {post && (
        <Seo
          title={`${post.metaTitle ?? post.title} | Blog Libra Crédito`}
          description={post.metaDescription ?? post.description}
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.metaTitle ?? post.title,
            description: post.metaDescription ?? post.description,
            author: {
              '@type': 'Organization',
              name: 'Libra Crédito'
            },
            image: post.imageUrl,
            datePublished,
            dateModified,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': postUrl
            },
            publisher: {
              '@type': 'Organization',
              name: 'Libra Crédito',
              logo: {
                '@type': 'ImageObject',
                url: logoUrl
              }
            },
            keywords: post.tags?.join(', '),
            articleSection: post.category
          }}
          schemaId="article-schema"
        />
      )}
      <WaveSeparator variant="hero" height="md" inverted />
      
      <div className="bg-white flex-1 pb-8 md:pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <div className="mb-6 mt-8">
            <Link to="/blog">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Blog
              </Button>
            </Link>
          </div>

          {/* Post Header */}
          <article className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="relative overflow-hidden">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-auto max-h-screen object-contain transition-transform duration-300 hover:scale-105"
                width={1280}
                height={720}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
            
            <div className="p-6 md:p-10">
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 text-sm mb-6">
                <span className="flex items-center gap-2 bg-libra-blue/10 text-libra-navy px-3 py-1 rounded-full font-medium">
                  <Tag className="w-4 h-4" />
                  {post.category}
                </span>
                <span className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.createdAt || '').toLocaleDateString('pt-BR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <span className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  {post.readTime} min de leitura
                </span>
              </div>

              {/* Title and Description */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-libra-navy mb-6 leading-tight">
                {post.title}
              </h1>
              <div className="h-1 w-16 bg-gradient-to-r from-libra-blue to-libra-navy rounded-full mb-6"></div>
              <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed font-light">
                {post.description}
              </p>

              {/* Content */}
              <div className="mt-8">
                <div 
                  className="prose prose-lg max-w-none 
                           prose-headings:font-bold prose-headings:text-libra-navy 
                           prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6 
                           prose-a:text-libra-blue prose-a:font-medium prose-a:underline 
                           prose-a:decoration-libra-blue hover:prose-a:text-libra-navy 
                           hover:prose-a:decoration-libra-navy 
                           prose-strong:text-libra-navy prose-strong:font-semibold 
                           prose-em:text-gray-700 
                           prose-ul:space-y-2 prose-ol:space-y-2 
                           prose-li:text-gray-700 prose-li:leading-relaxed 
                           prose-blockquote:border-l-4 prose-blockquote:border-libra-blue 
                           prose-blockquote:bg-gray-50 prose-blockquote:p-4 
                           prose-blockquote:italic prose-blockquote:text-gray-700 
                           prose-code:bg-gray-100 prose-code:text-libra-navy 
                           prose-code:px-2 prose-code:py-1 prose-code:rounded 
                           prose-code:font-mono prose-code:text-sm 
                           prose-img:rounded-lg prose-img:shadow-md prose-img:my-8
                           text-base md:text-lg"
                  dangerouslySetInnerHTML={{ __html: renderContent(post.content || '') }}
                />
              </div>
            </div>
          </article>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-2xl p-8 md:p-12 text-libra-navy shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-libra-navy">
                  Precisa de crédito com garantia de imóvel?
                </h2>
                <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto text-libra-navy">
                  Simule agora e descubra as melhores condições para você. Processo 100% digital e sem complicações.
                </p>
                <Link to="/simulacao">
                  <Button size="lg" className="bg-red-600 text-white hover:bg-red-700 font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300">
                    Fazer Simulação Gratuita
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default BlogPost;