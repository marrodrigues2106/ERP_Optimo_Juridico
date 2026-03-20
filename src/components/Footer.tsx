import { Link } from 'react-router-dom'
import { Scale, MapPin, Phone, Mail, Instagram, Linkedin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground/80 py-16 border-t border-primary-foreground/10">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="pr-4">
            <Link to="/" className="flex items-center gap-3 mb-6 text-primary-foreground">
              <Scale className="w-8 h-8 text-accent" />
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg leading-none tracking-wide">
                  MORAES RODRIGUES
                </span>
                <span className="text-[0.65rem] uppercase tracking-[0.2em] font-medium mt-1 text-primary-foreground/70">
                  Advocacia Especializada
                </span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed mb-8">
              Excelência jurídica e estratégia patrimonial focada na proteção e no crescimento do
              seu legado. Atendimento pessoal e estratégico para demandas complexas.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/5 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/5 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-serif font-bold text-primary-foreground text-xl mb-6">
              Links Rápidos
            </h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link to="/" className="hover:text-accent transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/equipe" className="hover:text-accent transition-colors">
                  Nossa Equipe
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-accent transition-colors">
                  Entre em Contato
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Política de Privacidade
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-primary-foreground text-xl mb-6">
              Especialidades
            </h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link
                  to="/especialidades/direito-tributario"
                  className="hover:text-accent transition-colors"
                >
                  Direito Tributário
                </Link>
              </li>
              <li>
                <Link
                  to="/especialidades/planejamento-patrimonial"
                  className="hover:text-accent transition-colors"
                >
                  Planejamento Patrimonial
                </Link>
              </li>
              <li>
                <Link
                  to="/especialidades/direito-imobiliario"
                  className="hover:text-accent transition-colors"
                >
                  Direito Imobiliário
                </Link>
              </li>
              <li>
                <Link
                  to="/especialidades/contratos-responsabilidade"
                  className="hover:text-accent transition-colors"
                >
                  Contratos e Resp. Civil
                </Link>
              </li>
              <li>
                <Link
                  to="/especialidades/direito-financeiro"
                  className="hover:text-accent transition-colors"
                >
                  Direito Financeiro
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-primary-foreground text-xl mb-6">Contato</h4>
            <ul className="space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Estrada Caetano Monteiro, 790 - Pendotiba
                  <br />
                  Niterói - RJ. CEP 24.320-570
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span>21-2082-6855</span>
                  <span>21-97439-8218</span>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-accent flex-shrink-0" />
                <a
                  href="mailto:contato@moraesrodriguesadvocacia.com.br"
                  className="hover:text-accent transition-colors"
                >
                  contato@moraesrodriguesadvocacia.com.br
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/50">
          <p>
            &copy; {new Date().getFullYear()} Moraes Rodrigues Advocacia Especializada. Todos os
            direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
