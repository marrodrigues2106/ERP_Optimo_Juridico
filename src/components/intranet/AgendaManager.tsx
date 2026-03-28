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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
  Phone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

export default function AgendaManager() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [lawsuits, setLawsuits] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('7') // 1, 3, 7, 30
  const [baseDate, setBaseDate] = useState(new Date())
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const allEvents = await getAgendaEvents()
      const role = user?.role || 'collaborator'
      let filtered = allEvents
      if (role === 'collaborator') {
        filtered = allEvents.filter((e) => e.collaborator === user?.id || e.user === user?.id)
      } else if (role === 'coordinator') {
        // Mock filtering for coordinator, seeing some others too
        filtered = allEvents
      } // manager sees all
      setEvents(filtered)
      setLawsuits(await getLawsuits())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])
  useRealtime('agenda_events', loadData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    if (!data.linked_lawsuit || data.linked_lawsuit === 'none') delete data.linked_lawsuit
    if (data.start_date) data.start_date = new Date(data.start_date as string).toISOString()
    if (data.end_date) data.end_date = new Date(data.end_date as string).toISOString()

    try {
      await createAgendaEvent({ ...data, collaborator: user?.id })
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
        return <Users className="w-4 h-4 text-blue-600" />
      case 'Call':
        return <Phone className="w-4 h-4 text-green-600" />
      case 'Deadline':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'Reminder':
        return <Clock className="w-4 h-4 text-amber-600" />
      default:
        return <FileText className="w-4 h-4 text-slate-600" />
    }
  }

  const moveDate = (days: number) => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + days)
    setBaseDate(d)
  }

  const viewDays = parseInt(view)
  const endDate = new Date(baseDate)
  endDate.setDate(endDate.getDate() + viewDays - 1)
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date(baseDate)
  startDate.setHours(0, 0, 0, 0)

  const visibleEvents = events
    .filter((e) => {
      const d = new Date(e.start_date)
      return d >= startDate && d <= endDate
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  const daysArray = []
  for (let i = 0; i < viewDays; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i)
    daysArray.push(d)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Agenda da Equipe</h2>
        <div className="flex items-center gap-4">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)}>
            <ToggleGroupItem value="1">1 Dia</ToggleGroupItem>
            <ToggleGroupItem value="3">3 Dias</ToggleGroupItem>
            <ToggleGroupItem value="7">Semana</ToggleGroupItem>
          </ToggleGroup>
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
                    <Label>Data/Hora Fim</Label>
                    <Input type="datetime-local" name="end_date" />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Salvar Evento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => moveDate(-viewDays)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold w-32 text-center text-sm md:text-base">
              {startDate.toLocaleDateString()}{' '}
              {viewDays > 1 ? `- ${endDate.toLocaleDateString()}` : ''}
            </span>
            <Button variant="outline" size="icon" onClick={() => moveDate(viewDays)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={() => setBaseDate(new Date())}>
              Hoje
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className={`grid grid-cols-1 md:grid-cols-${viewDays === 7 ? 7 : viewDays} divide-y md:divide-y-0 md:divide-x`}
          >
            {daysArray.map((day, idx) => {
              const dayEvents = visibleEvents.filter(
                (e) => new Date(e.start_date).toDateString() === day.toDateString(),
              )
              const isToday = day.toDateString() === new Date().toDateString()

              return (
                <div key={idx} className="min-h-[400px] flex flex-col">
                  <div
                    className={cn(
                      'p-2 border-b text-center sticky top-0',
                      isToday
                        ? 'bg-primary/5 border-primary/20 text-primary font-bold'
                        : 'bg-slate-50',
                    )}
                  >
                    <div className="text-xs uppercase">
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className="text-lg">{day.getDate()}</div>
                  </div>
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2 border rounded-md bg-white shadow-sm text-sm group relative"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {getIcon(ev.type)}
                          <span className="font-medium text-xs truncate">
                            {new Date(ev.start_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="font-semibold leading-tight line-clamp-2">{ev.title}</p>
                        {ev.expand?.linked_lawsuit && (
                          <div className="text-[10px] mt-1 text-slate-500 truncate flex items-center">
                            <LinkIcon className="w-2.5 h-2.5 mr-1" />
                            {ev.expand.linked_lawsuit.parties}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive"
                          onClick={() => handleDelete(ev.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
