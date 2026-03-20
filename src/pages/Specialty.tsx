import { useParams, Navigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
            className="mb-8 -ml-4 text-muted-foreground hover:text-primary"
            asChild
          >
            <Link to="/#especialidades">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Especialidades
            </Link>
          </Button>

          <ScrollReveal>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-16 h-16 rounded-xl bg-primary/5 flex items-center justify-center text-accent shrink-0">
                <Icon className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary">
                {specialty.title}
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
              {specialty.description}
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div className="container px-4 py-16 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-16">
            <ScrollReveal>
              <h2 className="text-3xl font-serif font-bold mb-8 text-primary">
                Serviços Oferecidos
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {specialty.services.map((service, idx) => (
                  <div
                    key={idx}
                    className="flex items-start bg-card p-6 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CheckCircle2 className="w-6 h-6 text-accent mr-4 flex-shrink-0 mt-0.5" />
                    <span className="text-base font-medium text-card-foreground">{service}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <h2 className="text-3xl font-serif font-bold mb-8 text-primary">
                Perguntas Frequentes
              </h2>
              <Accordion
                type="single"
                collapsible
                className="w-full bg-card rounded-lg border border-border px-6"
              >
                {specialty.faqs.map((faq, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`item-${idx}`}
                    className="border-b-border last:border-0 py-2"
                  >
                    <AccordionTrigger className="text-left text-lg font-medium hover:text-accent hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-1">
            <ScrollReveal>
              <div className="bg-primary text-primary-foreground p-8 rounded-xl sticky top-32 shadow-elevation">
                <h3 className="text-2xl font-serif font-bold mb-4">
                  Precisa de assessoria nesta área?
                </h3>
                <div className="w-12 h-1 bg-accent mb-6" />
                <p className="text-primary-foreground/80 mb-8 leading-relaxed">
                  Nossa equipe de especialistas está pronta para analisar profundamente o seu caso e
                  propor as melhores e mais seguras estratégias jurídicas.
                </p>
                <div className="space-y-4">
                  <Button
                    className="w-full bg-accent text-primary hover:bg-accent/90 h-14 text-base font-semibold"
                    asChild
                  >
                    <Link to="/contato">
                      Agendar Reunião <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 h-14 text-base"
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
