import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, Briefcase, Plus, Link as LinkIcon, Trash2 } from 'lucide-react'

export default function CollaboratorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [collaborator, setCollaborator] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [allCases, setAllCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      const collab = await pb.collection('collaborators').getOne(id!)
      setCollaborator(collab)

      const casesRes = await pb.collection('legal_cases').getFullList({
        filter: `responsible_collaborator = "${id}"`,
        sort: '-created',
      })
      setCases(casesRes)

      const availableCases = await pb.collection('legal_cases').getFullList({
        filter: `responsible_collaborator != "${id}" || responsible_collaborator = null`,
        sort: '-created',
      })
      setAllCases(availableCases)
    } catch (err) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const handleAssignCase = async () => {
    if (!selectedCase) return
    setSaving(true)
    try {
      await pb.collection('legal_cases').update(selectedCase, {
        responsible_collaborator: id,
      })
      toast({ title: 'Processo atribuído com sucesso' })
      setIsAssignModalOpen(false)
      setSelectedCase('')
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao atribuir', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCase = async (caseId: string) => {
    try {
      await pb.collection('legal_cases').update(caseId, {
        responsible_collaborator: null,
      })
      toast({ title: 'Atribuição removida' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao remover atribuição', variant: 'destructive' })
    }
  }

  if (loading)
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  if (!collaborator) return <div className="p-12 text-center">Colaborador não encontrado.</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center gap-4 border-b pb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/intranet/team')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">{collaborator.name}</h1>
          <p className="text-slate-500">{collaborator.role}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Processos / Serviços Atribuídos</h2>
        <Button onClick={() => setIsAssignModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Atribuir Processo
        </Button>
      </div>

      <div className="grid gap-4">
        {cases.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex justify-between items-center p-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="font-bold">{c.title || c.case_number || 'Sem título'}</p>
                  <p className="text-sm text-slate-500">{c.parties}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() => handleRemoveCase(c.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {cases.length === 0 && (
          <div className="p-8 text-center text-slate-500 border rounded-xl border-dashed">
            Nenhum processo atribuído a este colaborador.
          </div>
        )}
      </div>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Processo/Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o Processo</Label>
              <Select value={selectedCase} onValueChange={setSelectedCase}>
                <SelectTrigger>
                  <SelectValue placeholder="Buscar processo..." />
                </SelectTrigger>
                <SelectContent>
                  {allCases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title
                        ? `${c.title} (${c.case_number || 'Sem Número'})`
                        : c.case_number || 'Sem Identificação'}
                    </SelectItem>
                  ))}
                  {allCases.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhum processo disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignCase} disabled={!selectedCase || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
