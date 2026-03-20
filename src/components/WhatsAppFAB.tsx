import { MessageCircle } from 'lucide-react'
import { firmData } from '@/data/content'

export default function WhatsAppFAB() {
  return (
    <a
      href={firmData.socials.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#1ebe57] hover:scale-110 transition-all duration-300 animate-fade-in-up flex items-center justify-center"
      aria-label="Fale conosco no WhatsApp"
    >
      <MessageCircle size={32} />
    </a>
  )
}
