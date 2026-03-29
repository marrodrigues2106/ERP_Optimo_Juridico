import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit2,
  Filter,
  Calculator,
  Repeat,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { getFinances, deleteFinance, deleteRecurringFinances } from '@/services/finances'
import { getLegalCases } from '@/services/legal_cases'
import { useRealtime } from '@/hooks/use-realtime'
import { TransactionFormModal } from './finances/TransactionFormModal'
import { FeeEstimatorModal } from './finances/FeeEstimatorModal'

const chartConfig = {
  income: { label: 'Receitas', color: 'hsl(var(--primary))' },
  expenses: { label: 'Despesas', color: 'hsl(var(--destructive))' },
}

export default function FinanceManager() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [lawsuitFilter, setLawsuitFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const loadData = async () => {
    setTransactions(await getFinances())
    setCases(await getLegalCases())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('finances', loadData)

  const filteredTransactions =
    lawsuitFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.linked_lawsuit === lawsuitFilter)

  const monthlyData = filteredTransactions.reduce((acc: any, t) => {
    const d = new Date(t.date)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    if (!acc[monthKey]) acc[monthKey] = { key: monthKey, month: monthLabel, income: 0, expenses: 0 }
    if (t.type === 'inflow') acc[monthKey].income += t.amount
    else acc[monthKey].expenses += t.amount
    return acc
  }, {})

  const chartData = Object.values(monthlyData)
    .sort((a: any, b: any) => a.key.localeCompare(b.key))
    .slice(-8)

  const handleConfirmDelete = async (allSeries: boolean) => {
    if (!deleteTarget) return
    if (allSeries && deleteTarget.recurrence_id) {
      await deleteRecurringFinances(deleteTarget.recurrence_id)
    } else {
      await deleteFinance(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão Financeira</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={lawsuitFilter} onValueChange={setLawsuitFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filtrar por Processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Registros</SelectItem>
              {cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_number || c.parties}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={() => setFeeModalOpen(true)}>
            <Calculator className="w-4 h-4 mr-2" /> Estimar Honorários
          </Button>

          <Button
            onClick={() => {
              setEditingItem(null)
              setFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Transação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Fluxo e Previsão{' '}
              {lawsuitFilter !== 'all' && (
                <span className="text-sm font-normal text-muted-foreground">(Filtrado)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart data={chartData as any[]}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v / 1000}k`} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Descrição</TableHead>
                  <TableHead>Valor / Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 15).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-6 font-medium max-w-[150px]">
                      <div className="flex items-center gap-2 mb-1">
                        {t.type === 'inflow' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="truncate">{t.description}</span>
                        {t.recurrence_id && (
                          <Repeat
                            className="w-3 h-3 text-blue-500 shrink-0"
                            title={`Recorrência: ${t.frequency}`}
                          />
                        )}
                      </div>
                      {t.expand?.linked_lawsuit && (
                        <span className="text-[10px] text-slate-500 truncate block">
                          Ref: {t.expand.linked_lawsuit.case_number || 'Processo'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${t.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      R$ {t.amount.toFixed(2)}
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 tracking-wider">
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(t)
                          setFormOpen(true)
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(t)}>
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

      <TransactionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        cases={cases}
        editingItem={editingItem}
      />
      <FeeEstimatorModal open={feeModalOpen} onOpenChange={setFeeModalOpen} cases={cases} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Transação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {deleteTarget?.recurrence_id
              ? 'Esta transação faz parte de uma série recorrente (gerada automaticamente). O que deseja excluir?'
              : 'Tem certeza que deseja excluir esta transação permanentemente?'}
          </p>
          <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <Button variant="outline" className="w-full" onClick={() => handleConfirmDelete(false)}>
              {deleteTarget?.recurrence_id
                ? 'Excluir Apenas Esta Transação'
                : 'Sim, Excluir Transação'}
            </Button>
            {deleteTarget?.recurrence_id && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleConfirmDelete(true)}
              >
                Excluir Toda a Série Recorrente
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
