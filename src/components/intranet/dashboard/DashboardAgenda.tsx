import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle2, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, isBefore, startOfDay } from 'date-fns'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

export function DashboardAgenda() {
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [pendingTasks, setPendingTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const orgId = pb.authStore.record?.active_organization
      const baseFilter = orgId ? `organization="${orgId}" && deleted_at=""` : 'deleted_at=""'

      const [allTasks, events] = await Promise.all([
        pb.collection('tasks').getFullList({ filter: baseFilter, expand: 'linked_lawsuit' }),
        pb
          .collection('agenda_events')
          .getFullList({ filter: baseFilter, expand: 'linked_lawsuit' }),
      ])

      const now = new Date()
      const pTasks = allTasks
        .filter((t) => t.status !== 'completed')
        .sort((a, b) => {
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        })
      setPendingTasks(pTasks)

      const uEvents = events
        .filter((e) => {
          const compareDate = e.end_date ? new Date(e.end_date) : new Date(e.start_date)
          return compareDate >= now
        })
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      setUpcomingEvents(uEvents)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('tasks', loadData)
  useRealtime('agenda_events', loadData)

  return (
    <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden h-full">
      <CardHeader className="pb-3 border-b bg-white shrink-0">
        <CardTitle className="text-lg flex items-center justify-between text-slate-800">
          <span className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" /> Agenda e Tarefas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        {loading ? (
          <div className="flex justify-center items-center h-full min-h-[300px]">
            <Loader2 className="animate-spin w-8 h-8 text-primary/50" />
          </div>
        ) : (
          <div className="p-4 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> Próximos Compromissos
                </h4>
                <Link
                  to="/intranet/agenda"
                  className="text-[10px] font-medium text-indigo-600 hover:underline"
                >
                  Ver tudo
                </Link>
              </div>
              <div className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-white p-3 rounded border border-dashed border-slate-200 text-center">
                    Nenhum compromisso futuro.
                  </p>
                ) : (
                  upcomingEvents.map((e) => (
                    <div
                      key={e.id}
                      className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm flex gap-3 relative overflow-hidden group hover:border-indigo-200 transition-colors"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold text-slate-800 truncate mb-1"
                          title={e.title}
                        >
                          {e.title}
                        </p>
                        <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-indigo-600">
                            {format(new Date(e.start_date), "dd/MM 'às' HH:mm")}
                          </span>
                          {e.expand?.linked_lawsuit && (
                            <span className="truncate text-slate-400">
                              Processo: {e.expand.linked_lawsuit.case_number || 'S/N'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tarefas Pendentes
                </h4>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {pendingTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {pendingTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-white p-3 rounded border border-dashed border-slate-200 text-center">
                    Nenhuma tarefa pendente.
                  </p>
                ) : (
                  pendingTasks.map((t) => {
                    const isDelayed =
                      t.due_date && isBefore(new Date(t.due_date), startOfDay(new Date()))
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'bg-white p-3 border rounded-lg shadow-sm flex gap-3 relative overflow-hidden group transition-colors',
                          isDelayed
                            ? 'border-red-200'
                            : 'border-slate-200 hover:border-emerald-200',
                        )}
                      >
                        <div
                          className={cn(
                            'absolute left-0 top-0 bottom-0 w-1',
                            t.priority === 'high'
                              ? 'bg-red-500'
                              : t.priority === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-blue-500',
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm font-bold truncate mb-1',
                              isDelayed ? 'text-red-700' : 'text-slate-800',
                            )}
                            title={t.title}
                          >
                            {t.title}
                          </p>
                          {t.due_date && (
                            <div
                              className={cn(
                                'text-[11px] font-semibold',
                                isDelayed ? 'text-red-600' : 'text-slate-500',
                              )}
                            >
                              Prazo: {format(new Date(t.due_date), 'dd/MM/yyyy')}{' '}
                              {t.is_all_day
                                ? '(Dia Inteiro)'
                                : format(new Date(t.due_date), 'HH:mm')}
                            </div>
                          )}{' '}
                          {t.expand?.linked_lawsuit && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              Processo: {t.expand.linked_lawsuit.case_number || 'S/N'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
