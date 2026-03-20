import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

export function WhatsAppFAB() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <a
      href="https://wa.me/5511999999999"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-elevation hover:scale-105 transition-transform duration-300 animate-fade-in-up flex items-center justify-center group"
      aria-label="Fale conosco no WhatsApp"
    >
      <div className="absolute inset-0 rounded-full border-2 border-[#25D366] animate-ping opacity-75"></div>
      <MessageCircle className="w-8 h-8 relative z-10" />
      <span className="absolute right-full mr-4 bg-primary text-primary-foreground text-sm font-medium py-2 px-4 rounded-lg shadow-elevation opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Fale com um advogado
      </span>
    </a>
  )
}
