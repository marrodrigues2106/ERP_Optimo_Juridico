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
  Inbox,
  Send as SendIcon,
  FileEdit,
  AlertOctagon,
  Trash,
  Menu,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function WebmailManager() {
  const { toast } = useToast()
  const [emails, setEmails] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [activeFolder, setActiveFolder] = useState<string>('INBOX')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [settingsMissing, setSettingsMissing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const getFolderIcon = (id: string) => {
    switch (id) {
      case 'INBOX':
        return <Inbox className="w-4 h-4" />
      case 'Sent':
        return <SendIcon className="w-4 h-4" />
      case 'Outbox':
        return <SendIcon className="w-4 h-4" />
      case 'Drafts':
        return <FileEdit className="w-4 h-4" />
      case 'Spam':
        return <AlertOctagon className="w-4 h-4" />
      case 'Trash':
        return <Trash className="w-4 h-4" />
      default:
        return <Mail className="w-4 h-4" />
    }
  }

  const loadData = async (folderId = 'INBOX') => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const user = pb.authStore.record
      if (!user?.imap_host || !user?.email_user || !user?.email_encrypted_password) {
        setSettingsMissing(true)
        setLoading(false)
        return
      }
      setSettingsMissing(false)

      const foldersReq =
        folders.length === 0
          ? pb.send('/backend/v1/email/folders', { method: 'GET' })
          : Promise.resolve(folders)

      const [foldersRes, emailsRes] = await Promise.all([
        foldersReq,
        pb.send(`/backend/v1/email/inbox?folder=${folderId}`, { method: 'GET' }),
      ])

      setFolders(foldersRes)
      setEmails(emailsRes)
      setActiveFolder(folderId)
      setSelectedEmail(null)
    } catch (err: any) {
      const msg =
        err.status === 400
          ? 'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.'
          : err.message || 'Erro ao conectar ao servidor de e-mail.'
      setErrorMsg(msg)
      toast({
        title: 'Erro de sincronização',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
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
      const msg =
        err.status === 400
          ? 'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.'
          : err.message
      toast({ title: 'Erro ao enviar e-mail', description: msg, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in-up h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Mail className="w-8 h-8 hidden md:block" /> Webmail
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="outline"
            onClick={() => loadData(activeFolder)}
            disabled={loading}
            size="sm"
            className="hidden md:flex"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Atualizar
          </Button>
          <Button onClick={() => setComposeOpen(true)} size="sm">
            <Edit className="w-4 h-4 md:mr-2" />{' '}
            <span className="hidden md:inline">Nova Mensagem</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={cn(
            'w-64 shrink-0 flex-col gap-2 md:flex',
            sidebarOpen
              ? 'flex absolute z-10 bg-white shadow-lg border rounded-lg p-4 h-[calc(100vh-200px)] left-0 top-0'
              : 'hidden',
          )}
        >
          <div className="font-semibold text-slate-500 mb-2 px-2 text-sm uppercase tracking-wider">
            Pastas
          </div>
          {folders.map((f) => (
            <Button
              key={f.id}
              variant={activeFolder === f.id ? 'secondary' : 'ghost'}
              className="w-full justify-start font-medium"
              onClick={() => {
                loadData(f.id)
                setSidebarOpen(false)
              }}
            >
              {getFolderIcon(f.id)}
              <span className="ml-3 flex-1 text-left">{f.name}</span>
              {f.unread > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {f.unread}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
          {selectedEmail ? (
            <div className="flex flex-col h-full overflow-auto">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center gap-4 z-10">
                <Button variant="ghost" size="icon" onClick={() => setSelectedEmail(null)}>
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Button>
                <div className="flex-1 truncate">
                  <h2 className="text-xl font-bold truncate text-slate-900">
                    {selectedEmail.subject}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}>
                    <Edit className="w-4 h-4 md:mr-2" />{' '}
                    <span className="hidden md:inline">Responder</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-slate-500 hidden sm:inline-flex"
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-500 hover:bg-red-50 hidden sm:inline-flex"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-base font-bold text-slate-900">{selectedEmail.from}</div>
                    <div className="text-sm text-slate-500">para mim</div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {format(new Date(selectedEmail.date), "dd 'de' MMM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                </div>
                <div
                  className="prose max-w-none text-slate-700 text-base"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {settingsMissing ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50">
                  <Mail className="w-16 h-16 text-slate-300 mb-6 opacity-50" />
                  <p className="text-xl font-medium text-slate-600 mb-2">
                    Configurações de E-mail Ausentes
                  </p>
                  <p className="text-base text-slate-500 max-w-md">
                    Para acessar sua caixa postal e pastas sincronizadas, você precisa configurar
                    suas credenciais na página do seu perfil.
                  </p>
                </div>
              ) : loading && emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">
                    Sincronizando {folders.find((f) => f.id === activeFolder)?.name || 'pasta'}...
                  </p>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-50/30">
                  <AlertTriangle className="w-16 h-16 text-red-400 mb-6" />
                  <p className="text-xl font-medium text-red-700 mb-2">Falha na Sincronização</p>
                  <p className="text-base text-red-600 max-w-md mb-6">{errorMsg}</p>
                  <Button onClick={() => loadData(activeFolder)}>Tentar Novamente</Button>
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50">
                  <Inbox className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">Pasta vazia.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={cn(
                        'flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors group',
                        !email.read && 'bg-blue-50/30',
                      )}
                    >
                      <div
                        className={cn(
                          'w-32 md:w-48 shrink-0 truncate',
                          !email.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700',
                        )}
                      >
                        {email.from.split('<')[0] || email.from.split('@')[0]}
                      </div>
                      <div className="flex-1 min-w-0 truncate">
                        <span
                          className={cn(
                            'mr-2 truncate',
                            !email.read
                              ? 'font-bold text-slate-900'
                              : 'font-semibold text-slate-800',
                          )}
                        >
                          {email.subject}
                        </span>
                        <span className="text-slate-500 truncate hidden sm:inline">
                          - {email.snippet || email.body?.substring(0, 100)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'w-24 shrink-0 text-right text-xs md:text-sm font-medium',
                          !email.read ? 'text-blue-600' : 'text-slate-500',
                        )}
                      >
                        {format(new Date(email.date), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
              <Input
                name="to"
                required
                placeholder="cliente@exemplo.com"
                defaultValue={selectedEmail && activeFolder === 'INBOX' ? selectedEmail.from : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                name="subject"
                required
                defaultValue={
                  selectedEmail && activeFolder === 'INBOX' ? `Re: ${selectedEmail.subject}` : ''
                }
              />
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
