import { Link } from 'react-router-dom';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Clock3 from 'lucide-react/dist/esm/icons/clock-3';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Seo from '@/components/Seo';

const ExperiencePreview = () => (
  <main className="min-h-screen bg-[#f7f9fc] text-[#0a2558]">
    <Seo
      title="Experiência Libra | Preview interno"
      description="Preview interno da nova experiência digital Libra Crédito."
      robots="noindex,nofollow"
    />

    <header className="border-b border-[#0a2558]/10 bg-white/90 backdrop-blur">
      <div className="container flex min-h-20 items-center justify-between gap-4 py-4">
        <Link to="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a2558]">
          <img src="/images/logos/logo-header.svg" alt="Libra Crédito" className="h-9 w-auto" width={144} height={36} />
          <span className="hidden border-l border-[#0a2558]/15 pl-3 text-sm font-semibold sm:inline">Preview interno</span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-[#0a2558] underline underline-offset-4 hover:text-[#1463c3]">
          Ver site atual
        </Link>
      </div>
    </header>

    <section className="container grid gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
      <div className="max-w-3xl">
        <p className="mb-5 inline-flex rounded-full bg-[#dceaf9] px-4 py-2 text-sm font-bold text-[#0a4b91]">
          Crédito com garantia de imóvel
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Seu patrimônio pode abrir caminhos para seus próximos planos.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#385070] sm:text-xl">
          Uma experiência clara para entender possibilidades de crédito, simular cenários e contar com orientação humana em cada etapa.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/simulacao" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#0a2558] px-6 font-bold text-white shadow-lg shadow-[#0a2558]/20 transition hover:bg-[#123878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a2558] focus-visible:ring-offset-2">
            Fazer uma simulação <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
          <a href="#como-funciona" className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#0a2558]/20 bg-white px-6 font-bold text-[#0a2558] transition hover:border-[#0a2558] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a2558] focus-visible:ring-offset-2">
            Entender como funciona
          </a>
        </div>
        <p className="mt-5 text-sm leading-6 text-[#536987]">Condições sujeitas à análise de crédito e do imóvel. Esta é uma simulação inicial, sem compromisso.</p>
      </div>

      <aside className="rounded-3xl border border-[#0a2558]/10 bg-white p-6 shadow-[0_24px_80px_rgba(10,37,88,0.12)] sm:p-8" aria-label="Pilares da experiência Libra">
        <div className="rounded-2xl bg-[#eaf4ee] p-4 text-[#175d3b]">
          <ShieldCheck aria-hidden="true" className="h-7 w-7" />
          <p className="mt-3 font-bold">Decisões com clareza</p>
          <p className="mt-1 text-sm leading-6">Você entende o que está sendo simulado antes de compartilhar seus dados.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="flex gap-3 rounded-2xl bg-[#f7f9fc] p-4"><Building2 aria-hidden="true" className="h-6 w-6 shrink-0 text-[#0a4b91]" /><p><strong className="block">Seu imóvel continua em uso</strong><span className="text-sm text-[#536987]">A garantia é analisada para viabilizar a operação.</span></p></div>
          <div className="flex gap-3 rounded-2xl bg-[#f7f9fc] p-4"><Clock3 aria-hidden="true" className="h-6 w-6 shrink-0 text-[#0a4b91]" /><p><strong className="block">Atendimento com contexto</strong><span className="text-sm text-[#536987]">A equipe recebe sua simulação para orientar o próximo passo.</span></p></div>
        </div>
      </aside>
    </section>

    <section id="como-funciona" className="border-y border-[#0a2558]/10 bg-white py-16 md:py-20">
      <div className="container">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0a4b91]">Como funciona</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Uma jornada simples, com as informações que realmente importam.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ['1', 'Conte sobre seu objetivo', 'Informe o valor desejado, o imóvel e o prazo que faz sentido para você.'],
            ['2', 'Compare seus cenários', 'Veja uma estimativa clara de parcela e entenda as premissas da simulação.'],
            ['3', 'Receba orientação personalizada', 'Se decidir avançar, nossa equipe confirma as condições e acompanha o processo.'],
          ].map(([step, title, description]) => (
            <article key={step} className="rounded-2xl border border-[#0a2558]/10 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0a2558] font-bold text-white">{step}</span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-[#536987]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="container py-16 text-center md:py-20">
      <CheckCircle2 aria-hidden="true" className="mx-auto h-8 w-8 text-[#197449]" />
      <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight">Este é um ambiente de preview da nova experiência.</h2>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-[#536987]">O site atual permanece inalterado enquanto a Libra valida visual, conteúdo, cálculos, integrações e métricas.</p>
    </section>
  </main>
);

export default ExperiencePreview;
