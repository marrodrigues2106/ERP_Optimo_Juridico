import { useState, useRef, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, User, Send, Loader2, Sparkles } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Message = { id: string; role: 'user' | 'ai'; content: string }

export function IAChatSidebar() {
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content:
        'Olá! Sou seu assistente IA. Como posso ajudar você hoje com seus processos, agenda ou clientes?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ai-chat-state', { detail: isOpen }))
  }, [isOpen])

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    window.addEventListener('toggle-ai-chat', handleToggle)
    return () => window.removeEventListener('toggle-ai-chat', handleToggle)
  }, [])

  if (!isAuthenticated) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
      let reply = 'Desculpe, não entendi. Pode reformular?'
      const lower = userMsg.toLowerCase()
      const orgId = pb.authStore.record?.active_organization

      if (lower.includes('processo') || lower.includes('caso')) {
        const cases = await pb.collection('legal_cases').getList(1, 3, {
          sort: '-created',
          filter: orgId ? `organization = "${orgId}"` : '',
        })
        reply =
          `Encontrei ${cases.totalItems} processos recentes. Aqui estão os últimos:\n\n` +
          cases.items
            .map(
              (c) =>
                `• ${c.case_number || 'Sem número'} - ${c.parties} (${c.status || c.lifecycle_status})`,
            )
            .join('\n')
      } else if (
        lower.includes('agenda') ||
        lower.includes('evento') ||
        lower.includes('reunião') ||
        lower.includes('prazo')
      ) {
        const events = await pb.collection('agenda_events').getList(1, 3, {
          sort: 'start_date',
          filter: `start_date >= "${new Date().toISOString()}"${orgId ? ` && organization = "${orgId}"` : ''}`,
        })
        if (events.totalItems === 0) {
          reply = 'Você não tem eventos futuros na sua agenda.'
        } else {
          reply =
            `Você tem ${events.totalItems} eventos próximos. Os próximos são:\n\n` +
            events.items
              .map(
                (e) =>
                  `• ${e.title} em ${format(new Date(e.start_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
              )
              .join('\n')
        }
      } else if (lower.includes('cliente') || lower.includes('crm')) {
        const clients = await pb.collection('clients').getList(1, 3, {
          sort: '-created',
          filter: orgId ? `organization = "${orgId}"` : '',
        })
        reply =
          `Você tem ${clients.totalItems} clientes cadastrados. Os mais recentes são:\n\n` +
          clients.items
            .map((c) => `• ${c.name || c.fullName} (${c.classification || 'Ativo'})`)
            .join('\n')
      } else {
        reply =
          "Sou seu assistente IA integrado ao sistema. Posso ajudar a consultar seus processos, agenda, ou informações de clientes. Experimente perguntar: 'Quais são meus próximos eventos?' ou 'Mostre meus processos recentes'."
      }

      // Simulate processing time for realistic feel
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'ai', content: reply }])
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          content: 'Ocorreu um erro ao consultar os dados. Tente novamente.',
        },
      ])
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-white z-50 flex items-center justify-center transition-transform hover:scale-105 border-2 border-white/20"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[450px] p-0 flex flex-col border-l shadow-2xl z-[100]">
        <SheetHeader className="p-4 border-b bg-slate-50 flex flex-row items-center gap-3 space-y-0">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <SheetTitle className="text-left text-base">Assistente IA</SheetTitle>
            <p className="text-xs text-slate-500">Moraes Rodrigues Advocacia</p>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4 bg-slate-50/50" ref={scrollRef}>
          <div className="space-y-4 pb-4 flex flex-col">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex max-w-[85%] ${
                  msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start flex-row'
                } gap-2`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-primary text-white'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none shadow-md'
                      : 'bg-white border border-slate-200 shadow-sm text-slate-700 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex self-start gap-2 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-700 rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-slate-500">Pensando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t">
          <form
            onSubmit={handleSend}
            className="flex gap-2 items-center bg-slate-50 border rounded-full p-1 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre seus processos..."
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-10 shadow-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="h-8 w-8 rounded-full shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
