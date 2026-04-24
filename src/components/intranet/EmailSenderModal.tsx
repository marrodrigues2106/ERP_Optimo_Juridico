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
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EmailSenderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: any
  context: {
    client_name?: string
    case_number?: string
    org_name?: string
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
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      pb.collection('communication_templates')
        .getFullList({ filter: "type = 'Email'", sort: '-created' })
        .then(setTemplates)
        .catch(console.error)

      const fetchQuotas = async () => {
        try {
          const today = new Date()
          const todayStr = today.toISOString().split('T')[0]
          const startOfMonthStr = todayStr.substring(0, 8) + '01'
          const orgId = pb.authStore.record?.active_organization

          if (!orgId) return

          const dailyRes = await pb.collection('system_logs').getList(1, 1, {
            filter: `module = 'email' && message = 'email_sent' && organization = "${orgId}" && created >= "${todayStr} 00:00:00"`,
            $autoCancel: false,
          })
          const monthlyRes = await pb.collection('system_logs').getList(1, 1, {
            filter: `module = 'email' && message = 'email_sent' && organization = "${orgId}" && created >= "${startOfMonthStr} 00:00:00"`,
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
  }, [open])

  const isLimitReached = dailyCount >= 100 || monthlyCount >= 3000

  const handleTemplateChange = (id: string) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    setSelectedTemplate(tpl)

    let parsedSubject = tpl.subject
    let parsedHtml = tpl.body_html || ''

    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      parsedSubject = parsedSubject.replace(regex, value || '')
      parsedHtml = parsedHtml.replace(regex, value || '')
    })

    setSubject(parsedSubject)
    setHtml(parsedHtml)
  }

  const handleSend = async () => {
    if (!client?.email) {
      return toast({ title: 'Cliente não possui email cadastrado', variant: 'destructive' })
    }

    setIsSending(true)
    try {
      await pb.send('/backend/v1/email/send-template', {
        method: 'POST',
        body: JSON.stringify({
          to: client.email,
          subject,
          html,
        }),
      })

      toast({ title: 'Email enviado com sucesso!' })
      setDailyCount((prev) => prev + 1)
      setMonthlyCount((prev) => prev + 1)
      onOpenChange(false)
      setSelectedTemplate(null)
      setSubject('')
      setHtml('')
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
            Envie uma mensagem profissional para {client?.name || 'o cliente'} selecionando um
            template abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLimitReached && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Limite de envio de e-mails atingido (Máximo 100/dia ou 3000/mês). Você já enviou{' '}
                {dailyCount} hoje e {monthlyCount} este mês.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Destinatário</Label>
            <Input
              value={client?.email || 'Sem email cadastrado'}
              disabled
              className="bg-slate-50"
            />
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
                  className="bg-slate-50 border p-4 rounded-md text-sm prose prose-sm max-w-none max-h-[300px] overflow-y-auto"
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
            disabled={isSending || !client?.email || !selectedTemplate || isLimitReached}
          >
            {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
