import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Calendar as CalendarIcon, Trash2, Edit2, Activity } from 'lucide-react'
import { getLawsuits, createLawsuit, updateLawsuit, deleteLawsuit } from '@/services/lawsuits'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

export default function ProcessManager() {
  const [processes, setProcesses] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [trackingLawsuit, setTrackingLawsuit] = useState<any>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setProcesses(await getLawsuits())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('lawsuits', loadData)

  const filtered = processes.filter(
    (p) =>
      (p.number || '').includes(searchTerm) ||
      (p.parties || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleOpenNew = () => {
    setEditingItem(null)
    setOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    try {
      if (editingItem) {
        await updateLawsuit(editingItem.id, data)
        toast({ title: 'Registro atualizado com sucesso' })
      } else {
        await createLawsuit(data)
        toast({ title: 'Registro cadastrado com sucesso' })
      }
      setOpen(false)
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteLawsuit(id)
    }
  }

  const handleAddLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const desc = fd.get('description') as string
    const newLog = { date: new Date().toISOString(), description: desc }
    const updatedLogs = [...(trackingLawsuit.trackingLogs || []), newLog]

    try {
      await updateLawsuit(trackingLawsuit.id, { trackingLogs: updatedLogs })
      setTrackingLawsuit({ ...trackingLawsuit, trackingLogs: updatedLogs })
      toast({ title: 'Andamento registrado' })
      e.currentTarget.reset()
    } catch (err) {
      toast({ title: 'Erro ao registrar andamento', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Processos e Serviços</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" /> Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
            </DialogHeader>
            <form
              key={editingItem?.id || 'new'}
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <Label>Tipo de Registro</Label>
                <Select name="entryType" defaultValue={editingItem?.entryType || 'Processo'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processo">Processo</SelectItem>
                    <SelectItem value="Serviço Jurídico">Serviço Jurídico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Número do Processo (Opcional p/ Serviços)</Label>
                <Input
                  name="number"
                  placeholder="0000000-00.0000.0.00.0000"
                  defaultValue={editingItem?.number}
                />
              </div>
              <div>
                <Label>Tribunal / Órgão</Label>
                <Input name="court" placeholder="Ex: TJ-RJ" defaultValue={editingItem?.court} />
              </div>
              <div>
                <Label>Status</Label>
                <Input
                  name="status"
                  placeholder="Ex: Aguardando Audiência"
                  defaultValue={editingItem?.status}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Partes (Cliente x Parte Contraria) / Título do Serviço</Label>
                <Input name="parties" required defaultValue={editingItem?.parties} />
              </div>
              <div>
                <Label>Próximo Prazo</Label>
                <Input
                  name="deadline"
                  type="date"
                  defaultValue={editingItem?.deadline?.split('T')[0]}
                />
              </div>
              <div>
                <Label>Termos Datajud / D.O. (Monitoramento)</Label>
                <Input
                  name="gazetteTerms"
                  placeholder="Ex: Termos de pesquisa"
                  defaultValue={editingItem?.gazetteTerms}
                />
              </div>
              <div className="md:col-span-2 mt-4">
                <Button type="submit" className="w-full">
                  Salvar Registro
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tracking Logs Dialog */}
      <Dialog open={!!trackingLawsuit} onOpenChange={(v) => !v && setTrackingLawsuit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Acompanhamento: {trackingLawsuit?.parties}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto space-y-3 p-2 bg-slate-50 border rounded-md">
              {!trackingLawsuit?.trackingLogs || trackingLawsuit.trackingLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum registro encontrado.
                </p>
              ) : (
                [...trackingLawsuit.trackingLogs].reverse().map((log: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded shadow-sm border text-sm">
                    <div className="text-xs text-primary font-bold mb-1">
                      {new Date(log.date).toLocaleString()}
                    </div>
                    <div>{log.description}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAddLog} className="flex gap-2">
              <Input
                name="description"
                placeholder="Adicionar novo andamento..."
                required
                className="flex-1"
              />
              <Button type="submit">Adicionar</Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <CardTitle>Meus Processos e Serviços</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nº ou parte..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identificação</TableHead>
                    <TableHead>Partes/Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium text-primary flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.entryType === 'Serviço Jurídico' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
                          >
                            {p.entryType === 'Serviço Jurídico' ? 'Serviço' : 'Processo'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{p.number || '-'}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={p.parties}>
                        {p.parties}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium whitespace-nowrap">
                          {p.status || 'Aberto'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Acompanhamento"
                          onClick={() => setTrackingLawsuit(p)}
                        >
                          <Activity className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" /> Próximos Prazos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...processes]
                  .filter((p) => p.deadline)
                  .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                  .slice(0, 5)
                  .map((p) => (
                    <div
                      key={`deadline-${p.id}`}
                      className="flex justify-between items-start p-3 border rounded-lg bg-slate-50"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-semibold text-sm text-primary line-clamp-1">
                          {p.parties}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {p.status}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded shrink-0">
                        {new Date(p.deadline).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
