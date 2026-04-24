import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, AlertTriangle, Check, ChevronsUpDown, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface EmailSenderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: any
  context: {
    client_name?: string
    case_number?: string
    org_name?: string
    data_alerta?: string
    [key: string]: any
  }
}

export function EmailSenderModal({ open, onOpenChange, client, context }: EmailSenderModalProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [dailyCount, setDailyCount] = useState(0)
  const [monthlyCount, setMonthlyCount] = useState(0)

  const [clientsList, setClientsList] = useState<any[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      if (client && client.id) {
        setSelectedClientIds([client.id])
      } else {
        setSelectedClientIds([])
      }
      setSelectedTemplate(null)

      if (context.case_number) {
        setSubject(`Atualização: Processo ${context.case_number} - ${context.client_name || ''}`)
      } else {
        setSubject('')
      }

      setHtml('')

      pb.collection('communication_templates')
        .getFullList({ filter: "type = 'Email'", sort: '-created' })
        .then((tpls) => {
          setTemplates(tpls)

          if (context.type) {
            let targetName = ''
            if (
              ['Movimentação', 'PJe', 'DOU', 'Processo Novo', 'Atualização Processual'].includes(
                context.type,
              )
            )
              targetName = 'Atualização Processual'
            else if (context.type === 'Financeiro') targetName = 'Cobrança / Financeiro'
            else if (context.type === 'Aniversário') targetName = 'Aniversário'

            if (targetName) {
              const match = tpls.find((t) =>
                t.name.toLowerCase().includes(targetName.toLowerCase()),
              )
              if (match) {
                handleTemplateChange(match.id, tpls)
              }
            }
          }
        })
        .catch(console.error)

      pb.collection('clients')
        .getFullList({ filter: 'deleted_at=""', sort: 'name' })
        .then(setClientsList)
        .catch(console.error)

      const fetchQuotas = async () => {
        try {
          const today = new Date()
          const todayStr = today.toISOString().split('T')[0]
          const startOfMonthStr = todayStr.substring(0, 8) + '01'
          const orgId = pb.authStore.record?.active_organization

          if (!orgId) return

          const dailyRes = await pb.collection('email_logs').getList(1, 1, {
            filter: `organization = "${orgId}" && sent_at >= "${todayStr} 00:00:00"`,
            $autoCancel: false,
          })
          const monthlyRes = await pb.collection('email_logs').getList(1, 1, {
            filter: `organization = "${orgId}" && sent_at >= "${startOfMonthStr} 00:00:00"`,
            $autoCancel: false,
          })

          setDailyCount(dailyRes.totalItems)
          setMonthlyCount(monthlyRes.totalItems)
        } catch (e) {
          console.error(e)
        }
      }
      fetchQuotas()
    }
  }, [open, client])

  const selectedEmailsCount = selectedClientIds.length
  const isLimitReached =
    dailyCount + selectedEmailsCount > 100 || monthlyCount + selectedEmailsCount > 3000

  const handleTemplateChange = (id: string, tpls = templates) => {
    const tpl = tpls.find((t) => t.id === id)
    if (!tpl) return
    setSelectedTemplate(tpl)

    let parsedSubject = tpl.subject
    let parsedHtml = tpl.body_html || ''

    const finalContext = { ...context }
    const orgName = pb.authStore.record?.expand?.active_organization?.name || 'Nosso Escritório'

    finalContext['nome_organizacao'] = orgName
    finalContext['nome organização'] = orgName
    finalContext['org_name'] = orgName
    finalContext['data_alerta'] = context.data_alerta || new Date().toLocaleDateString('pt-BR')
    finalContext['alert_date'] = context.data_alerta || new Date().toLocaleDateString('pt-BR')
    finalContext['movement_description'] = context.movement_description || ''

    Object.entries(finalContext).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}|\\{\\{${key}\\}\\}`, 'gi')
      parsedSubject = parsedSubject.replace(regex, String(value) || '')
      parsedHtml = parsedHtml.replace(regex, String(value) || '')
    })

    setSubject(parsedSubject)
    setHtml(parsedHtml)
  }

  const handleSend = async () => {
    const toEmails = selectedClientIds
      .map((id) => clientsList.find((c) => c.id === id)?.email)
      .filter(Boolean)

    if (toEmails.length === 0) {
      return toast({
        title: 'Selecione pelo menos um cliente com e-mail válido',
        variant: 'destructive',
      })
    }

    setIsSending(true)
    try {
      await pb.send('/backend/v1/email/send-template', {
        method: 'POST',
        body: JSON.stringify({
          to: toEmails,
          subject,
          html,
        }),
      })

      toast({ title: 'Email enviado com sucesso!' })
      setDailyCount((prev) => prev + toEmails.length)
      setMonthlyCount((prev) => prev + toEmails.length)
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao enviar email', description: err.message, variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Enviar Email
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem profissional selecionando um ou mais clientes e um template abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLimitReached && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Limite de envio atingido para os destinatários selecionados (Máximo 100/dia ou
                3000/mês). Sua organização enviou {dailyCount} hoje e {monthlyCount} este mês.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Destinatários</Label>
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
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente por nome..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {clientsList.map((c) => {
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
                                <span className="text-xs text-rose-500">Sem e-mail cadastrado</span>
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
                  const c = clientsList.find((x) => x.id === id)
                  if (!c) return null
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-1 font-normal bg-white"
                    >
                      {c.name} {c.email ? '' : '(Sem e-mail)'}
                      <button
                        onClick={() => setSelectedClientIds((prev) => prev.filter((x) => x !== id))}
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
            <Label>Template de Comunicação</Label>
            <Select onValueChange={handleTemplateChange} value={selectedTemplate?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template pré-definido..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <>
              <div className="space-y-2 border-t pt-4">
                <Label>Assunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem (HTML)</Label>
                <div
                  className="bg-slate-50 border p-4 rounded-md text-sm prose prose-sm max-w-none max-h-[200px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="text-xs text-muted-foreground mr-auto flex items-center">
            Quota: {dailyCount}/100 dia | {monthlyCount}/3000 mês
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              isSending || selectedClientIds.length === 0 || !selectedTemplate || isLimitReached
            }
          >
            {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
