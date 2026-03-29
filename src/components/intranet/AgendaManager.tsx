import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  CloudSync,
  Settings2,
  Users,
  User,
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
  const [cases, setCases] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)

  const loadData = async () => {
    try {
      const [evRes, casesRes, clientsRes, collabRes] = await Promise.all([
        pb
          .collection('agenda_events')
          .getFullList({ sort: 'event_date', expand: 'linked_lawsuit,client,participants' }),
        pb.collection('legal_cases').getFullList(),
        pb.collection('clients').getFullList(),
        pb.collection('collaborators').getFullList(),
      ])
      setEvents(evRes)
      setCases(casesRes)
      setClients(clientsRes)
      setCollaborators(collabRes)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('agenda_events', loadData)

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este evento?')) {
      try {
        await pb.collection('agenda_events').delete(id)
        toast({ title: 'Evento excluído com sucesso.' })
      } catch (e) {
        toast({ title: 'Erro ao excluir evento', variant: 'destructive' })
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

  const renderEventsList = (days: Date[]) => {
    return days.map((d) => {
      const dayEvents = events.filter((e) => isSameDay(new Date(e.event_date || e.start_date), d))
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
                  className="flex justify-between items-start p-4 border rounded-lg shadow-sm bg-white group hover:border-primary/40 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-800 text-sm">{ev.title}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          ev.sync_status === 'Synced'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : ev.sync_status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {ev.sync_provider && ev.sync_provider !== 'Local'
                          ? `${ev.sync_provider} (${ev.sync_status || 'Pending'})`
                          : 'Local Only'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
                      <span className="flex items-center font-medium bg-slate-50 px-2 py-1 rounded">
                        <Clock className="w-3 h-3 mr-1 text-primary" />
                        {new Date(ev.event_date || ev.start_date).toLocaleTimeString('pt-BR', {
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
                    onClick={() => handleDelete(ev.id)}
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
        <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-primary" />
          Agenda Integrada da Equipe
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSyncModalOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Configurar Sync
          </Button>
          <Button onClick={() => setFormOpen(true)}>
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
                const dayEvents = events.filter((e) =>
                  isSameDay(new Date(e.event_date || e.start_date), d),
                )
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
                          className="text-[10px] truncate bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100"
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
        cases={cases}
        clients={clients}
        collaborators={collaborators}
        onSuccess={loadData}
        defaultDate={currentDate}
      />
      <SyncConfigModal open={syncModalOpen} onOpenChange={setSyncModalOpen} />
    </div>
  )
}

function EventFormModal({
  open,
  onOpenChange,
  cases,
  clients,
  collaborators,
  onSuccess,
  defaultDate,
}: any) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      const dateTime = new Date(`${fd.get('date')}T${fd.get('time')}`).toISOString()

      await pb.collection('agenda_events').create({
        title: fd.get('title'),
        description: fd.get('description'),
        type: fd.get('type'),
        start_date: dateTime,
        event_date: dateTime,
        client: fd.get('client') !== 'none' ? fd.get('client') : null,
        linked_lawsuit: fd.get('linked_lawsuit') !== 'none' ? fd.get('linked_lawsuit') : null,
        sync_provider: fd.get('sync_provider'),
        sync_status: fd.get('sync_provider') === 'Local' ? 'Local Only' : 'Pending',
      })

      toast({ title: 'Evento agendado com sucesso.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro ao agendar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Compromisso</DialogTitle>
          <DialogDescription>
            Crie um evento vinculando participantes, clientes e integrações de calendário.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Título / Assunto *</Label>
              <Input name="title" required placeholder="Ex: Audiência de Conciliação..." />
            </div>

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
                  <SelectItem value="Atendimento">Atendimento Cliente</SelectItem>
                  <SelectItem value="Task">Tarefa / Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Provedor de Sincronização (Nuvem)</Label>
              <Select name="sync_provider" defaultValue="Local">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local">Somente Local</SelectItem>
                  <SelectItem value="Google">Google Calendar</SelectItem>
                  <SelectItem value="Outlook">Outlook 365</SelectItem>
                  <SelectItem value="iCloud">Apple iCloud</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cliente Relacionado</Label>
              <Select name="client" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Processo Vinculado</Label>
              <Select name="linked_lawsuit" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum processo</SelectItem>
                  {cases.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_number || c.parties}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Descrição / Links da Reunião</Label>
              <Input
                name="description"
                placeholder="Informações adicionais, pauta, link do Google Meet..."
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Confirmar Agendamento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SyncConfigModal({ open, onOpenChange }: any) {
  const { toast } = useToast()
  const [linking, setLinking] = useState(false)

  const handleOAuthLink = async (provider: string) => {
    setLinking(true)
    try {
      await pb.send('/backend/v1/agenda/oauth', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      })
      toast({
        title: 'Conta Conectada',
        description: `Integração com ${provider} ativada com sucesso.`,
      })
    } catch (err: any) {
      toast({ title: 'Erro de Autenticação', description: err.message, variant: 'destructive' })
    } finally {
      setLinking(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudSync className="w-5 h-5 text-primary" /> Conectores de Calendário
          </DialogTitle>
          <DialogDescription>
            Autorize o acesso via OAuth para sincronização bidirecional da agenda.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center font-bold">
                G
              </div>
              <div>
                <h4 className="font-semibold text-sm">Google Calendar</h4>
                <p className="text-xs text-muted-foreground">Sincronizar com Workspace</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOAuthLink('Google')}
              disabled={linking}
            >
              Conectar Conta
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                M
              </div>
              <div>
                <h4 className="font-semibold text-sm">Microsoft Outlook</h4>
                <p className="text-xs text-muted-foreground">Sincronizar com Office 365</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOAuthLink('Outlook')}
              disabled={linking}
            >
              Conectar Conta
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <h4 className="font-semibold text-sm">Apple iCloud</h4>
                <p className="text-xs text-muted-foreground">Sincronizar com iCloud Cal</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOAuthLink('iCloud')}
              disabled={linking}
            >
              Conectar Conta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
