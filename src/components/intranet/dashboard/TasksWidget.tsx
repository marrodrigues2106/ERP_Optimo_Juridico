import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTasks, createTask, updateTask, deleteTask } from '@/services/tasks'
import { getLegalCases } from '@/services/legal_cases'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, CheckCircle2, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TasksWidget() {
  const [tasks, setTasks] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [linkedLawsuit, setLinkedLawsuit] = useState('none')
  const [editingTask, setEditingTask] = useState<any>(null)

  const { toast } = useToast()
  const navigate = useNavigate()

  const load = async () => {
    try {
      setTasks(await getTasks())
      setCases(await getLegalCases())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
  }, [])
  useRealtime('tasks', load)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    try {
      await createTask({
        title,
        priority,
        status: 'todo',
        due_date: dueDate ? new Date(`${dueDate}T12:00:00Z`).toISOString() : null,
        linked_lawsuit: linkedLawsuit !== 'none' ? linkedLawsuit : null,
      })
      setTitle('')
      setDueDate('')
      setPriority('medium')
      setLinkedLawsuit('none')
      toast({ title: 'Tarefa adicionada' })
    } catch {
      toast({ title: 'Erro ao adicionar tarefa', variant: 'destructive' })
    }
  }

  const toggle = async (t: any) => {
    await updateTask(t.id, { status: t.status === 'todo' ? 'completed' : 'todo' })
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingTask) return
    const fd = new FormData(e.currentTarget)
    try {
      await updateTask(editingTask.id, {
        title: fd.get('title'),
        priority: fd.get('priority'),
        status: fd.get('status'),
        due_date: fd.get('due_date')
          ? new Date(`${fd.get('due_date')}T12:00:00Z`).toISOString()
          : null,
        linked_lawsuit: fd.get('linked_lawsuit') !== 'none' ? fd.get('linked_lawsuit') : null,
      })
      setEditingTask(null)
      toast({ title: 'Tarefa atualizada' })
    } catch {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' })
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm h-full flex flex-col bg-white">
      <CardHeader className="bg-white border-b py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="w-5 h-5 text-primary" /> Tarefas Prioritárias
          </CardTitle>
          <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">
            {tasks.filter((t) => t.status === 'todo').length} pendentes
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descreva a nova tarefa..."
                className="flex-1 bg-white text-sm h-9"
              />
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[100px] h-9 bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-32 bg-white text-xs h-8"
              />
              <Select value={linkedLawsuit} onValueChange={setLinkedLawsuit}>
                <SelectTrigger className="flex-1 h-8 bg-white text-xs">
                  <LinkIcon className="w-3 h-3 mr-2 text-slate-400" />
                  <SelectValue placeholder="Vincular processo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum vínculo</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.case_number || c.parties}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" className="shrink-0 h-8">
                <Plus className="w-4 h-4 mr-1" /> Criar
              </Button>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
              <CheckCircle2 className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm">Nenhuma tarefa encontrada.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map((t) => {
                const isLinked = !!t.expand?.linked_lawsuit
                return (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      if (
                        !(e.target as HTMLElement).closest('button') &&
                        !(e.target as HTMLElement).closest('[type="checkbox"]')
                      ) {
                        setEditingTask(t)
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded group border-b border-slate-100 last:border-0 transition-colors cursor-pointer',
                      t.status === 'completed'
                        ? 'bg-slate-50/50 opacity-60'
                        : 'bg-white hover:bg-slate-50',
                    )}
                  >
                    <Checkbox
                      className="h-4 w-4 rounded-sm shrink-0"
                      checked={t.status === 'completed'}
                      onCheckedChange={() => toggle(t)}
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span
                        className={cn(
                          'text-[13px] font-medium text-slate-700 truncate',
                          t.status === 'completed' && 'line-through text-slate-400',
                        )}
                      >
                        {t.title}
                      </span>
                      {isLinked && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[10px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded truncate max-w-[120px] hidden sm:inline-block"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/intranet/processos/${t.expand.linked_lawsuit.id}`)
                          }}
                        >
                          {t.expand.linked_lawsuit.case_number || 'Processo'}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.due_date && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(t.due_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      )}
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          t.priority === 'high'
                            ? 'bg-red-500'
                            : t.priority === 'medium'
                              ? 'bg-amber-400'
                              : 'bg-slate-300',
                        )}
                        title={`Prioridade: ${t.priority}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTask(t.id)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div>
                <Label>Título</Label>
                <Input name="title" defaultValue={editingTask.title} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Vencimento</Label>
                  <Input
                    name="due_date"
                    type="date"
                    defaultValue={editingTask.due_date ? editingTask.due_date.slice(0, 10) : ''}
                  />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select name="priority" defaultValue={editingTask.priority || 'medium'}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editingTask.status || 'todo'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Pendente</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Processo Vinculado</Label>
                  <Select name="linked_lawsuit" defaultValue={editingTask.linked_lawsuit || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum vínculo</SelectItem>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.case_number || c.parties}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Salvar Alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
