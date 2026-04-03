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
import { Search, Plus, Trash2, Edit2, Eye, RefreshCw, Star, RotateCcw } from 'lucide-react'
import { getLegalCases, deleteLegalCase, updateLegalCase } from '@/services/legal_cases'
import { getClients } from '@/services/clients'
import { getCollaborators } from '@/services/collaborators'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { categorizeError, runDatajudSync } from '@/lib/datajud/sync'
import { CaseFormModal } from './cases/CaseFormModal'
import { Progress } from '@/components/ui/progress'
import pb from '@/lib/pocketbase/client'

export default function ProcessManager() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [cases, setCases] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  // Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFav, setFilterFav] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [tagsFilter, setTagsFilter] = useState<string[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<any>(null)
  const [deletingCase, setDeletingCase] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isBatchSyncing, setIsBatchSyncing] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)

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
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t: string) => tags.add(t))
      }
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
      if (deletingCase.lifecycle_status === 'Excluído') {
        await updateLegalCase(deletingCase.id, { deleted_at: new Date().toISOString() })
        toast({ title: 'Registro excluído permanentemente.' })
      } else {
        await updateLegalCase(deletingCase.id, { lifecycle_status: 'Excluído' })
        toast({ title: 'Registro movido para lixeira.' })
      }
    } catch (error) {
      const { category, message } = categorizeError(error)
      toast({
        title: `Falha na Exclusão (${category})`,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeletingCase(null)
      loadData()
    }
  }

  const handleSyncDatajud = async (c: any) => {
    setSyncingId(c.id)
    try {
      await runDatajudSync(c, () => {})
      toast({ title: 'Sincronização V2 processada.' })
    } catch (error: any) {
      const { category, message } = categorizeError(error)
      let finalMessage = message
      const errStr = String(error?.message || message || '')
      if (
        errStr.includes('permissão de leitura') ||
        errStr.includes('unauthorized') ||
        errStr.includes('403')
      ) {
        finalMessage = `A chave do DataJud não possui permissão de leitura para o tribunal selecionado.`
      }
      await updateLegalCase(c.id, { datajud_sync_status: 'Error' }).catch(() => null)
      toast({
        title: `Erro de Sincronização (${category})`,
        description: finalMessage,
        variant: 'destructive',
      })
    } finally {
      setSyncingId(null)
    }
  }

  const handleBatchSync = async () => {
    const activeCases = cases.filter((c) => c.lifecycle_status === 'Ativo' && c.type === 'Processo')
    if (activeCases.length === 0) return
    setIsBatchSyncing(true)
    setBatchTotal(activeCases.length)
    setBatchProgress(0)
    let success = 0
    let failed = 0
    for (const c of activeCases) {
      try {
        await pb.send(`/backend/v1/datajud/background-sync/${c.id}`, { method: 'POST' })
        success++
      } catch (err) {
        failed++
      }
      setBatchProgress((prev) => prev + 1)
    }
    toast({
      title: 'Sincronização em Lote Concluída',
      description: `${success} atualizados, ${failed} falharam.`,
    })
    setIsBatchSyncing(false)
    loadData()
  }

  const filteredCases = cases.filter((c) => {
    const term = searchTerm.toLowerCase()
    const matchSearch =
      (c.parties?.toLowerCase() || '').includes(term) || (c.case_number || '').includes(term)

    if (filterFav && !c.is_favorite) return false

    if (typeFilter.length > 0 && !typeFilter.includes(c.type)) return false

    const isExcluded = c.lifecycle_status === 'Excluído'
    if (statusFilter.length === 0) {
      if (isExcluded) return false
    } else {
      if (!statusFilter.includes(c.lifecycle_status)) return false
    }

    if (tagsFilter.length > 0) {
      const cTags = Array.isArray(c.tags) ? c.tags : []
      if (!tagsFilter.some((t) => cTags.includes(t))) return false
    }

    return matchSearch
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">
            Gestão de Casos e Serviços
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe todos os seus processos, prazos e serviços jurídicos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleBatchSync}
            disabled={isBatchSyncing}
            className="shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isBatchSyncing ? 'animate-spin' : ''}`} />
            {isBatchSyncing ? 'Sincronizando...' : 'Sincronizar DataJud'}
          </Button>
          <Button onClick={() => handleOpenForm()} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Novo Registro
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar */}
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

        {/* Main Content */}
        <div className="flex-1 w-full space-y-4">
          {isBatchSyncing && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex justify-between text-sm font-medium mb-2 text-primary">
                  <span>Sincronizando processos ativos no DataJud...</span>
                  <span>
                    {batchProgress} de {batchTotal}
                  </span>
                </div>
                <Progress
                  value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0}
                  className="h-2"
                />
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden border-slate-200/60 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white border-b border-slate-100 py-5">
              <CardTitle className="text-xl font-serif">Portfólio Ativo</CardTitle>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por partes ou número do processo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-50 border-transparent focus-visible:bg-white transition-colors"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 w-10"></TableHead>
                    <TableHead>Identificação & Partes</TableHead>
                    <TableHead>Fase / Prazo</TableHead>
                    <TableHead>Integração V2</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCases.map((c) => (
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
                          {Array.isArray(c.tags) && c.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {c.tags.map((t: string) => (
                                <span
                                  key={t}
                                  className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-200 font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
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
                                c.datajud_sync_status === 'Synced' ||
                                c.datajud_sync_status === 'Success'
                                  ? 'bg-emerald-500 hover:bg-emerald-600'
                                  : c.datajud_sync_status === 'Pending'
                                    ? 'bg-amber-500 hover:bg-amber-600'
                                    : c.datajud_sync_status === 'Error' ||
                                        c.datajud_sync_status === 'Sync Failed'
                                      ? 'bg-red-500 hover:bg-red-600'
                                      : 'bg-slate-300 hover:bg-slate-400'
                              }
                            >
                              {c.datajud_sync_status || 'Pendente'}
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
                              {c.type === 'Processo' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSyncDatajud(c)}
                                  disabled={syncingId === c.id}
                                  title="Sincronizar (V2)"
                                >
                                  <RefreshCw
                                    className={`w-4 h-4 text-blue-500 ${syncingId === c.id ? 'animate-spin' : ''}`}
                                  />
                                </Button>
                              )}
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
            <AlertDialogTitle>
              {deletingCase?.lifecycle_status === 'Excluído'
                ? 'Confirmação de Exclusão Permanente'
                : 'Mover para Lixeira'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCase?.lifecycle_status === 'Excluído' ? (
                <>
                  Você está prestes a excluir permanentemente{' '}
                  <strong>{deletingCase?.parties}</strong> e todas as suas movimentações em cascata.
                  Essa ação não pode ser desfeita.
                </>
              ) : (
                <>
                  Deseja mover <strong>{deletingCase?.parties}</strong> para a lixeira? Você poderá
                  restaurá-lo filtrando por "Excluído".
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting
                ? 'Processando...'
                : deletingCase?.lifecycle_status === 'Excluído'
                  ? 'Excluir Permanentemente'
                  : 'Mover para Lixeira'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
