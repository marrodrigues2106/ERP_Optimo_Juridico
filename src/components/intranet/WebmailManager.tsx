import { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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
  MailOpen,
  FolderOpen,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function WebmailManager() {
  const { toast } = useToast()
  const [emails, setEmails] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [activeFolder, setActiveFolder] = useState<string>('INBOX')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [settingsMissing, setSettingsMissing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const observerTarget = useRef<HTMLDivElement>(null)

  const getFolderIcon = (id: string) => {
    const upperId = id.toUpperCase()
    if (upperId === 'INBOX') return <Inbox className="w-4 h-4" />
    if (upperId.includes('SENT')) return <SendIcon className="w-4 h-4" />
    if (upperId.includes('DRAFT')) return <FileEdit className="w-4 h-4" />
    if (upperId.includes('SPAM') || upperId.includes('JUNK'))
      return <AlertOctagon className="w-4 h-4" />
    if (upperId.includes('TRASH') || upperId.includes('BIN')) return <Trash className="w-4 h-4" />
    if (upperId.includes('ARCHIVE')) return <Archive className="w-4 h-4" />
    return <FolderOpen className="w-4 h-4" />
  }

  const loadFolders = async () => {
    try {
      const res = await pb.send('/backend/v2/email/folders', { method: 'POST' })
      setFolders(res)
    } catch (err) {
      console.error(err)
    }
  }

  const loadEmails = async (folderId: string, pageNum: number, status: string, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setErrorMsg(null)

    try {
      const user = pb.authStore.record
      if (!user?.imap_host || !user?.email_user || !user?.email_encrypted_password) {
        setSettingsMissing(true)
        setLoading(false)
        setLoadingMore(false)
        return
      }
      setSettingsMissing(false)

      if (folders.length === 0) {
        await loadFolders()
      }

      const res = await pb.send('/backend/v2/email/inbox', {
        method: 'POST',
        body: JSON.stringify({ folder: folderId, page: pageNum, limit: 20, status }),
      })

      if (append) {
        setEmails((prev) => [...prev, ...res.items])
      } else {
        setEmails(res.items)
      }

      setHasMore(res.page < res.totalPages)
      setPage(res.page)
      setActiveFolder(folderId)
    } catch (err: any) {
      const isAuthError =
        err.message?.toLowerCase().includes('auth') ||
        err.message?.toLowerCase().includes('login') ||
        err.status === 401
      const isTimeout = err.message?.toLowerCase().includes('timeout') || err.status === 504
      const isNotFound = err.status === 404

      let msg = 'Erro ao conectar ao servidor de e-mail.'
      if (err.status === 400 || isAuthError) {
        msg =
          'Falha na conexão IMAP. Verifique se a senha, usuário e portas estão corretos nas configurações de e-mail.'
      } else if (isTimeout) {
        msg = 'Tempo de conexão esgotado. Verifique se os servidores IMAP/SMTP estão acessíveis.'
      } else if (isNotFound) {
        msg = 'Serviço de e-mail não encontrado ou não configurado (Erro 404).'
      } else if (err.message) {
        msg = err.message
      }

      setErrorMsg(msg)
      if (!append) {
        toast({ title: 'Erro de sincronização', description: msg, variant: 'destructive' })
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadEmails(activeFolder, 1, filterStatus, false)
  }, [activeFolder, filterStatus])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadEmails(activeFolder, page + 1, filterStatus, true)
        }
      },
      { threshold: 1.0 },
    )
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, activeFolder, page, filterStatus])

  const handleAction = async (action: string, messageIds: string[]) => {
    try {
      await pb.send('/backend/v1/email/action', {
        method: 'POST',
        body: JSON.stringify({ action, messageIds }),
      })

      setEmails((prev) =>
        prev
          .map((msg) => {
            if (messageIds.includes(msg.id)) {
              if (action === 'mark_read') return { ...msg, read: true }
              if (action === 'mark_unread') return { ...msg, read: false }
            }
            return msg
          })
          .filter((msg) => {
            if (action === 'trash' && !activeFolder.toUpperCase().includes('TRASH'))
              return !messageIds.includes(msg.id)
            return true
          }),
      )

      if (action === 'trash' && selectedEmail && messageIds.includes(selectedEmail.id)) {
        setSelectedEmail(null)
      }

      if (action === 'mark_read' || action === 'mark_unread' || action === 'trash') {
        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === activeFolder) {
              const diff =
                action === 'mark_read'
                  ? -messageIds.length
                  : action === 'mark_unread'
                    ? messageIds.length
                    : action === 'trash' && !selectedEmail?.read
                      ? -1
                      : 0
              return { ...f, unread: Math.max(0, f.unread + diff) }
            }
            return f
          }),
        )
      }
    } catch (err) {
      toast({ title: 'Erro ao executar ação.', variant: 'destructive' })
    }
  }

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
      const msg = err.response?.data ? Object.values(err.response.data)[0]?.message : err.message
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
            onClick={() => loadEmails(activeFolder, 1, filterStatus, false)}
            disabled={loading}
            size="sm"
            className="hidden md:flex"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Sincronizar
          </Button>
          <Button onClick={() => setComposeOpen(true)} size="sm">
            <Edit className="w-4 h-4 md:mr-2" />{' '}
            <span className="hidden md:inline">Nova Mensagem</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden relative">
        <div
          className={cn(
            'w-64 shrink-0 flex-col gap-2 md:flex overflow-y-auto',
            sidebarOpen
              ? 'flex absolute z-10 bg-white shadow-lg border rounded-lg p-4 h-[calc(100vh-200px)] left-0 top-0'
              : 'hidden',
          )}
        >
          <div className="font-semibold text-slate-500 mb-2 px-2 text-sm uppercase tracking-wider">
            Pastas
          </div>
          {folders.length === 0 && loading ? (
            <div className="space-y-2 px-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            folders.map((f) => (
              <Button
                key={f.id}
                variant={activeFolder === f.id ? 'secondary' : 'ghost'}
                className="w-full justify-start font-medium"
                onClick={() => {
                  setActiveFolder(f.id)
                  setSidebarOpen(false)
                }}
              >
                {getFolderIcon(f.id)}
                <span className="ml-3 flex-1 text-left truncate">{f.name}</span>
                {f.unread > 0 && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    {f.unread}
                  </span>
                )}
              </Button>
            ))
          )}
        </div>

        <div className="flex-1 flex min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Email List Pane */}
          <div
            className={cn(
              'w-full md:w-1/2 lg:w-2/5 flex flex-col border-r border-slate-200 h-full',
              selectedEmail ? 'hidden md:flex' : 'flex',
            )}
          >
            <div className="p-3 border-b flex justify-between items-center bg-slate-50/80 shrink-0">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] h-9 text-sm bg-white font-medium">
                  <SelectValue placeholder="Caixa de Entrada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Caixa de Entrada</SelectItem>
                  <SelectItem value="unread">Não Lidas</SelectItem>
                  <SelectItem value="archived">Arquivadas</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500 font-medium px-2 truncate max-w-[120px]">
                {folders.find((f) => f.id === activeFolder)?.name}
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/30">
              {settingsMissing ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <img
                    src="https://img.usecurling.com/i?q=mail&shape=outline&color=blue"
                    alt="Mail"
                    className="w-16 h-16 opacity-60 mb-4"
                  />
                  <p className="text-sm font-medium text-slate-600 mb-4">
                    Configurações Ausentes. Vá em Integrações para configurar.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => (window.location.href = '/intranet/integrations')}
                  >
                    Ir para Integrações
                  </Button>
                </div>
              ) : loading && emails.length === 0 ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadEmails(activeFolder, 1, filterStatus, false)}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Inbox className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">Nenhuma mensagem.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email)
                        if (!email.read) handleAction('mark_read', [email.id])
                      }}
                      className={cn(
                        'flex flex-col p-4 cursor-pointer transition-colors hover:bg-blue-50/50',
                        selectedEmail?.id === email.id
                          ? 'bg-blue-50 border-l-4 border-l-primary'
                          : 'border-l-4 border-l-transparent',
                        !email.read && selectedEmail?.id !== email.id ? 'bg-white' : '',
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div
                          className={cn(
                            'text-sm truncate pr-2',
                            !email.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700',
                          )}
                        >
                          {typeof email.from === 'string'
                            ? email.from.split('<')[0] || email.from.split('@')[0]
                            : email.from?.name || email.from?.address || 'Desconhecido'}
                        </div>
                        <div
                          className={cn(
                            'text-xs shrink-0',
                            !email.read ? 'text-primary font-bold' : 'text-slate-500',
                          )}
                        >
                          {email.date ? format(new Date(email.date), 'dd/MM/yy') : ''}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'text-sm truncate mb-1',
                          !email.read ? 'font-bold text-slate-800' : 'font-medium text-slate-800',
                        )}
                      >
                        {email.subject || '(Sem assunto)'}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {email.snippet || ''}
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <div ref={observerTarget} className="p-4 flex justify-center">
                      {loadingMore ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      ) : (
                        <span className="text-slate-400 text-xs">Carregando mais...</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reading Pane */}
          <div
            className={cn(
              'flex-1 h-full flex flex-col bg-white min-w-0',
              !selectedEmail ? 'hidden md:flex' : 'flex',
            )}
          >
            {selectedEmail ? (
              <>
                <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-white z-10 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedEmail(null)}
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                  </Button>
                  <div className="flex-1 truncate">
                    <h2 className="text-xl font-bold truncate text-slate-900 pr-4">
                      {selectedEmail.subject}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setComposeOpen(true)}
                      title="Responder"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAction('mark_unread', [selectedEmail.id])}
                      title="Marcar como não lido"
                    >
                      <MailOpen className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleAction('trash', [selectedEmail.id])}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-6 md:p-8 bg-white">
                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg shrink-0">
                        {typeof selectedEmail.from === 'string'
                          ? selectedEmail.from.charAt(0).toUpperCase()
                          : (selectedEmail.from?.name?.charAt(0) || 'D').toUpperCase()}
                      </div>
                      <div>
                        <div className="text-base font-bold text-slate-900">
                          {typeof selectedEmail.from === 'string'
                            ? selectedEmail.from
                            : `${selectedEmail.from?.name || ''} <${selectedEmail.from?.address || ''}>`}
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          Para:{' '}
                          {typeof selectedEmail.to === 'string'
                            ? selectedEmail.to
                            : selectedEmail.to?.name || selectedEmail.to?.address || 'mim'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 font-medium whitespace-nowrap ml-4">
                      {selectedEmail.date
                        ? format(new Date(selectedEmail.date), 'dd MMM yyyy, HH:mm', {
                            locale: ptBR,
                          })
                        : ''}
                    </div>
                  </div>
                  <div
                    className="prose max-w-none text-slate-800 text-base leading-relaxed break-words"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
                <img
                  src="https://img.usecurling.com/i?q=inbox&shape=lineal-color&color=blue"
                  alt="Inbox Empty State"
                  className="w-32 h-32 opacity-70 mb-6"
                />
                <h3 className="text-xl font-bold text-slate-700 mb-2">
                  Nenhuma mensagem selecionada
                </h3>
                <p className="text-slate-500 max-w-sm">
                  Selecione uma mensagem na lista à esquerda para ler o conteúdo completo, ou crie
                  uma nova mensagem.
                </p>
                <Button className="mt-6" onClick={() => setComposeOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Escrever Mensagem
                </Button>
              </div>
            )}
          </div>
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
                defaultValue={
                  selectedEmail && activeFolder === 'INBOX'
                    ? typeof selectedEmail.from === 'string'
                      ? selectedEmail.from
                      : selectedEmail.from?.address || ''
                    : ''
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                name="subject"
                required
                defaultValue={
                  selectedEmail && activeFolder === 'INBOX'
                    ? `Re: ${selectedEmail.subject || ''}`
                    : ''
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
