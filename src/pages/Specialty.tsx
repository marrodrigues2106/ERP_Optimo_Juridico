import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { specialtiesData } from '@/data/content'

export default function Specialty() {
  const { id } = useParams()
  const specialty = specialtiesData.find((s) => s.id === id)

  if (!specialty) {
    return <Navigate to="/404" />
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50">
      {/* Specialty Hero */}
      <div className="bg-primary text-white py-20 mb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://img.usecurling.com/p/1920/600?q=law%20books&color=black')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
        <div className="container relative z-10">
          <Link
            to="/"
            className="inline-flex items-center text-secondary hover:text-white transition-colors mb-8 text-sm uppercase tracking-wider font-semibold"
          >
            <ArrowLeft size={16} className="mr-2" /> Voltar para o início
          </Link>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 text-white">
            {specialty.title}
          </h1>
          <p className="text-xl md:text-2xl max-w-4xl text-gray-300 font-light leading-relaxed">
            {specialty.intro}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6 md:gap-8">
            {specialty.subSections.map((sub, idx) => (
              <div
                key={idx}
                className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-border flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow"
              >
                <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="text-secondary" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-semibold text-primary mb-4">
                    {sub.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{sub.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center bg-white p-12 rounded-2xl shadow-sm border border-border">
            <h4 className="text-3xl font-serif font-bold text-primary mb-6">
              Precisa de assessoria nesta área?
            </h4>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Nossa equipe de especialistas está pronta para analisar seu caso e propor as melhores
              estratégias jurídicas.
            </p>
            <Button
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-white rounded-full px-10 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <a href="#contato">Fale com um Especialista Agora</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
