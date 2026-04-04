import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createTask, updateTask } from '@/services/tasks'
import { CheckSquare, Calendar, Plus, Clock, CheckCircle2, Circle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export function ClientTasksTab({ clientId }: { clientId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [openTask, setOpenTask] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [t, e] = await Promise.all([
        pb.collection('tasks').getFullList({
          filter: `client = '${clientId}' && deleted_at = ""`,
          sort: 'status,due_date',
        }),
        pb.collection('agenda_events').getFullList({
          filter: `client = '${clientId}' && deleted_at = ""`,
          sort: '-start_date',
        }),
      ])
      setTasks(t)
      setEvents(e)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [clientId])

  const handleTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    data.client = clientId
    try {
      await createTask(data)
      toast({ title: 'Tarefa criada' })
      setOpenTask(false)
      loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed'
    try {
      await updateTask(task.id, { status: newStatus })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-primary" /> Tarefas
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setOpenTask(true)}>
              <Plus className="w-4 h-4" /> Nova
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {tasks.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">Nenhuma tarefa encontrada.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 border rounded-lg flex items-start gap-3 transition-colors ${t.status === 'completed' ? 'bg-slate-50 opacity-70' : 'bg-white hover:border-slate-300'}`}
                  >
                    <button
                      onClick={() => toggleTaskStatus(t)}
                      className="mt-0.5 text-slate-400 hover:text-primary"
                    >
                      {t.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}
                      >
                        {t.title}
                      </p>
                      {t.due_date && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> Vencimento:{' '}
                          {new Date(t.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b py-4">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" /> Eventos Vinculados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {events.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">Nenhum evento agendado.</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="p-3 border rounded-lg bg-white">
                    <p className="text-sm font-medium text-slate-800">{ev.title}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {ev.type}
                      </span>
                      {ev.start_date && (
                        <span className="text-xs text-slate-500">
                          {new Date(ev.start_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openTask} onOpenChange={setOpenTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4 pt-4">
            <div>
              <Label>Título *</Label>
              <Input name="title" required />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input name="description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Select name="priority" defaultValue="medium">
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
              <div>
                <Label>Data de Vencimento</Label>
                <Input type="date" name="due_date" />
              </div>
            </div>
            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Tarefa'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
