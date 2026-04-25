import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  LayoutDashboard,
  Clock,
  RefreshCw,
  CheckSquare,
  Calendar as CalendarIcon,
  Settings,
  GripHorizontal,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { EventFormModal } from './cases/EventFormModal'
import { MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function KanbanManager() {
  const { toast } = useToast()
  const [boards, setBoards] = useState<any[]>([])
  const [activeBoard, setActiveBoard] = useState<string>('')
  const [columns, setColumns] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  const [boardModal, setBoardModal] = useState(false)
  const [colModal, setColModal] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [colName, setColName] = useState('')

  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [defaultCol, setDefaultCol] = useState<string>('')

  const loadData = async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const bds = await pb
        .collection('kanban_boards')
        .getFullList({ filter: `organization = "${orgId}"`, sort: 'created' })
      setBoards(bds)
      if (bds.length > 0 && !activeBoard) setActiveBoard(bds[0].id)

      const cols = await pb
        .collection('kanban_columns')
        .getFullList({ filter: `organization = "${orgId}"`, sort: 'order_index' })
      setColumns(cols)

      const tsks = await pb.collection('tasks').getFullList({
        filter: `deleted_at = "" && kanban_column != ""`,
        expand: 'collaborator,linked_interaction',
      })
      setTasks(tsks)

      const evs = await pb.collection('agenda_events').getFullList({
        filter: `deleted_at = "" && kanban_column != ""`,
        expand: 'collaborator,linked_interaction',
      })
      setEvents(evs)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeBoard])
  useRealtime('kanban_boards', loadData)
  useRealtime('kanban_columns', loadData)
  useRealtime('tasks', loadData)
  useRealtime('agenda_events', loadData)

  const handleCreateBoard = async () => {
    try {
      await pb.collection('kanban_boards').create({
        name: boardName,
        visibility: 'Team',
        organization: pb.authStore.record?.active_organization,
      })
      setBoardName('')
      setBoardModal(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleCreateColumn = async () => {
    try {
      const bCols = columns.filter((c) => c.board === activeBoard)
      await pb.collection('kanban_columns').create({
        name: colName,
        board: activeBoard,
        order_index: bCols.length,
        organization: pb.authStore.record?.active_organization,
      })
      setColName('')
      setColModal(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleDragStart = (e: React.DragEvent, item: any, type: string) => {
    e.dataTransfer.setData('itemId', item.id)
    e.dataTransfer.setData('itemType', type)
  }

  const handleDrop = async (e: React.DragEvent, colId: string, colName: string) => {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('itemId')
    const itemType = e.dataTransfer.getData('itemType')
    if (!itemId) return
    try {
      const collection = itemType === 'task' ? 'tasks' : 'agenda_events'
      const payload: any = { kanban_column: colId }
      if (itemType === 'task' && colName.toLowerCase().includes('concluído')) {
        payload.status = 'completed'
      }
      await pb.collection(collection).update(itemId, payload)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const openForm = (colId: string) => {
    setEditingItem(null)
    setDefaultCol(colId)
    setEventModalOpen(true)
  }

  const activeCols = columns
    .filter((c) => c.board === activeBoard)
    .sort((a, b) => a.order_index - b.order_index)

  const renderCard = (item: any, type: string) => {
    const isOverdue =
      type === 'task' &&
      item.due_date &&
      new Date(item.due_date) < new Date() &&
      item.status !== 'completed'
    return (
      <Card
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item, type)}
        onClick={() => {
          setEditingItem({ ...item, isTask: type === 'task' })
          setEventModalOpen(true)
        }}
        className={`p-3 cursor-grab hover:shadow-md mb-3 border-l-4 ${type === 'task' ? (item.priority === 'high' ? 'border-l-red-500' : item.priority === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500') : 'border-l-indigo-500'}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            {type === 'task' ? (
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
            )}
            {item.title}
          </div>
          {item.is_recurring && (
            <RefreshCw className="w-3 h-3 text-emerald-500" title="Recorrente" />
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mt-2">
          <span
            className={`px-1.5 py-0.5 rounded flex items-center bg-slate-100 ${isOverdue ? 'bg-red-50 text-red-600 font-bold border border-red-200' : ''}`}
          >
            <Clock className="w-3 h-3 mr-1" />
            {new Date(type === 'task' ? item.due_date : item.start_date).toLocaleDateString(
              'pt-BR',
              { day: '2-digit', month: 'short' },
            )}
          </span>
          {item.expand?.collaborator && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[120px]">
              {item.expand.collaborator.name.split(' ')[0]}
            </span>
          )}
        </div>
        {item.linked_interaction && (
          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded w-fit border border-indigo-100">
            <MessageSquare className="w-3 h-3 text-indigo-500" /> Atendimento Vinculado
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6 flex flex-col h-full animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" /> Rotina de Atividades (Kanban)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie fluxos e etapas visuais.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={activeBoard} onValueChange={setActiveBoard}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um Quadro" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setBoardModal(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 flex items-start gap-4 min-h-[calc(100vh-250px)]">
        {activeCols.map((col) => (
          <div
            key={col.id}
            className="flex-shrink-0 w-80 bg-slate-50/80 rounded-xl p-3 flex flex-col border shadow-sm max-h-full"
            onDrop={(e) => handleDrop(e, col.id, col.name)}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between mb-4 px-1 group cursor-move">
              <h3 className="font-bold text-slate-700 text-sm flex items-center">
                <GripHorizontal className="w-4 h-4 mr-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                {col.name}
              </h3>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {tasks.filter((t) => t.kanban_column === col.id).length +
                  events.filter((e) => e.kanban_column === col.id).length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {tasks.filter((t) => t.kanban_column === col.id).map((t) => renderCard(t, 'task'))}
              {events.filter((e) => e.kanban_column === col.id).map((e) => renderCard(e, 'event'))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-2 justify-start text-slate-500 hover:text-primary"
              onClick={() => openForm(col.id)}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Cartão
            </Button>
          </div>
        ))}

        {activeBoard && (
          <Button
            variant="outline"
            className="flex-shrink-0 w-80 h-12 border-dashed bg-transparent"
            onClick={() => setColModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Coluna
          </Button>
        )}
      </div>

      <Dialog open={boardModal} onOpenChange={setBoardModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Quadro Kanban</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Quadro</Label>
              <Input
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Ex: Administrativo, Financeiro"
              />
            </div>
            <Button onClick={handleCreateBoard} className="w-full">
              Criar Quadro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={colModal} onOpenChange={setColModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome da Coluna</Label>
              <Input
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="Ex: Fazendo, Em Revisão"
              />
            </div>
            <Button onClick={handleCreateColumn} className="w-full">
              Criar Coluna
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {eventModalOpen && (
        <EventFormModal
          open={eventModalOpen}
          onOpenChange={setEventModalOpen}
          editingEvent={editingItem}
          defaultColumn={defaultCol}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
