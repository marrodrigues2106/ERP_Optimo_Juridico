import { useParams, Navigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { specialtiesData } from '@/data/content'
import { ScrollReveal } from '@/components/ScrollReveal'

export default function Specialty() {
  const { id } = useParams<{ id: string }>()
  const specialty = specialtiesData.find((s) => s.id === id)

  if (!specialty) {
    return <Navigate to="/404" />
  }

  const Icon = specialty.icon

  return (
    <div className="min-h-screen pt-24 pb-16 flex flex-col bg-background">
      {/* Header */}
      <div className="bg-muted/30 py-16 border-b border-border">
        <div className="container px-4">
          <Button
            variant="ghost"
            className="mb-8 -ml-4 text-muted-foreground hover:text-primary transition-colors"
            asChild
          >
            <Link to="/#especialidades">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Especialidades
            </Link>
          </Button>

          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
              <div className="w-16 h-16 rounded-xl bg-primary/5 flex items-center justify-center text-accent shrink-0 shadow-sm border border-border/50">
                <Icon className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary leading-tight">
                {specialty.fullTitle || specialty.title}
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-4xl leading-relaxed">
              {specialty.description}
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div className="container px-4 py-16 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            <ScrollReveal>
              <h2 className="text-3xl font-serif font-bold mb-8 text-primary">
                Nossas Soluções e Áreas de Atuação
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {specialty.subsections.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start bg-card p-6 sm:p-8 rounded-lg border border-border/60 shadow-subtle hover:shadow-md transition-all duration-300 gap-5 group"
                  >
                    <div className="bg-accent/10 p-2 rounded-full mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-card-foreground mb-3 font-serif">
                        {sub.title}
                      </h3>
                      <p className="text-muted-foreground text-base leading-relaxed">
                        {sub.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {specialty.conclusion && (
              <ScrollReveal>
                <div className="bg-primary/5 border-l-4 border-accent p-6 sm:p-8 rounded-r-lg shadow-sm">
                  <p className="text-lg text-primary font-medium italic leading-relaxed">
                    "{specialty.conclusion}"
                  </p>
                </div>
              </ScrollReveal>
            )}
          </div>

          <div className="lg:col-span-1">
            <ScrollReveal>
              <div className="bg-primary text-primary-foreground p-8 rounded-xl sticky top-32 shadow-elevation border border-primary-foreground/10">
                <h3 className="text-2xl font-serif font-bold mb-4">
                  Precisa de assessoria nesta área?
                </h3>
                <div className="w-12 h-1 bg-accent mb-6" />
                <p className="text-primary-foreground/80 mb-8 leading-relaxed text-base">
                  Nossa equipe de especialistas está pronta para analisar profundamente o seu caso e
                  propor as melhores e mais seguras estratégias jurídicas voltadas ao seu patrimônio
                  e negócio.
                </p>
                <div className="space-y-4">
                  <Button
                    className="w-full bg-accent text-primary hover:bg-accent/90 h-14 text-base font-bold shadow-md transition-transform hover:-translate-y-0.5"
                    asChild
                  >
                    <Link to="/contato">
                      Agendar Reunião <ChevronRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 h-14 text-base font-medium transition-colors"
                    asChild
                  >
                    <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                      Falar no WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  )
}
