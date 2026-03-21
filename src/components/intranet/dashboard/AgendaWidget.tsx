import { useState, useEffect } from 'react'
import { getAgendaEvents } from '@/services/agenda'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRealtime } from '@/hooks/use-realtime'
import { CalendarDays } from 'lucide-react'

export function AgendaWidget() {
  const [events, setEvents] = useState<any[]>([])
  const [view, setView] = useState('7')

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

  return (
    <Card className="border-border shadow-sm h-full flex flex-col">
      <CardHeader className="bg-slate-50 border-b py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Sua Agenda</CardTitle>
        </div>
      </CardHeader>
      <div className="px-4 py-3 border-b bg-white">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v)}
          size="sm"
          className="justify-start"
        >
          <ToggleGroupItem value="1" className="text-xs">
            1 Dia
          </ToggleGroupItem>
          <ToggleGroupItem value="3" className="text-xs">
            3 Dias
          </ToggleGroupItem>
          <ToggleGroupItem value="7" className="text-xs">
            Semana
          </ToggleGroupItem>
          <ToggleGroupItem value="30" className="text-xs">
            Mês
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <CardContent className="p-4 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum compromisso no período.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="p-3 border rounded-lg bg-white flex items-start gap-3 hover:shadow-sm transition-shadow"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    e.type === 'Meeting'
                      ? 'bg-blue-500'
                      : e.type === 'Deadline'
                        ? 'bg-red-500'
                        : e.type === 'Call'
                          ? 'bg-green-500'
                          : e.type === 'Reminder'
                            ? 'bg-amber-500'
                            : 'bg-slate-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1" title={e.title}>
                    {e.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground font-medium">
                      {new Date(e.start_date).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      {e.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
