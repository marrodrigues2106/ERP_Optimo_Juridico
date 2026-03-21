import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAgendaEvents, createAgendaEvent, deleteAgendaEvent } from '@/services/agenda'
import { getLawsuits } from '@/services/lawsuits'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Trash2,
  Calendar,
  Clock,
  Link as LinkIcon,
  FileText,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AgendaManager() {
  const [events, setEvents] = useState<any[]>([])
  const [lawsuits, setLawsuits] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setEvents(await getAgendaEvents())
      setLawsuits(await getLawsuits())
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('agenda_events', loadData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    if (!data.linked_lawsuit || data.linked_lawsuit === 'none') delete data.linked_lawsuit
    if (data.start_date) data.start_date = new Date(data.start_date as string).toISOString()
    if (data.end_date) data.end_date = new Date(data.end_date as string).toISOString()

    try {
      await createAgendaEvent(data)
      toast({ title: 'Evento agendado com sucesso' })
      setOpen(false)
    } catch (err) {
      toast({ title: 'Erro ao agendar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este evento da agenda?')) await deleteAgendaEvent(id)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'Meeting':
        return <Users className="w-5 h-5 text-blue-600" />
      case 'Call':
        return <Phone className="w-5 h-5 text-green-600" />
      case 'Deadline':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'Reminder':
        return <Clock className="w-5 h-5 text-amber-600" />
      default:
        return <FileText className="w-5 h-5 text-slate-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Agenda da Equipe</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="w-4 h-4 mr-2" /> Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Evento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input name="title" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select name="type" defaultValue="Meeting">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meeting">Reunião</SelectItem>
                      <SelectItem value="Call">Ligação</SelectItem>
                      <SelectItem value="Deadline">Prazo</SelectItem>
                      <SelectItem value="Reminder">Lembrete</SelectItem>
                      <SelectItem value="Note">Anotação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vincular Processo/Serviço</Label>
                  <Select name="linked_lawsuit" defaultValue="none">
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não vincular</SelectItem>
                      {lawsuits.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.parties || l.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data/Hora Início</Label>
                  <Input type="datetime-local" name="start_date" required />
                </div>
                <div>
                  <Label>Data/Hora Fim (Opcional)</Label>
                  <Input type="datetime-local" name="end_date" />
                </div>
              </div>
              <div>
                <Label>Descrição / Notas</Label>
                <Input name="description" />
              </div>
              <Button type="submit" className="w-full">
                Salvar Evento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {events.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum evento agendado.</p>
        ) : (
          events.map((ev) => (
            <Card key={ev.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl shrink-0">{getIcon(ev.type)}</div>
                  <div>
                    <h4 className="font-bold text-lg text-primary">{ev.title}</h4>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1 items-center">
                      <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {ev.type}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />{' '}
                        {new Date(ev.start_date).toLocaleString()}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-sm mt-2 text-slate-600">{ev.description}</p>
                    )}
                    {ev.expand?.linked_lawsuit && (
                      <div className="text-xs mt-3 bg-secondary/10 text-secondary inline-flex items-center px-2 py-1 rounded-md font-medium">
                        <LinkIcon className="w-3 h-3 mr-1" /> Vinculado:{' '}
                        {ev.expand.linked_lawsuit.parties}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 self-start sm:self-center"
                  onClick={() => handleDelete(ev.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
