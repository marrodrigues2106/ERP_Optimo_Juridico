import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Trash2, Edit2, Eye, Star, RotateCcw, RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { getLegalCases, deleteLegalCase, updateLegalCase } from '@/services/legal_cases'
import { getClients } from '@/services/clients'
import { getCollaborators } from '@/services/collaborators'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { CaseFormModal } from './cases/CaseFormModal'

export default function ProcessManager() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [cases, setCases] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_desc')
  const [filterFav, setFilterFav] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [tagsFilter, setTagsFilter] = useState<string[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<any>(null)
  const [deletingCase, setDeletingCase] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
    try {
      const allCases = await getLegalCases()
      setCases(allCases.filter((c: any) => !c.deleted_at))
    } catch (e) {
      console.error('Error loading cases', e)
    }
  }

  useEffect(() => {
    loadData()
    getClients().then(setClients)
    getCollaborators().then(setCollaborators)
  }, [])

  useRealtime('legal_cases', loadData)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    cases.forEach((c) => {
      if (Array.isArray(c.tags)) c.tags.forEach((t: string) => tags.add(t))
    })
    return Array.from(tags).sort()
  }, [cases])

  const handleOpenForm = (c: any = null) => {
    setEditingCase(c)
    setFormOpen(true)
  }

  const handleToggleFavorite = async (c: any) => {
    await updateLegalCase(c.id, { is_favorite: !c.is_favorite })
    loadData()
  }

  const handleRestore = async (c: any) => {
    await updateLegalCase(c.id, { lifecycle_status: 'Ativo' })
    toast({ title: 'Caso restaurado para Ativo.' })
    loadData()
  }

  const handleConfirmDelete = async () => {
    if (!deletingCase) return
    setIsDeleting(true)
    try {
      await deleteLegalCase(deletingCase.id)
      toast({ title: 'Registro excluído permanentemente.' })
    } catch (error: any) {
      toast({
        title: 'Falha na Exclusão',
        description: error?.message || 'Erro ao excluir o registro.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeletingCase(null)
      loadData()
    }
  }

  const filteredCases = cases.filter((c) => {
    const term = searchTerm.toLowerCase()
    const matchSearch =
      (c.parties?.toLowerCase() || '').includes(term) || (c.case_number || '').includes(term)
    if (filterFav && !c.is_favorite) return false
    if (typeFilter.length > 0 && !typeFilter.includes(c.type)) return false
    const isExcluded = c.lifecycle_status === 'Excluído'
    if (statusFilter.length === 0 && isExcluded) return false
    else if (statusFilter.length > 0 && !statusFilter.includes(c.lifecycle_status)) return false
    if (tagsFilter.length > 0) {
      const cTags = Array.isArray(c.tags) ? c.tags : []
      if (!tagsFilter.some((t) => cTags.includes(t))) return false
    }
    return matchSearch
  })

  const sortedCases = useMemo(() => {
    const arr = [...filteredCases]
    arr.sort((a, b) => {
      if (sortBy === 'name_asc') return (a.parties || '').localeCompare(b.parties || '')
      if (sortBy === 'name_desc') return (b.parties || '').localeCompare(a.parties || '')
      if (sortBy === 'process_asc') return (a.case_number || '').localeCompare(b.case_number || '')
      if (sortBy === 'date_desc') {
        const da = a.distribution_date ? new Date(a.distribution_date).getTime() : 0
        const db = b.distribution_date ? new Date(b.distribution_date).getTime() : 0
        return db - da
      }
      return new Date(b.created).getTime() - new Date(a.created).getTime()
    })
    return arr
  }, [filteredCases, sortBy])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">
            Gestão de Casos e Serviços
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe todos os seus processos, prazos e serviços jurídicos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleOpenForm()} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Novo Registro
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <Card className="w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-6 border-none shadow-sm bg-white">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm">Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fav"
                checked={filterFav}
                onCheckedChange={(c) => setFilterFav(c === true)}
              />
              <label
                htmlFor="fav"
                className="text-sm font-medium flex items-center gap-1 cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Somente Favoritos
              </label>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">Tipo</h4>
              {['Processo', 'Serviço Jurídico'].map((t) => (
                <label key={t} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={typeFilter.includes(t)}
                    onCheckedChange={(c) =>
                      setTypeFilter((prev) => (c ? [...prev, t] : prev.filter((x) => x !== t)))
                    }
                  />
                  <span className="text-sm text-slate-600">{t}</span>
                </label>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">Ciclo de Vida</h4>
              {['Ativo', 'Arquivado', 'Suspenso', 'Excluído'].map((s) => (
                <label key={s} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={statusFilter.includes(s)}
                    onCheckedChange={(c) =>
                      setStatusFilter((prev) => (c ? [...prev, s] : prev.filter((x) => x !== s)))
                    }
                  />
                  <span className="text-sm text-slate-600">{s}</span>
                </label>
              ))}
            </div>
            {allTags.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Etiquetas</h4>
                <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                  {allTags.map((tag) => (
                    <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={tagsFilter.includes(tag)}
                        onCheckedChange={(c) =>
                          setTagsFilter((prev) =>
                            c ? [...prev, tag] : prev.filter((x) => x !== tag),
                          )
                        }
                      />
                      <span className="text-sm text-slate-600 truncate" title={tag}>
                        {tag}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex-1 w-full space-y-4">
          <Card className="overflow-hidden border-slate-200/60 shadow-sm">
            <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white border-b border-slate-100 py-5">
              <CardTitle className="text-xl font-serif">Portfólio Ativo</CardTitle>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_desc">Mais Recentes</SelectItem>
                    <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                    <SelectItem value="process_asc">Nº Processo</SelectItem>
                    <SelectItem value="date_desc">Data de Distribuição</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por partes ou número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-50"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 w-10"></TableHead>
                    <TableHead>Identificação & Partes</TableHead>
                    <TableHead>Fase / Prazo</TableHead>
                    <TableHead>Integração PJe</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedCases.map((c) => (
                      <TableRow
                        key={c.id}
                        className={
                          c.lifecycle_status === 'Excluído' ? 'opacity-60 bg-red-50/30' : ''
                        }
                      >
                        <TableCell className="pl-6">
                          <button
                            onClick={() => handleToggleFavorite(c)}
                            className="hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-4 h-4 ${c.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                            />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 line-clamp-1 text-base leading-snug">
                            {c.parties}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wide ${c.type === 'Serviço Jurídico' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
                            >
                              {c.type}
                            </span>
                            <span className="text-sm font-medium text-slate-500 font-mono">
                              {c.case_number || 'Sem número'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{c.status || 'Não informado'}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Status: {c.lifecycle_status}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.type === 'Processo' ? (
                            <Badge
                              className={
                                c.pje_sync_status === 'idle'
                                  ? 'bg-emerald-500'
                                  : c.pje_sync_status === 'pending' ||
                                      c.pje_sync_status === 'syncing'
                                    ? 'bg-amber-500'
                                    : c.pje_sync_status === 'error'
                                      ? 'bg-red-500'
                                      : 'bg-slate-300'
                              }
                            >
                              {c.pje_sync_status === 'idle'
                                ? 'Sincronizado'
                                : c.pje_sync_status === 'pending' || c.pje_sync_status === 'syncing'
                                  ? 'Sincronizando...'
                                  : c.pje_sync_status === 'error'
                                    ? 'Erro na Sync'
                                    : 'Pendente'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6 whitespace-nowrap">
                          {c.lifecycle_status === 'Excluído' ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRestore(c)}
                                title="Restaurar"
                              >
                                <RotateCcw className="w-4 h-4 text-emerald-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingCase(c)}
                                title="Excluir Permanentemente"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/intranet/processos/${c.id}`)}
                              >
                                <Eye className="w-4 h-4 text-emerald-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenForm(c)}>
                                <Edit2 className="w-4 h-4 text-slate-500" />
                              </Button>
                              {c.lifecycle_status === 'Arquivado' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingCase(c)}
                                  title="Excluir Permanentemente"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <CaseFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingCase={editingCase}
        clients={clients}
        collaborators={collaborators}
        onSuccess={() => {
          setFormOpen(false)
          loadData()
        }}
      />
      <AlertDialog open={!!deletingCase} onOpenChange={(open) => !open && setDeletingCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação de Exclusão Permanente</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente <strong>{deletingCase?.parties}</strong> e
              todas as suas movimentações. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Processando...' : 'Excluir Permanentemente'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
