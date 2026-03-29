import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAgendaEvents } from '@/services/agenda'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRealtime } from '@/hooks/use-realtime'
import { CalendarDays, Clock, Link as LinkIcon } from 'lucide-react'

export function AgendaWidget() {
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
                  className={`flex gap-3 bg-white border border-slate-100 p-3 rounded-lg shadow-sm transition-all ${isLinked ? 'cursor-pointer hover:border-slate-300 hover:shadow-md' : ''}`}
                >
                  <div
                    className={`flex flex-col items-center justify-center rounded-md px-2 py-1 min-w-[50px] shrink-0 border
                    ${
                      e.type === 'Meeting'
                        ? 'bg-blue-50 border-blue-100 text-blue-700'
                        : e.type === 'Deadline'
                          ? 'bg-red-50 border-red-100 text-red-700'
                          : e.type === 'Call'
                            ? 'bg-green-50 border-green-100 text-green-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">
                      {new Date(e.start_date).toLocaleString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="text-lg font-black leading-none my-0.5">
                      {new Date(e.start_date).getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p
                      className="text-sm font-semibold text-slate-800 line-clamp-1"
                      title={e.title}
                    >
                      {e.title}
                    </p>

                    {isLinked && (
                      <p className="text-[10px] text-primary flex items-center mt-0.5 truncate">
                        <LinkIcon className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate">
                          {e.expand.linked_lawsuit.case_number || e.expand.linked_lawsuit.parties}
                        </span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {new Date(e.start_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {e.type}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
