import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mail, Edit, Send, Inbox, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function WebmailManager() {
  const { toast } = useToast()
  const [composeOpen, setComposeOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    const fd = new FormData(e.currentTarget)
    try {
      await pb.send('/backend/v2/email/send', {
        method: 'POST',
        body: JSON.stringify({
          to: fd.get('to'),
          subject: fd.get('subject'),
          body: fd.get('body'),
        }),
      })
      toast({ title: 'E-mail enviado com sucesso!' })
      setComposeOpen(false)
    } catch (err: any) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data)[0]?.message
        : err.message
      toast({
        title: 'Erro ao enviar e-mail',
        description: errorMsg || err.message,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in-up h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Mail className="w-8 h-8 hidden md:block" /> Caixa de Entrada
        </h1>
        <Button onClick={() => setComposeOpen(true)} size="sm">
          <Edit className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Nova Mensagem</span>
        </Button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden relative">
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Inbox className="w-20 h-20 text-slate-300 mb-6" />
          <h3 className="text-2xl font-bold text-slate-700 mb-2">Caixa de Entrada Desativada</h3>
          <p className="text-slate-500 max-w-md text-lg">
            O sistema foi atualizado para utilizar a API do Resend, que foca exclusivamente no envio
            confiável de e-mails transacionais. O recebimento de e-mails via IMAP não está mais
            disponível.
          </p>
          <Button className="mt-8" size="lg" onClick={() => setComposeOpen(true)}>
            <Edit className="w-5 h-5 mr-2" /> Enviar Nova Mensagem
          </Button>
        </div>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Mensagem</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Para</Label>
              <Input name="to" required placeholder="cliente@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input name="subject" required />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <textarea
                name="body"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[200px]"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Enviar
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
