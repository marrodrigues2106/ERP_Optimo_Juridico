import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { firmData, specialtiesData } from '@/data/content'

export default function Index() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://img.usecurling.com/p/1920/1080?q=abstract%20gold%20waves&color=black"
            alt="Fundo Jurídico"
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A233A]/80 via-[#1A233A]/70 to-[#1A233A]/90"></div>
        </div>

        <div className="container relative z-10 text-center text-white max-w-5xl px-4 flex flex-col items-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold mb-8 animate-fade-in-up tracking-tight">
            Advocacia Estratégica
          </h1>
          <p
            className="text-xl md:text-2xl font-light mb-12 leading-relaxed animate-fade-in-up text-gray-200 max-w-3xl"
            style={{ animationDelay: '100ms' }}
          >
            Contencioso Tributário, Consultoria em Finanças Públicas, Planejamento Patrimonial,
            Sucessório e Imobiliário com excelência e compromisso.
          </p>
          <Button
            variant="outline"
            size="lg"
            className="text-white border-white bg-transparent hover:bg-white hover:text-[#1A233A] rounded-full px-8 py-7 text-lg animate-fade-in-up transition-all duration-300"
            style={{ animationDelay: '200ms' }}
            onClick={() =>
              document.getElementById('especialidades')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Conheça Nossas Especialidades
          </Button>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="heading-md">Conheça nosso escritório de advocacia</h2>
              <div className="w-20 h-1 bg-secondary mb-8 rounded-full"></div>
              <p className="body-text mb-6 text-lg">{firmData.aboutText}</p>
              <p className="body-text text-lg">
                Com atuação focada na excelência e resultados, nossa equipe está preparada para
                lidar com os desafios mais complexos, oferecendo soluções personalizadas e
                estratégicas para garantir a segurança jurídica dos negócios e do patrimônio de
                nossos clientes.
              </p>
            </div>
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://img.usecurling.com/p/800/800?q=law%20office%20desk&color=gray"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                alt="Escritório de Advocacia"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Specialties Preview Section */}
      <section id="especialidades" className="py-24 bg-slate-50 border-y border-border">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="heading-md">Nossas Especialidades</h2>
            <div className="w-20 h-1 bg-secondary mb-6 mx-auto rounded-full"></div>
            <p className="body-text">
              Atuação multidisciplinar com foco em resultados estratégicos, aliando profundo
              conhecimento técnico a uma visão prática e negocial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {specialtiesData.map((spec) => (
              <Card
                key={spec.id}
                className="border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white group"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="font-serif text-2xl text-primary group-hover:text-secondary transition-colors">
                    {spec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-8 text-base leading-relaxed h-[72px] line-clamp-3">
                    {spec.shortDescription}
                  </p>
                  <Link
                    to={`/especialidade/${spec.id}`}
                    className="text-secondary font-semibold hover:text-primary transition-colors inline-flex items-center text-sm uppercase tracking-wider"
                  >
                    Saiba mais{' '}
                    <ArrowRight
                      size={16}
                      className="ml-2 group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-0 bg-[#EFECE8]">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          <div className="flex flex-col justify-center px-8 py-16 lg:px-24">
            <h2 className="text-4xl md:text-5xl font-bold font-serif mb-8 text-[#2A2A2A]">
              Localização
            </h2>
            <p className="text-lg text-gray-700 mb-10 leading-relaxed max-w-lg">
              Nosso escritório está situado em Niterói, RJ, oferecendo serviços especializados em
              direito tributário, planejamento patrimonial, sucessório e direito imobiliário desde
              2019.
            </p>

            <div className="space-y-8 max-w-lg">
              <div>
                <h4 className="font-bold text-xl mb-3 text-[#2A2A2A] font-serif">Endereço</h4>
                <p className="text-gray-700 text-lg">{firmData.address}</p>
              </div>
              <div>
                <h4 className="font-bold text-xl mb-3 text-[#2A2A2A] font-serif">Horário</h4>
                <p className="text-gray-700 text-lg hover:text-secondary inline-block border-b border-gray-400 pb-1 cursor-pointer transition-colors">
                  {firmData.schedule}
                </p>
              </div>
            </div>
          </div>

          <div className="relative h-[400px] lg:h-auto w-full">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3674.3982464190847!2d-43.0560877!3d-22.9355444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x998679f225bb15%3A0xc3124cb185c7f8f!2sEstr.%20Caetano%20Monteiro%2C%20790%20-%20Pendotiba%2C%20Niter%C3%B3i%20-%20RJ%2C%2024320-570!5e0!3m2!1sen!2sbr!4v1700000000000!5m2!1sen!2sbr"
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa de Localização"
            ></iframe>
          </div>
        </div>
      </section>
    </div>
  )
}
