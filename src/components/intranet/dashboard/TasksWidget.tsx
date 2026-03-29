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
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, CheckCircle2, Link as LinkIcon, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TasksWidget() {
  const [tasks, setTasks] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [linkedLawsuit, setLinkedLawsuit] = useState('none')
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

  const handleTaskClick = (e: React.MouseEvent, lawsuitId: string | undefined) => {
    // Only navigate if clicking on the task content, not the checkbox or delete button
    if (lawsuitId && !(e.target as HTMLElement).closest('button')) {
      navigate(`/intranet/processos/${lawsuitId}`)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm h-full flex flex-col bg-white">
      <CardHeader className="bg-white border-b py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Tarefas Prioritárias
          </CardTitle>
          <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">
            {tasks.filter((t) => t.status === 'todo').length} pendentes
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Form area */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descreva a nova tarefa..."
                className="flex-1 bg-white border-slate-200 text-sm h-9"
              />
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[100px] h-9 bg-white border-slate-200 text-sm">
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
                className="w-32 bg-white border-slate-200 text-xs h-8 text-slate-500"
              />
              <Select value={linkedLawsuit} onValueChange={setLinkedLawsuit}>
                <SelectTrigger className="flex-1 h-8 bg-white border-slate-200 text-xs text-slate-500">
                  <LinkIcon className="w-3 h-3 mr-2 text-slate-400" />
                  <SelectValue placeholder="Vincular a um processo..." />
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

        {/* List area */}
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
                    onClick={(e) => handleTaskClick(e, t.expand?.linked_lawsuit?.id)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg group border border-transparent transition-all',
                      t.status === 'completed'
                        ? 'bg-slate-50/50 opacity-60'
                        : 'bg-white hover:border-slate-200 hover:shadow-sm',
                      isLinked && t.status !== 'completed' ? 'cursor-pointer' : '',
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={t.status === 'completed'}
                      onCheckedChange={() => toggle(t)}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          'text-sm font-medium block text-slate-800',
                          t.status === 'completed' && 'line-through text-slate-500',
                        )}
                      >
                        {t.title}
                      </span>
                      {isLinked && (
                        <span className="text-[10px] text-primary hover:underline flex items-center mt-1 w-fit">
                          <LinkIcon className="w-3 h-3 mr-1" />
                          {t.expand.linked_lawsuit.case_number || t.expand.linked_lawsuit.parties}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider',
                          t.priority === 'high'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : t.priority === 'medium'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-slate-50 text-slate-600 border border-slate-100',
                        )}
                      >
                        {t.priority === 'high'
                          ? 'Alta'
                          : t.priority === 'medium'
                            ? 'Média'
                            : 'Baixa'}
                      </span>
                      {t.due_date && (
                        <span className="text-[10px] text-slate-500 flex items-center font-medium">
                          <CalendarClock className="w-3 h-3 mr-1" />
                          {new Date(t.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 mt-0.5 transition-opacity"
                      onClick={() => deleteTask(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
