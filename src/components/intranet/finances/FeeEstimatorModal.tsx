import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getFinancesByLawsuit, createFinance } from '@/services/finances'
import { useToast } from '@/hooks/use-toast'
import { Calculator } from 'lucide-react'

export function FeeEstimatorModal({ open, onOpenChange, cases, defaultCaseId, onSuccess }: any) {
  const [caseId, setCaseId] = useState(defaultCaseId || '')
  const [margin, setMargin] = useState<number>(30)
  const [expenses, setExpenses] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const selectedCaseInfo = cases.find((c: any) => c.id === caseId)

  useEffect(() => {
    if (open && caseId) {
      getFinancesByLawsuit(caseId)
        .then((finances) => {
          const total = finances
            .filter((f: any) => f.type === 'outflow')
            .reduce((acc: number, f: any) => acc + f.amount, 0)
          setExpenses(total)
        })
        .catch(console.error)
    }
  }, [open, caseId])

  const duration = selectedCaseInfo?.estimated_duration || 0
  const unit = selectedCaseInfo?.duration_unit || 'meses'
  const fixedCostMonthly = selectedCaseInfo?.allocated_fixed_cost || 0

  const durationInMonths = unit === 'semanas' ? duration / 4 : duration
  const totalFixedCost = fixedCostMonthly * durationInMonths
  const totalCost = expenses + totalFixedCost
  const estimatedValue = totalCost * (1 + margin / 100)

  const handleCalculate = async () => {
    if (!caseId) {
      toast({ title: 'Selecione um processo', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const selectedCase = selectedCaseInfo
      const caseName = selectedCase?.case_number || selectedCase?.parties || 'Processo'

      await createFinance({
        type: 'inflow',
        description: `Honorários Estimados - ${caseName}`,
        amount: estimatedValue,
        status: 'estimado',
        linked_lawsuit: caseId,
        margin_applied: margin,
        date: new Date().toISOString(),
        frequency: 'única',
      })

      toast({ title: 'Honorários estimados com sucesso!' })
      onSuccess?.()
      onOpenChange(false)
    } catch (e) {
      toast({ title: 'Erro ao gerar estimativa', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Estimar Honorários
          </DialogTitle>
          <DialogDescription>
            Calcula os honorários sugeridos aplicando uma margem de lucro sobre o total de despesas
            (custos) vinculados ao processo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Processo Vinculado</Label>
            <Select value={caseId} onValueChange={setCaseId} disabled={!!defaultCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo..." />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number || c.parties}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border rounded-lg">
              <Label className="text-slate-500 text-xs uppercase">
                Previsão de duração do trabalho
              </Label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {duration} {unit}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <Label className="text-slate-500 text-xs uppercase">Custos Fixos</Label>
              <p className="text-lg font-bold text-red-600 mt-1">R$ {totalFixedCost.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <Label className="text-slate-500 text-xs uppercase">Despesas Variáveis</Label>
              <p className="text-lg font-bold text-red-600 mt-1">R$ {expenses.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-xs uppercase text-slate-500">Margem de Lucro (%)</Label>
              <Input
                type="number"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                min="0"
                className="mt-1 text-lg font-medium h-10"
              />
            </div>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Label className="text-primary/70 uppercase text-xs font-bold tracking-wider">
              Estimativa de Honorários
            </Label>
            <p className="text-3xl font-black text-primary mt-1">R$ {estimatedValue.toFixed(2)}</p>
          </div>
        </div>

        <Button onClick={handleCalculate} disabled={loading || !caseId} className="w-full">
          {loading ? 'Gerando...' : 'Registrar Estimativa de Receita'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
