import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
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
import { createCaseEstimate } from '@/services/case_estimates'
import { updateLegalCase } from '@/services/legal_cases'
import { useToast } from '@/hooks/use-toast'
import { Calculator } from 'lucide-react'

export function FeeEstimatorModal({ open, onOpenChange, cases, defaultCaseId, onSuccess }: any) {
  const [caseId, setCaseId] = useState(defaultCaseId || '')
  const [margin, setMargin] = useState<number>(30)
  const [expenses, setExpenses] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [activeCases, setActiveCases] = useState(1)
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState(0)

  const selectedCaseInfo = cases.find((c: any) => c.id === caseId)

  useEffect(() => {
    if (open && caseId) {
      getFinancesByLawsuit(caseId)
        .then((finances) => {
          const total = finances
            .filter((f: any) => f.type === 'outflow' && !['estimado', 'orçado'].includes(f.status))
            .reduce((acc: number, f: any) => acc + f.amount, 0)
          setExpenses(total)
        })
        .catch(console.error)
    }
  }, [open, caseId])

  useEffect(() => {
    if (open) {
      pb.collection('legal_cases')
        .getList(1, 1, { filter: "lifecycle_status='Ativo'" })
        .then((r) => setActiveCases(r.totalItems > 0 ? r.totalItems : 1))
        .catch(() => {})

      pb.collection('finances')
        .getFullList({ filter: "type='outflow'" })
        .then((r) => {
          let total = 0
          r.forEach((f) => {
            if (f.frequency === 'mensal') total += f.amount
            if (f.frequency === 'semanal') total += f.amount * 4.33
            if (f.frequency === 'quinzenal') total += f.amount * 2.16
          })
          setMonthlyFixedCosts(total)
        })
        .catch(() => {})
    }
  }, [open])

  const duration = selectedCaseInfo?.estimated_duration || 0
  const unit = selectedCaseInfo?.duration_unit || 'meses'
  const durationInMonths = unit === 'semanas' ? duration / 4 : duration

  const fixedCostMonthly = monthlyFixedCosts / activeCases
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

      await createCaseEstimate({
        case: caseId,
        estimated_fees: estimatedValue,
        total_estimated_costs: totalCost,
        margin_applied: margin,
        estimated_duration: duration,
        duration_unit: unit,
        weighted_fixed_cost_applied: totalFixedCost,
      })

      await updateLegalCase(caseId, { estimated_total_cost: totalCost })

      toast({ title: 'Honorários estimados e registrados no histórico com sucesso!' })
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Precificação e Estimativa de Honorários
          </DialogTitle>
          <DialogDescription>
            Calcula os honorários sugeridos aplicando uma margem de lucro sobre as despesas
            variáveis do caso mais o rateio de custos fixos do escritório.
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
              <Label className="text-slate-500 text-xs uppercase">Duração Estimada</Label>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {duration} {unit}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <Label className="text-slate-500 text-xs uppercase">Despesas Variáveis Atuais</Label>
              <p className="text-lg font-bold text-red-600 mt-1">R$ {expenses.toFixed(2)}</p>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-dashed space-y-1.5">
            <p className="font-bold text-slate-700 mb-1">
              Cálculo de Custos Fixos Ponderados (Overhead)
            </p>
            <p className="flex justify-between">
              <span>Custos Fixos Mensais do Escritório:</span>
              <span className="font-mono">R$ {monthlyFixedCosts.toFixed(2)}</span>
            </p>
            <p className="flex justify-between">
              <span>Processos Ativos:</span>
              <span className="font-mono">{activeCases}</span>
            </p>
            <p className="flex justify-between">
              <span>Custo Base (Processo/Mês):</span>
              <span className="font-mono">R$ {fixedCostMonthly.toFixed(2)}</span>
            </p>
            <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-bold text-slate-800">
              <span>Overhead Alocado ({durationInMonths.toFixed(1)} meses):</span>
              <span className="font-mono text-red-600">R$ {totalFixedCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <Label className="text-xs uppercase text-slate-500 mb-2 block">
                Custo Total Estimado
              </Label>
              <p className="text-xl font-bold text-red-600">R$ {totalCost.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-xs uppercase text-slate-500">
                Margem de Lucro Desejada (%)
              </Label>
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
              Estimativa Final de Honorários
            </Label>
            <p className="text-3xl font-black text-primary mt-1">R$ {estimatedValue.toFixed(2)}</p>
          </div>
        </div>

        <Button onClick={handleCalculate} disabled={loading || !caseId} className="w-full">
          {loading ? 'Gerando...' : 'Registrar Estimativa e Atualizar Histórico'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
