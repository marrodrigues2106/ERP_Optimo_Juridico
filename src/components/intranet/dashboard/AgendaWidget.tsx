import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAgendaEvents } from '@/services/agenda'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'
import {
  CalendarDays,
  Clock,
  Link as LinkIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventFormModal } from '../cases/EventFormModal'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export function AgendaWidget() {
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
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
    return d >= startOfDay(selectedDate) && d <= endOfDay(selectedDate)
  })

  const handleEventClick = (lawsuitId: string | undefined) => {
    if (lawsuitId) {
      navigate(`/intranet/processos/${lawsuitId}`)
    }
  }

  const navigateDay = (days: number) => {
    setSelectedDate((prev) => addDays(prev, days))
  }

  return (
    <Card className="border-slate-200 shadow-sm h-full flex flex-col bg-white">
      <CardHeader className="bg-white border-b py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg text-slate-800">Console de Eventos</CardTitle>
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-7 justify-start text-left font-medium text-xs px-3',
                  !selectedDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {selectedDate ? (
                  format(selectedDate, "dd 'de' MMM", { locale: ptBR })
                ) : (
                  <span>Selecione</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigateDay(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSelectedDate(new Date())}
        >
          Hoje
        </Button>
      </div>

      <CardContent className="p-3 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center h-full">
            <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum compromisso neste dia.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const isLinked = !!e.expand?.linked_lawsuit

              return (
                <div
                  key={e.id}
                  onClick={() => handleEventClick(e.expand?.linked_lawsuit?.id)}
                  className={`flex gap-3 bg-white border border-slate-100 rounded-lg p-2 transition-colors hover:bg-slate-50 ${isLinked ? 'cursor-pointer' : ''}`}
                >
                  <div
                    className="w-1.5 rounded-full shrink-0"
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
      <EventFormModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        onSuccess={load}
        defaultDate={selectedDate}
      />
    </Card>
  )
}
