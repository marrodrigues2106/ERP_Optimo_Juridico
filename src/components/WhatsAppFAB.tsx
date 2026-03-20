import { MessageCircle } from 'lucide-react'

export function WhatsAppFAB() {
  return (
    <a
      href="https://wa.me/5521974398218"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-elevation hover:scale-110 transition-transform duration-300"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  )
}
