import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { specialtiesData } from '@/data/content'
import { ScrollReveal } from '@/components/ScrollReveal'

export default function Index() {
  return (
    <div className="flex flex-col flex-grow">
      {/* Hero Section */}
      <section className="relative h-[95vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <img
            src="https://img.usecurling.com/p/1920/1080?q=law%20office&color=black&dpr=2"
            alt="Interior de Escritório de Advocacia"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
        </div>

        <div className="container relative z-10 px-4 mt-20 text-center">
          <ScrollReveal animation="animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-[1.15]">
              Excelência Jurídica e <br className="hidden md:block" />
              <span className="text-accent">Estratégia Patrimonial</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal animation="animate-fade-in-up">
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-light">
              Atuação artesanal e de alta performance nas áreas mais complexas do Direito,
              assegurando a proteção e o crescimento contínuo do seu legado.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base h-14 px-8 bg-accent text-primary hover:bg-accent/90"
                asChild
              >
                <Link to="/contato">Agende uma Consulta</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base h-14 px-8 border-white/30 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <a href="#especialidades">Conheça nossas Especialidades</a>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Specialties Section */}
      <section id="especialidades" className="py-24 bg-background">
        <div className="container px-4">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-primary">
                Nossas Especialidades
              </h2>
              <div className="w-16 h-1 bg-accent mx-auto mb-6" />
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Foco estrito em áreas estratégicas corporativas para oferecer soluções jurídicas
                profundas, seguras e com resultados concretos.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialtiesData.map((spec, idx) => {
              const Icon = spec.icon
              return (
                <ScrollReveal
                  key={spec.id}
                  animation="animate-fade-in-up"
                  className={
                    idx === 3 ? 'lg:col-span-1 lg:col-start-1' : idx === 4 ? 'lg:col-span-2' : ''
                  }
                >
                  <Link to={`/especialidades/${spec.id}`} className="block h-full group">
                    <Card className="h-full border-border/50 hover:border-accent/50 transition-all duration-500 hover:shadow-elevation bg-card/50 backdrop-blur-sm relative overflow-hidden flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader>
                        <div className="w-14 h-14 rounded-xl bg-primary/5 flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform duration-500 group-hover:bg-accent/10">
                          <Icon className="w-7 h-7" />
                        </div>
                        <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors">
                          {spec.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow flex flex-col">
                        <CardDescription className="text-base mb-6 leading-relaxed">
                          {spec.shortDesc}
                        </CardDescription>
                        <div className="flex items-center text-sm font-bold text-primary group-hover:text-accent transition-colors mt-auto uppercase tracking-wide">
                          Saiba mais{' '}
                          <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* The Firm Section */}
      <section className="py-24 bg-muted/50 border-y border-border/50">
        <div className="container px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 w-full relative">
              <ScrollReveal animation="animate-fade-in">
                <div className="relative aspect-[4/5] w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-elevation">
                  <img
                    src="https://img.usecurling.com/p/800/1000?q=modern%20office%20interior&color=gray&dpr=2"
                    alt="Interior do Escritório"
                    className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-1000"
                  />
                  <div className="absolute inset-0 border-[6px] border-background/20 rounded-lg m-6 pointer-events-none" />
                </div>
              </ScrollReveal>
            </div>

            <div className="lg:w-1/2 w-full">
              <ScrollReveal>
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-primary">
                  Conheça nosso escritório de advocacia
                </h2>
                <div className="w-16 h-1 bg-accent mb-8" />
                <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                  Fundado em 2019, oferecemos serviços especializados em direito tributário,
                  planejamento patrimonial e sucessório, e direito imobiliário, tanto no contencioso
                  judicial quanto extrajudicial.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  {[
                    'Atendimento Personalizado',
                    'Excelência Técnica',
                    'Foco em Resultados',
                    'Sigilo Absoluto',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center text-foreground font-medium">
                      <CheckCircle2 className="w-5 h-5 text-accent mr-3 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  className="text-base px-8 h-14 bg-primary text-primary-foreground hover:bg-primary/90"
                  asChild
                >
                  <Link to="/equipe">Conheça Nossa Equipe</Link>
                </Button>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://img.usecurling.com/p/1920/600?q=skyscrapers&color=black&dpr=2"
            alt="Cityscape"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-primary/95" />
        </div>

        <div className="container relative z-10 px-4 text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">
              Proteja seu Legado e <br className="hidden md:block" /> Otimize seus Resultados
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10 font-light">
              Entre em contato conosco para uma avaliação estratégica profunda do seu cenário
              jurídico, fiscal e patrimonial.
            </p>
            <Button
              size="lg"
              className="bg-accent text-primary hover:bg-accent/90 text-lg h-14 px-10 font-semibold"
              asChild
            >
              <Link to="/contato">Falar com um Especialista</Link>
            </Button>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 text-white/90">
              <a
                href="tel:2120826855"
                className="flex items-center gap-2 hover:text-accent transition-colors"
              >
                <Phone className="w-5 h-5 text-accent" />
                <span>21-2082-6855</span>
              </a>
              <a
                href="https://wa.me/5521974398218"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-accent transition-colors"
              >
                <Phone className="w-5 h-5 text-accent" />
                <span>21-97439-8218</span>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
