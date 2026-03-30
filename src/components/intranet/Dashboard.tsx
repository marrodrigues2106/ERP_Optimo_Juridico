import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Bell,
  UserPlus,
  CheckCircle2,
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { format, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PublicationCard } from './cases/PublicationCard'
import { EventFormModal } from './cases/EventFormModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([])
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [publications, setPublications] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  const today = new Date()

  const loadData = async () => {
    try {
      const [fetchedTasks, fetchedPubs, fetchedEvents] = await Promise.all([
        pb.collection('tasks').getFullList({ filter: 'status = "todo"', sort: 'due_date' }),
        pb
          .collection('gazette_publications')
          .getFullList({ filter: 'is_read = false', sort: '-created' }),
        pb.collection('agenda_events').getFullList({
          filter: `start_date >= "${startOfDay(today).toISOString()}"`,
          sort: 'start_date',
        }),
      ])
      setTasks(fetchedTasks)
      setPublications(fetchedPubs)
      setEvents(fetchedEvents)
    } catch (e) {
      console.error('Error loading dashboard data', e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('tasks', loadData)
  useRealtime('gazette_publications', loadData)
  useRealtime('agenda_events', loadData)

  const toggleTask = async (id: string, currentStatus: string) => {
    try {
      await pb
        .collection('tasks')
        .update(id, { status: currentStatus === 'todo' ? 'completed' : 'todo' })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] -m-4 lg:-m-8 bg-white text-slate-800 font-sans shadow-sm rounded-xl overflow-hidden border border-slate-200/60">
      {/* Left Sidebar Filters */}
      <div className="w-72 border-r border-slate-200 p-8 flex flex-col gap-8 shrink-0 hidden xl:flex bg-slate-50/50">
        <h2 className="text-lg font-bold tracking-tight text-slate-800 uppercase">VISÃO GERAL</h2>

        <div>
          <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-wider">
            Filtros
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center text-sm font-semibold text-slate-800 mb-3">
                <UserPlus className="w-4 h-4 mr-2" /> Por colaborador
              </div>
              <ul className="space-y-3 pl-6">
                <li className="text-sm font-semibold flex items-center gap-2 text-slate-900 cursor-pointer">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Todos do escritório
                </li>
                <li className="text-sm text-slate-600 hover:text-slate-900 cursor-pointer transition-colors">
                  Somente você
                </li>
                <li className="text-sm text-slate-600 hover:text-slate-900 cursor-pointer transition-colors">
                  Equipe Jurídica
                </li>
              </ul>
            </div>
          </div>
          <button className="text-primary text-xs font-bold mt-6 hover:underline transition-all uppercase tracking-wide">
            Convidar Colaborador
          </button>
        </div>
      </div>

      {/* Center Feed */}
      <div className="flex-1 p-8 md:p-12 overflow-auto bg-white">
        <Tabs defaultValue="hoje" className="w-full max-w-4xl mx-auto">
          <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none p-0 h-auto mb-8">
            <TabsTrigger
              value="hoje"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-2 pb-4 text-lg font-serif font-bold text-slate-500 transition-colors"
            >
              Visão Geral do Dia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="outline-none space-y-8">
            <div className="flex items-center gap-3 text-slate-800 font-semibold text-lg border-l-4 border-primary pl-3">
              <Bell className="w-5 h-5 text-primary" />
              Publicações e Andamentos não lidos
            </div>

            <div className="space-y-5">
              {publications.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border border-dashed rounded-lg bg-white">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>Tudo limpo! Nenhuma publicação não lida.</p>
                </div>
              ) : (
                publications.map((pub) => <PublicationCard key={pub.id} item={pub} />)
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Column - Agenda & Tasks */}
      <div className="w-96 border-l border-slate-200 p-8 flex flex-col gap-10 shrink-0 bg-slate-50/50 overflow-y-auto hidden md:flex">
        {/* Date Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-light text-slate-800 tracking-tighter">
              {format(today, 'dd')}
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-medium text-slate-700 leading-none capitalize">
                {format(today, 'MMMM', { locale: ptBR })}
              </span>
              <span className="text-sm text-slate-500 lowercase">
                {format(today, 'EEEE', { locale: ptBR })}
              </span>
            </div>
          </div>
          <div className="flex gap-0.5 text-slate-400">
            <button
              onClick={() => setEventModalOpen(true)}
              className="p-1 bg-slate-100 hover:bg-primary hover:text-white rounded transition-colors text-slate-600 mx-1"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Agenda Events */}
        <div>
          {events.length === 0 ? (
            <div className="text-center py-10 rounded-lg text-slate-500 flex flex-col items-center">
              <CalendarIcon className="w-10 h-10 mb-3 text-blue-100" />
              <p className="text-sm">Você não tem nenhum compromisso para essa data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className="p-3 border border-slate-100 rounded-md text-sm shadow-sm"
                >
                  <p className="font-semibold text-slate-800">{e.title}</p>
                  <p className="text-slate-500 text-xs mt-1 font-medium">
                    {new Date(e.start_date).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Tarefas ({tasks.length})
            </div>
            <button
              onClick={() => setTaskModalOpen(true)}
              className="p-1 bg-slate-100 hover:bg-primary hover:text-white rounded transition-colors text-slate-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa pendente.</p>
            ) : (
              tasks.map((task) => {
                const isOverdue =
                  task.due_date && isBefore(new Date(task.due_date), startOfDay(today))
                return (
                  <div key={task.id} className="flex items-start gap-3 group">
                    <Checkbox
                      className="mt-0.5 border-slate-300"
                      checked={task.status === 'completed'}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium text-slate-800 leading-snug',
                          task.status === 'completed' && 'line-through text-slate-400',
                        )}
                      >
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p
                          className={cn(
                            'text-xs mt-1 font-medium',
                            isOverdue && task.status !== 'completed'
                              ? 'text-red-500'
                              : 'text-slate-400',
                          )}
                        >
                          {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <EventFormModal open={eventModalOpen} onOpenChange={setEventModalOpen} onSuccess={loadData} />

      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa Rápida</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              await pb
                .collection('tasks')
                .create({ title: fd.get('title'), status: 'todo', priority: 'medium' })
              setTaskModalOpen(false)
              loadData()
            }}
          >
            <Input name="title" placeholder="Descreva a tarefa..." required autoFocus />
            <Button type="submit" className="w-full">
              Criar Tarefa
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
