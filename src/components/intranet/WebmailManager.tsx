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
    switch (id) {
      case 'INBOX':
        return <Inbox className="w-4 h-4" />
      case 'Sent':
        return <SendIcon className="w-4 h-4" />
      case 'Drafts':
        return <FileEdit className="w-4 h-4" />
      case 'Spam':
        return <AlertOctagon className="w-4 h-4" />
      case 'Trash':
        return <Trash className="w-4 h-4" />
      case 'Archive':
        return <Archive className="w-4 h-4" />
      default:
        return <FolderOpen className="w-4 h-4" />
    }
  }

  const loadFolders = async () => {
    try {
      const res = await pb.send('/backend/v1/email_folders', { method: 'POST' })
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

      const res = await pb.send('/backend/v1/email_inbox', {
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

      let msg = 'Erro ao conectar ao servidor de e-mail.'
      if (err.status === 400 || isAuthError) {
        msg =
          'Falha na autenticação. Verifique se a senha, usuário e portas estão corretos nas configurações de e-mail.'
      } else if (isTimeout) {
        msg = 'Tempo de conexão esgotado. Verifique se os servidores IMAP/SMTP estão acessíveis.'
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
      await pb.send('/backend/v1/email_action', {
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
            if (action === 'trash' && activeFolder !== 'Trash') return !messageIds.includes(msg.id)
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
      await pb.send('/backend/v1/email_send', {
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
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Atualizar
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

        <div className="flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
          {selectedEmail ? (
            <div className="flex flex-col h-full overflow-auto">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center gap-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedEmail(null)
                    if (!selectedEmail.read) handleAction('mark_read', [selectedEmail.id])
                  }}
                >
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
                    onClick={() => handleAction('mark_unread', [selectedEmail.id])}
                    title="Marcar como não lido"
                  >
                    <MailOpen className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-500 hover:bg-red-50 hidden sm:inline-flex"
                    onClick={() => handleAction('trash', [selectedEmail.id])}
                    title="Mover para lixeira"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                    <div className="text-base font-bold text-slate-900">{selectedEmail.from}</div>
                    <div className="text-sm text-slate-500">para {selectedEmail.to || 'mim'}</div>
                  </div>
                  <div className="text-sm text-slate-500 font-medium">
                    {format(new Date(selectedEmail.date), "dd 'de' MMM 'de' yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                </div>
                <div
                  className="prose max-w-none text-slate-800 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-2 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as mensagens</SelectItem>
                      <SelectItem value="unread">Não lidas</SelectItem>
                      <SelectItem value="read">Lidas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-slate-500 font-medium px-2">
                  {folders.find((f) => f.id === activeFolder)?.name}
                </div>
              </div>

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
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 border-b border-slate-100 pb-4"
                      >
                        <Skeleton className="h-6 w-32 md:w-48 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2 hidden md:block" />
                        </div>
                        <Skeleton className="h-4 w-24 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : errorMsg ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-50/30">
                    <AlertTriangle className="w-16 h-16 text-red-400 mb-6" />
                    <p className="text-xl font-medium text-red-700 mb-2">Falha na Sincronização</p>
                    <p className="text-base text-red-600 max-w-md mb-6">{errorMsg}</p>
                    <Button onClick={() => loadEmails(activeFolder, 1, filterStatus, false)}>
                      Tentar Novamente
                    </Button>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50">
                    <Inbox className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">
                      Nenhuma mensagem encontrada.
                    </p>
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
                        <div className="flex-1 min-w-0 truncate flex flex-col md:flex-row md:items-center">
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
                          <span className="text-slate-500 truncate text-sm hidden md:inline">
                            - {email.snippet}
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

                        <div className="hidden group-hover:flex items-center gap-1 absolute right-2 bg-slate-50 pl-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAction(email.read ? 'mark_unread' : 'mark_read', [email.id])
                            }}
                            title={email.read ? 'Marcar como não lido' : 'Marcar como lido'}
                          >
                            {email.read ? (
                              <Mail className="h-4 w-4" />
                            ) : (
                              <MailOpen className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAction('trash', [email.id])
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {hasMore && (
                      <div ref={observerTarget} className="p-6 flex justify-center">
                        {loadingMore ? (
                          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        ) : (
                          <span className="text-slate-400 text-sm">Carregando mais...</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
