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
  const [formOpen, setFormOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)

  const loadData = async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const evRes = await pb.collection('agenda_events').getFullList({
        filter: `deleted_at = ""${orgId ? ` && organization = "${orgId}"` : ''}`,
        sort: 'start_date',
        expand: 'linked_lawsuit,client,participants',
      })
      setEvents(evRes)
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
        await pb.collection('agenda_events').update(id, { deleted_at: new Date().toISOString() })
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
                          className="text-[10px] truncate bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100"
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
      />
      <SyncConfigModal open={syncModalOpen} onOpenChange={setSyncModalOpen} />
    </div>
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
