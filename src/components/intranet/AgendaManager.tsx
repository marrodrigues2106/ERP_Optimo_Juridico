import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { EventFormModal } from './cases/EventFormModal'
import {
  Plus,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  CheckSquare,
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

export default function AgendaManager() {
  const { toast } = useToast()
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const generateICalLink = () => {
    const token = pb.authStore.record?.ical_token
    if (!token) return ''
    const baseUrl = import.meta.env.VITE_POCKETBASE_URL || window.location.origin
    return `${baseUrl}/backend/v1/agenda/ical/${token}?format=ics`
  }

  const copyGoogleCalendarLink = () => {
    const link = generateICalLink()
    if (!link) return toast({ title: 'Token não encontrado', variant: 'destructive' })

    const webcalLink = link.replace(/^https?:\/\//, 'webcal://')
    const gcalLink = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalLink)}`

    navigator.clipboard.writeText(gcalLink)
    toast({ title: 'Link do Google Calendar copiado para a área de transferência!' })
  }

  const downloadICS = () => {
    const link = generateICalLink()
    if (!link) return toast({ title: 'Token não encontrado', variant: 'destructive' })

    const a = document.createElement('a')
    a.href = link
    a.download = 'agenda.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const loadData = async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const [evRes, taskRes] = await Promise.all([
        pb.collection('agenda_events').getFullList({
          filter: `deleted_at = ""${orgId ? ` && organization = "${orgId}"` : ''}`,
          sort: 'start_date',
          expand: 'linked_lawsuit,client,participants',
        }),
        pb.collection('tasks').getFullList({
          filter: `deleted_at = "" && due_date != ""${orgId ? ` && organization = "${orgId}"` : ''}`,
          sort: 'due_date',
          expand: 'linked_lawsuit,client,collaborator',
        }),
      ])

      const mappedTasks = taskRes.map((t) => ({
        ...t,
        isTask: true,
        start_date: t.due_date,
        type: 'Task',
        sync_status: 'Local Only',
        sync_provider: 'Local',
        expand: {
          ...t.expand,
          participants: t.expand?.collaborator ? [t.expand.collaborator] : [],
        },
      }))

      setEvents(
        [...evRes, ...mappedTasks].sort(
          (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        ),
      )
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('agenda_events', loadData)
  useRealtime('tasks', loadData)

  const handleDeleteItem = async (item: any) => {
    if (confirm('Tem certeza que deseja remover este item?')) {
      try {
        if (item.isTask) {
          await pb.collection('tasks').update(item.id, { deleted_at: new Date().toISOString() })
        } else {
          await pb
            .collection('agenda_events')
            .update(item.id, { deleted_at: new Date().toISOString() })
        }
        toast({ title: 'Item excluído com sucesso.' })
      } catch (e) {
        toast({ title: 'Erro ao excluir', variant: 'destructive' })
      }
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

  const handleItemClick = (item: any) => {
    if (item.isTask) {
      setEditingTask(item)
      setTaskModalOpen(true)
    } else {
      setEditingEvent(item)
      setFormOpen(true)
    }
  }

  const renderEventsList = (days: Date[]) => {
    return days.map((d) => {
      const dayEvents = events.filter((e) => isSameDay(new Date(e.start_date), d))
      return (
        <div key={d.toISOString()} className="mb-6">
          <h3 className="font-bold text-slate-700 mb-3 pb-2 border-b">
            {format(d, 'EEEE, dd/MM/yyyy')}
          </h3>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-slate-400 italic mb-4">Nenhum compromisso agendado.</p>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => handleItemClick(ev)}
                  className="flex justify-between items-start p-4 border rounded-lg shadow-sm bg-white group hover:border-primary/40 transition-all cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {ev.isTask && <CheckSquare className="w-4 h-4 text-emerald-500" />}
                      <h4 className="font-bold text-slate-800 text-sm">{ev.title}</h4>
                      {!ev.isTask && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${ev.sync_status === 'Synced' ? 'bg-green-50 text-green-700 border-green-200' : ev.sync_status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                        >
                          {ev.sync_provider && ev.sync_provider !== 'Local'
                            ? `${ev.sync_provider} (${ev.sync_status || 'Pending'})`
                            : 'Local Only'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
                      <span className="flex items-center font-medium bg-slate-50 px-2 py-1 rounded">
                        <Clock className="w-3 h-3 mr-1 text-primary" />
                        {new Date(ev.start_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="uppercase font-bold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 tracking-wider text-[10px]">
                        {ev.type || 'Geral'}
                      </span>
                      {ev.expand?.client && (
                        <span className="flex items-center bg-slate-50 px-2 py-1 rounded border">
                          <User className="w-3 h-3 mr-1" /> {ev.expand.client.name}
                        </span>
                      )}
                      {ev.expand?.linked_lawsuit && (
                        <span className="bg-slate-50 px-2 py-1 rounded border">
                          Ref: {ev.expand.linked_lawsuit.case_number || 'Processo vinculado'}
                        </span>
                      )}
                      {ev.isTask && ev.priority && (
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border">
                          <div
                            className={`w-2 h-2 rounded-full ${ev.priority === 'high' ? 'bg-red-500' : ev.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-300'}`}
                          />
                          Prioridade: {ev.priority}
                        </span>
                      )}
                    </div>
                    {ev.expand?.participants && ev.expand.participants.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        <span>
                          Participantes: {ev.expand.participants.map((p: any) => p.name).join(', ')}
                        </span>
                      </div>
                    )}
                    {ev.description && (
                      <p className="text-xs mt-3 text-slate-600 bg-slate-50/50 p-2 rounded">
                        {ev.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteItem(ev)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0"
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" /> Agenda Integrada
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie compromissos e prazos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyGoogleCalendarLink}>
            Copiar Link GCal
          </Button>
          <Button variant="outline" size="sm" onClick={downloadICS}>
            Baixar .ics
          </Button>
          <Button
            onClick={() => {
              setEditingEvent(null)
              setFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Compromisso
          </Button>
        </div>
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
            <h3 className="text-lg font-bold min-w-[150px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
          </div>
          <Tabs value={view} onValueChange={setView} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="3days">3 Dias</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 bg-slate-50/30">
          {view === 'month' ? (
            <div className="grid grid-cols-7 gap-px bg-slate-200 border rounded-lg overflow-hidden">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((wd) => (
                <div
                  key={wd}
                  className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase"
                >
                  {wd}
                </div>
              ))}
              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentDate)),
                end: addDays(endOfMonth(currentDate), 6 - endOfMonth(currentDate).getDay()),
              }).map((d) => {
                const dayEvents = events.filter((e) => isSameDay(new Date(e.start_date), d))
                return (
                  <div
                    key={d.toISOString()}
                    className={`min-h-[120px] bg-white p-2 flex flex-col ${!isSameMonth(d, currentDate) ? 'bg-slate-50 opacity-60' : ''}`}
                  >
                    <span
                      className={`text-xs font-bold self-end w-6 h-6 flex items-center justify-center rounded-full ${isSameDay(d, new Date()) ? 'bg-primary text-white' : 'text-slate-600'}`}
                    >
                      {format(d, 'd')}
                    </span>
                    <div className="mt-1 space-y-1 flex-1 overflow-y-auto">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => handleItemClick(ev)}
                          className={`text-[10px] truncate px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 ${ev.isTask ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}
                          title={ev.title}
                        >
                          {new Date(ev.start_date).toLocaleTimeString('pt-BR', {
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
          ) : (
            renderEventsList(
              view === 'day'
                ? [currentDate]
                : view === '3days'
                  ? Array.from({ length: 3 }).map((_, i) => addDays(currentDate, i))
                  : eachDayOfInterval({
                      start: startOfWeek(currentDate),
                      end: addDays(startOfWeek(currentDate), 6),
                    }),
            )
          )}
        </CardContent>
      </Card>

      <EventFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={currentDate}
        onSuccess={loadData}
        editingEvent={editingEvent}
      />
      <TaskEditModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        onSuccess={loadData}
      />
    </div>
  )
}

function TaskEditModal({ task, open, onOpenChange, onSuccess }: any) {
  const { toast } = useToast()
  const [title, setTitle] = useState(task?.title || '')
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.substring(0, 16) : '')
  const [priority, setPriority] = useState(task?.priority || 'medium')

  useEffect(() => {
    if (open && task) {
      setTitle(task.title || '')
      setDueDate(task.due_date ? task.due_date.substring(0, 16) : '')
      setPriority(task.priority || 'medium')
    }
  }, [open, task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await pb.collection('tasks').update(task.id, {
        title,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
      })
      toast({ title: 'Tarefa atualizada com sucesso' })
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await pb.collection('tasks').update(task.id, { deleted_at: new Date().toISOString() })
        toast({ title: 'Tarefa excluída com sucesso' })
        onSuccess()
        onOpenChange(false)
      } catch (err) {
        toast({ title: 'Erro ao excluir tarefa', variant: 'destructive' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para edição de tarefa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>Data de Vencimento</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between pt-4">
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
