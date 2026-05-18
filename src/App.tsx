import { Suspense, lazy, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from '@/components/ScrollToTop';
import { MobileProvider } from '@/hooks/useMobileContext';
import LazyGlobalTracker from '@/components/LazyGlobalTracker';
import { HelmetProvider } from 'react-helmet-async';

// Lazy load TooltipProvider para LCP
const TooltipProvider = lazy(() => import('@/components/ui/tooltip').then(m => ({ default: m.TooltipProvider })));

// Import homepage directly (not lazy) for faster LCP
import Index from "./pages/Index";
import { Toaster } from '@/components/ui/toast';

// Lazy load other components
const Vantagens = lazy(() => import("./pages/Vantagens"));
const QuemSomos = lazy(() => import("./pages/QuemSomos"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Parceiros = lazy(() => import("./pages/Parceiros"));
const Simulacao = lazy(() => import("./pages/Simulacao"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const PoliticaCookies = lazy(() => import("./pages/PoliticaCookies"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SimulacaoSapi = lazy(() => import("./pages/SimulacaoSapi"));
const SimulacaoLocal = lazy(() => import("./pages/SimulacaoLocal"));
const Confirmacao = lazy(() => import("./pages/Confirmacao"));
const Sucesso = lazy(() => import("./pages/Sucesso"));
const Atendimento = lazy(() => import("./pages/Atendimento"));
const WhatsAppRedirect = lazy(() => import("./pages/WhatsAppRedirect"));

let devRoutes = null;

if (import.meta.env.DEV) {
  const SupabaseTestPage = lazy(() => import("../temp-files/test-pages/SupabaseTestPage"));
  const MobileDemo = lazy(() => import("../temp-files/test-pages/MobileDemo"));
  const SimulacaoWizard = lazy(() => import("./pages/SimulacaoWizard"));
  const SimpleWizardTest = lazy(() => import("../temp-files/test-pages/SimpleWizardTest"));
  const MobileNavDemo = lazy(() => import("../temp-files/test-pages/MobileNavDemo"));
  const Home2 = lazy(() => import("../temp-files/experimental-pages/Home2"));
  const TestWebhook = lazy(() => import("../temp-files/test-pages/TestWebhook"));

  devRoutes = (
    <>
      <Route path="/test-supabase" element={<SupabaseTestPage />} />
      <Route path="/test-webhook" element={<TestWebhook />} />
      <Route path="/mobile-demo" element={<MobileDemo />} />
      <Route path="/mobile-nav" element={<MobileNavDemo />} />
      <Route path="/simulacao-wizard" element={<SimulacaoWizard />} />
      <Route path="/wizard-test" element={<SimpleWizardTest />} />
      <Route path="/home2" element={<Home2 />} />
    </>
  );
}

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-libra-blue mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Carregando página...</p>
    </div>
  </div>
);

// Configure query client outside component to prevent re-initialization
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App = () => {
  const [AnalyticsComponent, setAnalyticsComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (import.meta.env.PROD) {
      import('@vercel/analytics/react').then((m) => {
        setAnalyticsComponent(() => m.Analytics);
      });
    }
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MobileProvider>
          <BrowserRouter>
            <LazyGlobalTracker />
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
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
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
                {devRoutes}
                <Route path="/confirmacao" element={<Confirmacao />} />
                <Route path="/confirmação" element={<Confirmacao />} />
                <Route path="/atendimento" element={<Atendimento />} />
                <Route path="/WPP-LIBRA" element={<WhatsAppRedirect />} />
                <Route path="/sucesso" element={<Sucesso />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
          {AnalyticsComponent && <AnalyticsComponent />}
        </MobileProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
