import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  Eye,
  Star,
  Wand2,
} from 'lucide-react'
import {
  getLawsuits,
  createLawsuit,
  updateLawsuit,
  deleteLawsuit,
  autofillLawsuit,
} from '@/services/lawsuits'
import { getClients } from '@/services/clients'
import { getCollaborators } from '@/services/collaborators'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function ProcessManager() {
  const navigate = useNavigate()
  const [processes, setProcesses] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [autofillLoading, setAutofillLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setProcesses(await getLawsuits())
    } catch (e) {
      console.error(e)
    }
  }

  const loadRelations = async () => {
    try {
      setClients(await getClients())
      setCollaborators(await getCollaborators())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    loadRelations()
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

  const handleToggleFavorite = async (p: any) => {
    await updateLawsuit(p.id, { isFavorite: !p.isFavorite })
  }

  const handleAutofill = async () => {
    const numInput = document.querySelector('input[name="number"]') as HTMLInputElement
    const num = numInput?.value
    if (!num) return toast({ title: 'Digite um número de processo', variant: 'destructive' })

    setAutofillLoading(true)
    try {
      const res = await autofillLawsuit(num)

      if (res && res.success === false) {
        toast({
          title: 'Aviso',
          description: res.message || 'Processo não encontrado.',
          variant: 'default',
        })
        return
      }

      const data = res.data || res

      const form = document.querySelector('form') as HTMLFormElement
      if (form && data) {
        const fields = ['court', 'parties', 'class', 'subject', 'processType']
        fields.forEach((f) => {
          if (data[f]) {
            const el = form.querySelector(`input[name="${f}"]`) as HTMLInputElement
            if (el) el.value = data[f]
          }
        })
        if (data.distributionDate) {
          const el = form.querySelector('input[name="distributionDate"]') as HTMLInputElement
          if (el) el.value = data.distributionDate.substring(0, 10)
        }
      }
      toast({ title: 'Dados preenchidos via DataJud com sucesso' })
    } catch (e: any) {
      if (e.status === 401) {
        toast({ title: 'Erro de Autenticação na API', variant: 'destructive' })
      } else {
        toast({ title: 'Erro de rede ou falha ao consultar o DataJud', variant: 'destructive' })
      }
    } finally {
      setAutofillLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    if (!data.client || data.client === 'none') delete data.client
    if (!data.collaborator || data.collaborator === 'none') delete data.collaborator

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

  const handleDeleteClick = (p: any) => {
    setDeleteConfirmItem(p)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return
    const id = deleteConfirmItem.id
    setDeletingId(id)
    try {
      await deleteLawsuit(id)
      setProcesses((prev) => prev.filter((p) => p.id !== id))
      toast({ title: 'Registro excluído com sucesso' })
      setDeleteConfirmItem(null)
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({
        title: 'Erro ao excluir',
        description:
          getErrorMessage(error) ||
          'Ocorreu um erro ao excluir o processo. Verifique as dependências.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="flex gap-2 mt-1">
                  <Input
                    name="number"
                    placeholder="0000000-00.0000.0.00.0000"
                    defaultValue={editingItem?.number}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAutofill}
                    disabled={autofillLoading}
                  >
                    <Wand2 className={`w-4 h-4 mr-2 ${autofillLoading ? 'animate-spin' : ''}`} />
                    Auto-Preencher
                  </Button>
                </div>
              </div>
              <div>
                <Label>Tribunal / Órgão</Label>
                <Input name="court" placeholder="Ex: TJ-RJ" defaultValue={editingItem?.court} />
              </div>
              <div>
                <Label>Fase/Status do Processo</Label>
                <Input
                  name="status"
                  placeholder="Ex: Aguardando Audiência"
                  defaultValue={editingItem?.status}
                />
              </div>
              <div>
                <Label>Status de Acompanhamento</Label>
                <Select
                  name="lifecycle_status"
                  defaultValue={editingItem?.lifecycle_status || 'Acompanhado'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Acompanhado">Acompanhado (Ativo)</SelectItem>
                    <SelectItem value="Arquivado">Arquivado (Inativo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fonte de Monitoramento</Label>
                <Select name="trackingSource" defaultValue={editingItem?.trackingSource || 'Ambos'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ambos">Ambos (DataJud + DOU)</SelectItem>
                    <SelectItem value="Tribunais">Apenas Tribunais</SelectItem>
                    <SelectItem value="Diários Oficiais">Apenas Diários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Partes (Cliente x Parte Contraria) / Título do Serviço</Label>
                <Input name="parties" required defaultValue={editingItem?.parties} />
              </div>

              <div>
                <Label>Cliente Vinculado</Label>
                <Select name="client" defaultValue={editingItem?.client || 'none'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Membro Responsável</Label>
                <Select name="collaborator" defaultValue={editingItem?.collaborator || 'none'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="md:col-span-2 pt-2 border-t mt-2">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Dados Estruturados (DataJud)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Classe Processual</Label>
                    <Input
                      name="class"
                      placeholder="Ex: Procedimento Comum Cível"
                      defaultValue={editingItem?.class}
                    />
                  </div>
                  <div>
                    <Label>Assunto Principal</Label>
                    <Input
                      name="subject"
                      placeholder="Ex: Indenização por Dano Moral"
                      defaultValue={editingItem?.subject}
                    />
                  </div>
                  <div>
                    <Label>Formato / Tipo</Label>
                    <Input
                      name="processType"
                      placeholder="Ex: Digital"
                      defaultValue={editingItem?.processType}
                    />
                  </div>
                  <div>
                    <Label>Data de Distribuição</Label>
                    <Input
                      type="date"
                      name="distributionDate"
                      defaultValue={
                        editingItem?.distributionDate
                          ? editingItem.distributionDate.substring(0, 10)
                          : ''
                      }
                    />
                  </div>
                </div>
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
                          <button
                            onClick={() => handleToggleFavorite(p)}
                            className="text-amber-400 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-4 h-4 ${p.isFavorite ? 'fill-current' : 'text-slate-300'}`}
                            />
                          </button>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.entryType === 'Serviço Jurídico' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
                          >
                            {p.entryType === 'Serviço Jurídico' ? 'Serviço' : 'Processo'}
                          </span>
                          {p.lifecycle_status === 'Arquivado' && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              Arquivado
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 ml-6">
                          {p.number || '-'}
                        </div>
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
                          title="Detalhes do Processo"
                          onClick={() => navigate(`/intranet/processos/${p.id}`)}
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(p)}
                          disabled={deletingId === p.id}
                        >
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(p)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? (
                            <div className="w-4 h-4 rounded-full border-2 border-destructive border-t-transparent animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <AlertDialog
          open={!!deleteConfirmItem}
          onOpenChange={(open) => !open && !deletingId && setDeleteConfirmItem(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deseja realmente excluir este processo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita e removerá todos os históricos vinculados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirmDelete()
                }}
                disabled={!!deletingId}
              >
                {deletingId ? 'Excluindo...' : 'Excluir'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                      className="flex justify-between items-start p-3 border rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => navigate(`/intranet/processos/${p.id}`)}
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
