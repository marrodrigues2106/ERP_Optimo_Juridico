import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAgendaEvents } from '@/services/agenda'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRealtime } from '@/hooks/use-realtime'
import { CalendarDays, Clock, Link as LinkIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventFormModal } from '../cases/EventFormModal'

export function AgendaWidget() {
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [view, setView] = useState('7')
  const navigate = useNavigate()

  const load = async () => {
    try {
      setEvents(await getAgendaEvents())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useRealtime('agenda_events', load)

  const filtered = events.filter((e) => {
    if (!e.start_date) return false
    const d = new Date(e.start_date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setDate(now.getDate() + parseInt(view))
    end.setHours(23, 59, 59, 999)
    return d >= now && d <= end
  })

  const handleEventClick = (lawsuitId: string | undefined) => {
    if (lawsuitId) {
      navigate(`/intranet/processos/${lawsuitId}`)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm h-full flex flex-col bg-white">
      <CardHeader className="bg-white border-b py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg text-slate-800">Sua Agenda</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary"
          onClick={() => setEventModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </CardHeader>

      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v)}
          size="sm"
          className="justify-start bg-white border border-slate-200 rounded-md p-0.5"
        >
          <ToggleGroupItem value="1" className="text-xs h-7 px-3 data-[state=on]:bg-slate-100">
            Hoje
          </ToggleGroupItem>
          <ToggleGroupItem value="3" className="text-xs h-7 px-3 data-[state=on]:bg-slate-100">
            3 Dias
          </ToggleGroupItem>
          <ToggleGroupItem value="7" className="text-xs h-7 px-3 data-[state=on]:bg-slate-100">
            Semana
          </ToggleGroupItem>
          <ToggleGroupItem value="30" className="text-xs h-7 px-3 data-[state=on]:bg-slate-100">
            Mês
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <CardContent className="p-3 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center h-full">
            <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum compromisso no período.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const isLinked = !!e.expand?.linked_lawsuit

              return (
                <div
                  key={e.id}
                  onClick={() => handleEventClick(e.expand?.linked_lawsuit?.id)}
                  className={`flex gap-3 bg-white border-b border-slate-100 p-2 last:border-0 transition-colors hover:bg-slate-50 ${isLinked ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex flex-col items-center justify-center min-w-[45px] shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {new Date(e.start_date).toLocaleString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="text-[18px] font-bold text-slate-700 leading-tight">
                      {new Date(e.start_date).getDate()}
                    </span>
                  </div>

                  <div
                    className="w-[3px] rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        e.type === 'Meeting'
                          ? '#3b82f6'
                          : e.type === 'Hearing'
                            ? '#8b5cf6'
                            : e.type === 'Deadline'
                              ? '#ef4444'
                              : e.type === 'Call'
                                ? '#10b981'
                                : '#94a3b8',
                    }}
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-[13px] font-semibold text-slate-800 truncate"
                        title={e.title}
                      >
                        {e.title}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">
                        {e.type === 'Hearing'
                          ? 'Audiência'
                          : e.type === 'Meeting'
                            ? 'Reunião'
                            : e.type === 'Deadline'
                              ? 'Prazo'
                              : e.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center font-medium">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(e.start_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isLinked && (
                        <span className="flex items-center truncate text-primary/70">
                          <LinkIcon className="w-3 h-3 mr-1 shrink-0" />
                          <span className="truncate">
                            {e.expand.linked_lawsuit.case_number || 'Processo vinculado'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <EventFormModal open={eventModalOpen} onOpenChange={setEventModalOpen} onSuccess={load} />
    </Card>
  )
}
