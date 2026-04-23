import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Mail,
  Edit,
  RefreshCw,
  Send,
  ArrowLeft,
  Archive,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function WebmailManager() {
  const { toast } = useToast()
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [settingsMissing, setSettingsMissing] = useState(false)

  const loadEmails = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const user = pb.authStore.record
      if (!user?.imap_host || !user?.email_user) {
        setSettingsMissing(true)
        setLoading(false)
        return
      }
      setSettingsMissing(false)
      const res = await pb.send('/backend/v1/email/inbox', { method: 'GET' })
      setEmails(res)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor de e-mail.')
      toast({
        title: 'Erro ao carregar e-mails.',
        description: err.message || 'Verifique suas configurações no perfil.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmails()
  }, [])

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    const fd = new FormData(e.currentTarget)
    try {
      await pb.send('/backend/v1/email/send', {
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
      toast({ title: 'Erro ao enviar e-mail', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  if (selectedEmail) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in-up">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedEmail(null)}>
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {selectedEmail.subject}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}>
              <Edit className="w-4 h-4 mr-2" /> Responder
            </Button>
            <Button variant="outline" size="icon" className="text-slate-500">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-red-500 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-md">
          <CardHeader className="bg-slate-50/50 rounded-t-xl border-b border-slate-100 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-bold text-slate-900">{selectedEmail.from}</div>
                <div className="text-sm text-slate-500">para mim</div>
              </div>
              <div className="text-sm text-slate-500">
                {format(new Date(selectedEmail.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 min-h-[300px] overflow-auto">
            {/* Sanitize HTML in production, using dangerouslySetInnerHTML here since it's an email client */}
            <div
              className="prose max-w-none text-slate-700 text-base"
              dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
            />
          </CardContent>
        </Card>

        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Mensagem</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSend} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Para</Label>
                <Input name="to" required defaultValue={selectedEmail.from} />
              </div>
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input name="subject" required defaultValue={`Re: ${selectedEmail.subject}`} />
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Mail className="w-8 h-8" /> Caixa Postal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sua caixa de entrada sincronizada com o servidor externo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadEmails} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Atualizar
          </Button>
          <Button onClick={() => setComposeOpen(true)}>
            <Edit className="w-4 h-4 mr-2" /> Nova Mensagem
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        {settingsMissing ? (
          <div className="text-center py-16 bg-slate-50/50">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-slate-600">Configurações de E-mail Ausentes</p>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Para acessar sua caixa postal, você precisa configurar suas credenciais (IMAP/SMTP,
              Usuário e Senha) na página do seu perfil.
            </p>
          </div>
        ) : loading && emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Conectando ao servidor de e-mail...</p>
            <p className="text-sm">Buscando mensagens recentes.</p>
          </div>
        ) : errorMsg ? (
          <div className="text-center py-16 bg-red-50/50">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-red-700">Falha na Sincronização</p>
            <p className="text-sm text-red-600 mt-2 max-w-md mx-auto">{errorMsg}</p>
            <Button variant="outline" className="mt-4" onClick={loadEmails}>
              Tentar Novamente
            </Button>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-600">Caixa de entrada vazia.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="w-48 shrink-0 truncate font-semibold text-slate-900">
                  {email.from.split('<')[0] || email.from.split('@')[0]}
                </div>
                <div className="flex-1 truncate">
                  <span className="font-semibold text-slate-800 mr-2">{email.subject}</span>
                  <span className="text-slate-500 truncate">
                    - {email.snippet || email.body?.substring(0, 100)}
                  </span>
                </div>
                <div className="w-32 shrink-0 text-right text-sm text-slate-500 font-medium">
                  {format(new Date(email.date), 'dd/MM/yyyy')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
