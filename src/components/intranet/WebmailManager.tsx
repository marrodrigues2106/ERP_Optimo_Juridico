import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mail, Edit, Send, Inbox, Loader2, ChevronsUpDown, Check, X, History } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'

export default function WebmailManager() {
  const { toast } = useToast()
  const [composeOpen, setComposeOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)
  const [logs, setLogs] = useState<any[]>([])

  const fetchLogs = async () => {
    try {
      const result = await pb.collection('email_logs').getList(1, 50, {
        sort: '-sent_at',
        expand: 'user',
      })
      setLogs(result.items)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    pb.collection('clients')
      .getFullList({ filter: 'deleted_at=""', sort: 'name' })
      .then(setClients)
      .catch(console.error)

    fetchLogs()
  }, [])

  useRealtime('email_logs', () => {
    fetchLogs()
  })

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const toEmails = selectedClientIds
      .map((id) => clients.find((c) => c.id === id)?.email)
      .filter(Boolean)

    if (toEmails.length === 0) {
      return toast({
        title: 'Selecione pelo menos um cliente com e-mail válido',
        variant: 'destructive',
      })
    }

    setSending(true)
    const fd = new FormData(e.currentTarget)
    try {
      await pb.send('/backend/v1/email/send', {
        method: 'POST',
        body: JSON.stringify({
          to: toEmails,
          subject: fd.get('subject'),
          body: fd.get('body'),
        }),
      })
      toast({ title: 'E-mail enviado com sucesso!' })
      setComposeOpen(false)
      setSelectedClientIds([])
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar e-mail',
        description: getErrorMessage(err),
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
          <Mail className="w-8 h-8 hidden md:block" /> Caixa Postal
        </h1>
        <Button onClick={() => setComposeOpen(true)} size="sm">
          <Edit className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Nova Mensagem</span>
        </Button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden relative flex-col lg:flex-row">
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-800">Histórico de Envios</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-4">
                <Inbox className="w-16 h-16 opacity-20" />
                <p>Nenhum e-mail enviado recentemente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 sm:gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {log.subject || 'Sem Assunto'}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        Para: {log.to || 'Desconhecido'}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <p className="text-sm text-slate-600 font-medium">
                        {new Date(log.sent_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Por: {log.expand?.user?.name || log.expand?.user?.email || 'Sistema'}
                      </p>
                    </div>
                  </div>
                ))}
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
              <Label>Para (Clientes)</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between font-normal"
                  >
                    {selectedClientIds.length > 0
                      ? `${selectedClientIds.length} cliente(s) selecionado(s)`
                      : 'Buscar e adicionar clientes...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente por nome..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => {
                          const isSelected = selectedClientIds.includes(c.id)
                          return (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setSelectedClientIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                                )
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{c.name}</span>
                                {c.email ? (
                                  <span className="text-xs text-slate-500">{c.email}</span>
                                ) : (
                                  <span className="text-xs text-rose-500">
                                    Sem e-mail cadastrado
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedClientIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-md border border-slate-100 max-h-[120px] overflow-y-auto custom-scrollbar">
                  {selectedClientIds.map((id) => {
                    const c = clients.find((x) => x.id === id)
                    if (!c) return null
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="flex items-center gap-1 font-normal bg-white"
                      >
                        {c.name} {c.email ? '' : '(Sem e-mail)'}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedClientIds((prev) => prev.filter((x) => x !== id))
                          }
                          className="ml-1 text-slate-400 hover:text-slate-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
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
