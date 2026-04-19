import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Clock } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

interface PublicEvent {
  id: string
  title: string
  type: string
  start_date: string
  end_date: string
}

export default function PublicAgenda() {
  const { orgId } = useParams()
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!orgId) return
    pb.send(`/backend/v1/public/agenda/${orgId}`, { method: 'GET' })
      .then((data) => {
        const today = startOfDay(new Date())
        const upcoming = (data as PublicEvent[]).filter((e) => new Date(e.start_date) >= today)
        setEvents(
          upcoming.sort(
            (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
          ),
        )
      })
      .catch((err) => {
        console.error(err)
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [orgId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Carregando agenda...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-red-500">Não foi possível carregar a agenda.</p>
      </div>
    )
  }

  const grouped = events.reduce(
    (acc, event) => {
      const dayStr = format(new Date(event.start_date), 'yyyy-MM-dd')
      if (!acc[dayStr]) acc[dayStr] = []
      acc[dayStr].push(event)
      return acc
    },
    {} as Record<string, PublicEvent[]>,
  )

  const days = Object.keys(grouped).sort()

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <CalendarDays className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Agenda Pública</h2>
          <p className="mt-2 text-sm text-slate-600">Compromissos e prazos agendados.</p>
        </div>

        {days.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-500">Nenhum compromisso futuro encontrado.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {days.map((dayStr) => {
              const dayEvents = grouped[dayStr]
              const date = new Date(dayStr + 'T12:00:00')

              return (
                <div
                  key={dayStr}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="bg-slate-100/50 border-b border-slate-200 px-6 py-3">
                    <h3 className="text-lg font-bold text-slate-800 capitalize">
                      {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h3>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {dayEvents.map((event) => (
                      <li
                        key={event.id}
                        className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="mt-1 flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 mb-1">{event.title}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="font-medium">
                              {format(new Date(event.start_date), 'HH:mm')}
                              {event.end_date && ` - ${format(new Date(event.end_date), 'HH:mm')}`}
                            </span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium border border-slate-200">
                              {event.type}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
