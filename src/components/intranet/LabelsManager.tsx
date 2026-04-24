import { useState, useEffect } from 'react'
import {
  getCaseLabels,
  createCaseLabel,
  updateCaseLabel,
  deleteCaseLabel,
} from '@/services/case_labels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Tags, Pencil, Trash2, Plus, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const COLORS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#facc15',
  '#a3e635',
  '#4ade80',
  '#34d399',
  '#2dd4bf',
  '#38bdf8',
  '#22d3ee',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#c084fc',
  '#e879f9',
  '#f472b6',
  '#fb7185',
  '#e2e8f0',
]

export default function LabelsManager() {
  const [labels, setLabels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState<any>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#e2e8f0')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const data = await getCaseLabels()
      setLabels(data)
    } catch (e) {
      toast({ title: 'Erro ao carregar etiquetas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('case_labels', () => {
    loadData()
  })

  const openNew = () => {
    setEditingLabel(null)
    setName('')
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)])
    setDialogOpen(true)
  }

  const openEdit = (l: any) => {
    setEditingLabel(l)
    setName(l.name)
    setColor(l.color || '#e2e8f0')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      if (editingLabel) {
        await updateCaseLabel(editingLabel.id, { name, color })
        toast({ title: 'Etiqueta atualizada' })
      } else {
        await createCaseLabel({ name, color })
        toast({ title: 'Etiqueta criada' })
      }
      setDialogOpen(false)
    } catch (e) {
      toast({ title: 'Erro ao salvar (verifique se o nome já existe)', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta etiqueta? Ela será removida de todos os processos.')) return
    try {
      await deleteCaseLabel(id)
      toast({ title: 'Etiqueta excluída' })
    } catch (e) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tags className="w-6 h-6 text-primary" />
            Gerenciar Etiquetas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Crie e edite as etiquetas usadas nos processos. As alterações afetam todos os registros
            vinculados.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Nova Etiqueta
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : labels.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhuma etiqueta cadastrada.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {labels.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm border border-black/10"
                      style={{ backgroundColor: l.color || '#e2e8f0' }}
                    />
                    <span className="font-medium text-slate-800">{l.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(l.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLabel ? 'Editar Etiqueta' : 'Nova Etiqueta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome da Etiqueta</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prioridade Alta"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="pt-4 flex justify-center">
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-sm text-slate-800 shadow-sm border"
                style={{ backgroundColor: color }}
              >
                <Tags className="w-3 h-3 mr-2 opacity-70" /> {name || 'Pré-visualização'}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting || !name.trim()}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
