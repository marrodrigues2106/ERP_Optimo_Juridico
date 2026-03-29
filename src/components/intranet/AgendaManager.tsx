import { useState, useEffect } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Plus,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from 'date-fns'
import { getLegalCases } from '@/services/legal_cases'

export default function AgendaManager() {
  const { toast } = useToast()
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)

  const loadData = async () => {
    try {
      const res = await pb
        .collection('agenda_events')
        .getFullList({ sort: 'event_date', expand: 'linked_lawsuit' })
      setEvents(res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    getLegalCases().then(setCases).catch(console.error)
  }, [])

  useRealtime('agenda_events', loadData)

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('agenda_events').delete(id)
      toast({ title: 'Evento excluído com sucesso.' })
    } catch (e) {
      toast({ title: 'Erro ao excluir evento', variant: 'destructive' })
    }
  }

  const navigateDate = (dir: 'prev' | 'next') => {
    const amount = dir === 'next' ? 1 : -1
    if (view === 'day') setCurrentDate(addDays(currentDate, amount))
    if (view === '3days') setCurrentDate(addDays(currentDate, amount * 3))
    if (view === 'week') setCurrentDate(addWeeks(currentDate, amount))
    if (view === 'month')
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + amount, 1))
  }

  const renderEventsList = (days: Date[]) => {
    return days.map((d) => {
      const dayEvents = events.filter((e) => isSameDay(new Date(e.event_date || e.start_date), d))
      return (
        <div key={d.toISOString()} className="mb-6">
          <h3 className="font-bold text-slate-700 mb-3 pb-2 border-b">
            {format(d, 'EEEE, dd/MM/yyyy')}
          </h3>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-slate-400 italic mb-4">Nenhum evento</p>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex justify-between items-start p-3 border rounded-lg shadow-sm bg-white group hover:border-primary/30 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{ev.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center font-medium text-slate-700">
                        <Clock className="w-3 h-3 mr-1 text-primary" />
                        {new Date(ev.event_date || ev.start_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {ev.type || 'Geral'}
                      </span>
                      {ev.expand?.linked_lawsuit && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded border">
                          Ref: {ev.expand.linked_lawsuit.case_number || 'Processo vinculado'}
                        </span>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-xs mt-2 text-slate-600">{ev.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ev.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    })
  }

  const renderMonthGrid = () => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start, end: addDays(end, 6 - end.getDay()) })

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 border rounded-lg overflow-hidden">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((wd) => (
          <div
            key={wd}
            className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase"
          >
            {wd}
          </div>
        ))}
        {days.map((d) => {
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.event_date || e.start_date), d),
          )
          const isCurrentMonth = isSameMonth(d, currentDate)
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[100px] bg-white p-2 flex flex-col ${!isCurrentMonth ? 'bg-slate-50 opacity-50' : ''}`}
            >
              <span
                className={`text-xs font-bold self-end ${isSameDay(d, new Date()) ? 'bg-primary text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-600'}`}
              >
                {format(d, 'd')}
              </span>
              <div className="mt-1 space-y-1 flex-1 overflow-y-auto">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[9px] truncate bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-100"
                    title={ev.title}
                  >
                    {new Date(ev.event_date || ev.start_date).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    {ev.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-primary" />
          Agenda da Equipe
        </h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Evento
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="bg-slate-50/50 pb-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-bold min-w-[150px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
          </div>
          <Tabs value={view} onValueChange={setView} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="day">1 Dia</TabsTrigger>
              <TabsTrigger value="3days">3 Dias</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {view === 'month'
            ? renderMonthGrid()
            : renderEventsList(
                view === 'day'
                  ? [currentDate]
                  : view === '3days'
                    ? Array.from({ length: 3 }).map((_, i) => addDays(currentDate, i))
                    : eachDayOfInterval({
                        start: startOfWeek(currentDate),
                        end: addDays(startOfWeek(currentDate), 6),
                      }),
              )}
        </CardContent>
      </Card>

      <EventFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        cases={cases}
        onSuccess={loadData}
        defaultDate={currentDate}
      />
    </div>
  )
}

function EventFormModal({ open, onOpenChange, cases, onSuccess, defaultDate }: any) {
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      const dateTime = new Date(`${fd.get('date')}T${fd.get('time')}`).toISOString()
      const linkedLawsuit = fd.get('linked_lawsuit') as string

      await pb.collection('agenda_events').create({
        title: fd.get('title'),
        description: fd.get('description'),
        type: fd.get('type'),
        start_date: dateTime,
        event_date: dateTime,
        linked_lawsuit: linkedLawsuit && linkedLawsuit !== 'none' ? linkedLawsuit : null,
      })

      toast({ title: 'Evento agendado com sucesso.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro ao agendar', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Compromisso na Agenda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label>Título / Assunto *</Label>
            <Input name="title" required placeholder="Ex: Reunião com Cliente X" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                name="date"
                required
                defaultValue={defaultDate ? format(defaultDate, 'yyyy-MM-dd') : ''}
              />
            </div>
            <div>
              <Label>Hora *</Label>
              <Input type="time" name="time" required defaultValue="09:00" />
            </div>
          </div>
          <div>
            <Label>Processo Vinculado</Label>
            <Select name="linked_lawsuit" defaultValue="none">
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum processo vinculado</SelectItem>
                {cases.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number || c.parties}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de Evento</Label>
            <Select name="type" defaultValue="Reunião">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Reunião">Reunião</SelectItem>
                <SelectItem value="Audiência">Audiência</SelectItem>
                <SelectItem value="Prazo">Prazo Processual</SelectItem>
                <SelectItem value="Atendimento">Atendimento</SelectItem>
                <SelectItem value="Task">Tarefa / Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição / Notas</Label>
            <Input name="description" placeholder="Informações adicionais..." />
          </div>
          <Button type="submit" className="w-full mt-2">
            Agendar Evento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
