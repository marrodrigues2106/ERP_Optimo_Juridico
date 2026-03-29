import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Plus, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'
import { getLegalCases } from '@/services/legal_cases'

export default function AgendaManager() {
  const { toast } = useToast()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)

  const loadData = async () => {
    try {
      const res = await pb.collection('agenda_events').getFullList({ sort: 'event_date' })
      setEvents(res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    getLegalCases().then(setCases).catch(console.error)
  }, [])

  useRealtime('agenda_events', loadData)

  const eventsOnSelectedDate = events.filter((e) => {
    if (!date || !e.event_date) return false
    const ed = new Date(e.event_date)
    return (
      ed.getDate() === date.getDate() &&
      ed.getMonth() === date.getMonth() &&
      ed.getFullYear() === date.getFullYear()
    )
  })

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('agenda_events').delete(id)
      toast({ title: 'Evento excluído com sucesso.' })
    } catch (e) {
      toast({ title: 'Erro ao excluir evento', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Agenda Corporativa</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border shadow-sm">
          <CardHeader className="bg-slate-50/50 pb-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-slate-500" /> Calendário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex justify-center">
            <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="bg-slate-50/50 pb-4 border-b">
            <CardTitle className="text-lg">
              Eventos de {date ? format(date, 'dd/MM/yyyy') : 'Nenhuma data selecionada'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {eventsOnSelectedDate.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Nenhum compromisso agendado para este dia.</p>
              </div>
            ) : (
              eventsOnSelectedDate.map((ev) => (
                <div
                  key={ev.id}
                  className="flex justify-between items-start p-4 border rounded-lg shadow-sm bg-white group"
                >
                  <div>
                    <h4 className="font-bold text-slate-800">{ev.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-2">
                      <span className="flex items-center font-medium">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {new Date(ev.event_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {ev.type || 'Geral'}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-sm mt-3 text-slate-600 bg-slate-50 p-2 rounded">
                        {ev.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ev.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <EventFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        cases={cases}
        onSuccess={loadData}
        defaultDate={date}
      />
    </div>
  )
}

function EventFormModal({ open, onOpenChange, cases, onSuccess, defaultDate }: any) {
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      const dateTime = new Date(`${fd.get('date')}T${fd.get('time')}`).toISOString()

      await pb.collection('agenda_events').create({
        title: fd.get('title'),
        description: fd.get('description'),
        type: fd.get('type'),
        event_date: dateTime,
      })

      toast({ title: 'Evento agendado com sucesso.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro ao agendar', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Compromisso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label>Título / Assunto *</Label>
            <Input name="title" required placeholder="Ex: Reunião com Cliente X" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                name="date"
                required
                defaultValue={defaultDate ? format(defaultDate, 'yyyy-MM-dd') : ''}
              />
            </div>
            <div>
              <Label>Hora *</Label>
              <Input type="time" name="time" required defaultValue="09:00" />
            </div>
          </div>
          <div>
            <Label>Tipo de Evento</Label>
            <Select name="type" defaultValue="Reunião">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Reunião">Reunião</SelectItem>
                <SelectItem value="Audiência">Audiência</SelectItem>
                <SelectItem value="Prazo">Prazo Processual</SelectItem>
                <SelectItem value="Atendimento">Atendimento</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição / Notas</Label>
            <Input name="description" placeholder="Informações adicionais..." />
          </div>
          <Button type="submit" className="w-full mt-2">
            Agendar Evento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
