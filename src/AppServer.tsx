import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StaticRouter } from "react-router-dom/server";
import { Routes, Route } from "react-router-dom";
import ScrollToTop from '@/components/ScrollToTop';
import { MobileProvider } from '@/hooks/useMobileContext';
import { Toaster } from '@/components/ui/toast';
import { Analytics } from '@vercel/analytics/react';
import type { BlogPost as BlogPostType } from '@/data/blogPosts';
import LazyGlobalTracker from '@/components/LazyGlobalTracker';
import { HelmetProvider, type FilledContext } from 'react-helmet-async';

const TooltipProvider = lazy(() => import('@/components/ui/tooltip').then(m => ({ default: m.TooltipProvider })));

// Import homepage directly (not lazy) for faster LCP
import Index from "./pages/Index";

// Lazy load other components
const Vantagens = lazy(() => import("./pages/Vantagens"));
const QuemSomos = lazy(() => import("./pages/QuemSomos"));
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
const Parceiros = lazy(() => import("./pages/Parceiros"));
const Simulacao = lazy(() => import("./pages/Simulacao"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const PoliticaCookies = lazy(() => import("./pages/PoliticaCookies"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SupabaseTestPage = lazy(() => import("../temp-files/test-pages/SupabaseTestPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MobileDemo = lazy(() => import("../temp-files/test-pages/MobileDemo"));
const SimulacaoWizard = lazy(() => import("./pages/SimulacaoWizard"));
const SimpleWizardTest = lazy(() => import("../temp-files/test-pages/SimpleWizardTest"));
const MobileNavDemo = lazy(() => import("../temp-files/test-pages/MobileNavDemo"));
const SimulacaoSapi = lazy(() => import("./pages/SimulacaoSapi"));
const SimulacaoLocal = lazy(() => import("./pages/SimulacaoLocal"));
const Home2 = lazy(() => import("../temp-files/experimental-pages/Home2"));
const TestWebhook = lazy(() => import("../temp-files/test-pages/TestWebhook"));
const Confirmacao = lazy(() => import("./pages/Confirmacao"));
const Sucesso = lazy(() => import("./pages/Sucesso"));
const Atendimento = lazy(() => import("./pages/Atendimento"));
const WhatsAppRedirect = lazy(() => import("./pages/WhatsAppRedirect"));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-libra-blue mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Carregando página...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
  },
});

interface InitialData { posts?: BlogPostType[]; post?: BlogPostType; }

interface AppServerProps {
  url: string;
  initialData?: InitialData;
  helmetContext?: FilledContext;
}

const AppServer: React.FC<AppServerProps> = ({ url, initialData = {}, helmetContext }) => {
  return (
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <MobileProvider>
          <StaticRouter location={url}>
            {typeof window !== 'undefined' && <LazyGlobalTracker />}
            <ScrollToTop />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/vantagens" element={
                  <Suspense fallback={<Loading />}>
                    <TooltipProvider><Vantagens /></TooltipProvider>
                  </Suspense>
                } />
                <Route path="/quem-somos" element={<QuemSomos />} />
                <Route path="/blog" element={<Blog initialPosts={initialData.posts} />} />
                <Route path="/blog/:slug" element={<BlogPost initialPost={initialData.post} />} />
                <Route path="/parceiros" element={<Parceiros />} />
                <Route path="/simulacao" element={
                  <Suspense fallback={<Loading />}>
                    <TooltipProvider><Simulacao /></TooltipProvider>
                  </Suspense>
                } />
                <Route path="/simulacao/sapi" element={<SimulacaoSapi />} />
                <Route path="/simulacao/local" element={<SimulacaoLocal />} />
                <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
                <Route path="/politica-cookies" element={<PoliticaCookies />} />
                <Route path="/admin" element={
                  <Suspense fallback={<Loading />}>
                    <TooltipProvider><AdminDashboard /></TooltipProvider>
                  </Suspense>
                } />
                <Route path="/test-supabase" element={<SupabaseTestPage />} />
                <Route path="/test-webhook" element={<TestWebhook />} />
                <Route path="/mobile-demo" element={<MobileDemo />} />
                <Route path="/mobile-nav" element={<MobileNavDemo />} />
                <Route path="/simulacao-wizard" element={<SimulacaoWizard />} />
                <Route path="/wizard-test" element={<SimpleWizardTest />} />
                <Route path="/confirmacao" element={<Confirmacao />} />
                <Route path="/atendimento" element={<Atendimento />} />
                <Route path="/WPP-LIBRA" element={<WhatsAppRedirect />} />
                <Route path="/sucesso" element={<Sucesso />} />
                <Route path="/home2" element={<Home2 />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </StaticRouter>
          <Toaster />
          <Analytics />
        </MobileProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default AppServer;
