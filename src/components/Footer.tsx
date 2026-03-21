import { Instagram, Facebook, Phone as WhatsappIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { firmData } from '@/data/content'
import { useState } from 'react'
import { toast } from '@/hooks/use-toast'

export default function Footer() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast({
        title: 'Mensagem enviada com sucesso!',
        description: `Sua mensagem foi enviada para ${firmData.contact.email}.`,
      })
      ;(e.target as HTMLFormElement).reset()
    }, 1000)
  }

  return (
    <footer className="bg-[#4B4B4B] text-white pt-20 pb-10 font-sans" id="contato">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24">
          {/* Left Column */}
          <div>
            <h3 className="text-sm font-bold tracking-widest mb-6 uppercase text-gray-200">
              Sobre a Advocacia
            </h3>
            <p className="text-gray-300 mb-8 text-sm leading-relaxed max-w-xs">
              Especialista em direito tributário, planejamento patrimonial e sucessório e direito
              imobiliário.
            </p>
            <div className="flex space-x-6">
              <a
                href={firmData.socials.facebook}
                className="hover:text-secondary transition-colors"
                aria-label="Facebook"
                target="_blank"
                rel="noreferrer"
              >
                <Facebook size={22} />
              </a>
              <a
                href={firmData.socials.instagram}
                className="hover:text-secondary transition-colors"
                aria-label="Instagram"
                target="_blank"
                rel="noreferrer"
              >
                <Instagram size={22} />
              </a>
              <a
                href={firmData.socials.whatsapp}
                className="hover:text-secondary transition-colors"
                aria-label="WhatsApp"
                target="_blank"
                rel="noreferrer"
              >
                <WhatsappIcon size={22} />
              </a>
            </div>
          </div>

          {/* Middle Column */}
          <div>
            <h3 className="text-sm font-bold tracking-widest mb-6 uppercase text-gray-200">
              Contato
            </h3>
            <div className="space-y-6 text-gray-300 text-sm">
              <div>
                <a
                  href={`tel:${firmData.contact.phoneFixed.replace(/\D/g, '')}`}
                  className="block hover:text-secondary transition-colors mb-2"
                >
                  {firmData.contact.phoneFixed}
                </a>
                <span className="block">
                  <a
                    href={`tel:${firmData.contact.phoneMobile1.replace(/\D/g, '')}`}
                    className="hover:text-secondary transition-colors"
                  >
                    {firmData.contact.phoneMobile1}
                  </a>
                </span>
              </div>
              <p>
                <a
                  href={`mailto:${firmData.contact.email}`}
                  className="hover:text-secondary transition-colors"
                >
                  {firmData.contact.email}
                </a>
              </p>
            </div>
          </div>

          {/* Right Column - Form */}
          <div>
            <h3 className="text-sm font-bold tracking-widest mb-6 uppercase text-gray-200">
              Entre em contato
            </h3>
            <form
              onSubmit={handleSubmit}
              className="space-y-5 bg-black/40 p-6 md:p-8 rounded-lg border border-white/10 shadow-xl"
            >
              <div>
                <label className="block text-sm mb-2 text-gray-200">
                  Digite seu melhor e-mail:*
                </label>
                <Input
                  required
                  type="email"
                  placeholder="Seu melhor e-mail para contato"
                  className="bg-white text-black border-none h-11"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-200">Seu Celular:*</label>
                <Input required type="tel" className="bg-white text-black border-none h-11" />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-200">Escreva uma mensagem:</label>
                <Textarea
                  className="bg-white text-black border-none resize-none"
                  rows={4}
                  placeholder="Escreva sua mensagem"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C83B3B] hover:bg-[#A02D2D] text-white h-12 text-base rounded-full mt-2"
              >
                {loading ? 'Enviando...' : 'Enviar consulta jurídica agora'}
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-20 text-center text-sm text-gray-400 border-t border-white/10 pt-8 flex flex-col items-center">
          <div className="w-12 h-1 bg-gray-600 rounded-full mb-6"></div>
          <p className="mb-2">© {new Date().getFullYear()}. All rights reserved.</p>
          <Link to="/login" className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
            Acesso Restrito
          </Link>
        </div>
      </div>
    </footer>
  )
}
