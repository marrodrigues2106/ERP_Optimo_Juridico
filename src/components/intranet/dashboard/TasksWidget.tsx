import { useState, useEffect } from 'react'
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
  const { toast } = useToast()

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
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
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

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="bg-slate-50 border-b py-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Tarefas Prioritárias</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1"
            />
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-28">
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
              className="w-36"
            />
            <Select value={linkedLawsuit} onValueChange={setLinkedLawsuit}>
              <SelectTrigger className="flex-1">
                <LinkIcon className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Vincular a um processo..." />
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
            <Button type="submit" size="icon" className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </form>

        <div className="space-y-1 mt-4">
          {tasks.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhuma tarefa encontrada.
            </p>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'flex items-start gap-3 p-2 rounded-md group border border-transparent hover:border-slate-200 transition-colors',
                  t.status === 'completed' ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50',
                )}
              >
                <Checkbox
                  className="mt-1"
                  checked={t.status === 'completed'}
                  onCheckedChange={() => toggle(t)}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'text-sm font-medium block',
                      t.status === 'completed' && 'line-through text-muted-foreground',
                    )}
                  >
                    {t.title}
                  </span>
                  {t.expand?.linked_lawsuit && (
                    <span className="text-[10px] text-slate-500 flex items-center mt-1">
                      <LinkIcon className="w-3 h-3 mr-1" /> Ref:{' '}
                      {t.expand.linked_lawsuit.case_number || t.expand.linked_lawsuit.parties}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                      t.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : t.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                  {t.due_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0 mt-1"
                  onClick={() => deleteTask(t.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
