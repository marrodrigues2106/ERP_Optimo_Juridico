import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { getFinances, deleteFinance, deleteRecurringFinances } from '@/services/finances'
import { getLegalCases } from '@/services/legal_cases'
import { getCaseEstimatesAll } from '@/services/case_estimates'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { TransactionFormModal } from './finances/TransactionFormModal'
import { FeeEstimatorModal } from './finances/FeeEstimatorModal'

const chartConfig = {
  income: { label: 'Receitas', color: 'hsl(var(--primary))' },
  expenses: { label: 'Despesas', color: 'hsl(var(--destructive))' },
}

export default function FinanceManager() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [estimates, setEstimates] = useState<any[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [lawsuitFilter, setLawsuitFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const [profitGroupBy, setProfitGroupBy] = useState('area')

  const loadData = async () => {
    setTransactions(await getFinances())
    setCases(await getLegalCases())
    setEstimates(await getCaseEstimatesAll())
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('finances', loadData)
  useRealtime('case_estimates', loadData)

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

  // Budgets calc for Alerts in the list
  const caseBudgets = cases.reduce(
    (acc, c) => {
      const cFinances = transactions.filter(
        (t) =>
          t.linked_lawsuit === c.id &&
          t.type === 'outflow' &&
          !['orçado', 'estimado'].includes(t.status),
      )
      const actual = cFinances.reduce((sum, t) => sum + t.amount, 0)
      acc[c.id] = { estimated: c.estimated_total_cost || 0, actual }
      return acc
    },
    {} as Record<string, any>,
  )

  const canSeeAlerts =
    (user && ['admin', 'manager', 'financial_user', 'coordinator'].includes(user.role)) ||
    user?.isAdmin

  // Profitability Dashboard Logic
  const profitabilityDataRaw = cases.map((c) => {
    const caseFinances = transactions.filter((f) => f.linked_lawsuit === c.id)
    const caseEstimates = estimates
      .filter((e) => e.case === c.id)
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    const latestEstimate = caseEstimates[0]

    const estimatedMargin = latestEstimate
      ? latestEstimate.estimated_fees - latestEstimate.total_estimated_costs
      : 0
    const realizedInflows = caseFinances
      .filter((f) => f.type === 'inflow' && ['recebida', 'realizada'].includes(f.status))
      .reduce((sum, f) => sum + f.amount, 0)
    const realizedOutflows = caseFinances
      .filter((f) => f.type === 'outflow' && ['pago', 'realizado'].includes(f.status))
      .reduce((sum, f) => sum + f.amount, 0)
    const realizedMargin = realizedInflows - realizedOutflows

    return {
      caseId: c.id,
      collaborator: c.expand?.responsible_collaborator?.name || 'Não atribuído',
      area: c.metadata?.action_class || c.type || 'Geral',
      estimatedMargin,
      realizedMargin,
    }
  })

  const profitAggregated = profitabilityDataRaw.reduce((acc: any, curr) => {
    const key = profitGroupBy === 'area' ? curr.area : curr.collaborator
    if (!acc[key]) acc[key] = { name: key, estimated: 0, realized: 0 }
    acc[key].estimated += curr.estimatedMargin
    acc[key].realized += curr.realizedMargin
    return acc
  }, {})

  const chartDataProfit = Object.values(profitAggregated).sort(
    (a: any, b: any) => b.realized - a.realized,
  )

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Gestão Financeira</h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe fluxo de caixa, rentabilidade e custos dos processos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setFeeModalOpen(true)}
            className="shadow-sm bg-white"
          >
            <Calculator className="w-4 h-4 mr-2" /> Precificação e Custos
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null)
              setFormOpen(true)
            }}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Transação
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full justify-start max-w-none bg-transparent p-0 border-b border-slate-200 rounded-none h-auto mb-6">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-6 pb-3 text-sm font-semibold transition-colors"
          >
            Visão Geral e Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger
            value="profit"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none px-6 pb-3 text-sm font-semibold transition-colors"
          >
            Dashboard de Rentabilidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8 space-y-8 outline-none">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
            <Select value={lawsuitFilter} onValueChange={setLawsuitFilter}>
              <SelectTrigger className="w-full md:w-[300px] bg-white">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filtrar por Processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Processos / Registros</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number || c.parties}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Fluxo de Caixa{' '}
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
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R${v / 1000}k`}
                    />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimas Movimentações</CardTitle>
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
                    {filteredTransactions.slice(0, 15).map((t) => {
                      const budget = t.linked_lawsuit ? caseBudgets[t.linked_lawsuit] : null
                      const isOverBudget =
                        budget && budget.estimated > 0 && budget.actual >= budget.estimated * 0.8
                      const isCritical =
                        budget && budget.estimated > 0 && budget.actual >= budget.estimated

                      return (
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
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] text-slate-500 truncate">
                                  Ref:{' '}
                                  {t.expand.linked_lawsuit.case_number ||
                                    t.expand.linked_lawsuit.parties}
                                </span>
                                {canSeeAlerts && isOverBudget && t.type === 'outflow' && (
                                  <AlertTriangle
                                    className={`w-3 h-3 ${isCritical ? 'text-red-500' : 'text-amber-500'}`}
                                    title="Custo do processo próximo ou acima do limite estimado"
                                  />
                                )}
                              </div>
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
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profit" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Margem de Contribuição e
                  Rentabilidade
                </CardTitle>
                <CardDescription>
                  Comparativo entre margem estimada vs. margem realizada (lucro real) por segmento.
                </CardDescription>
              </div>
              <Select value={profitGroupBy} onValueChange={setProfitGroupBy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Agrupar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Por Área / Espécie da Ação</SelectItem>
                  <SelectItem value="collaborator">Por Advogado Responsável</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDataProfit}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(v) => `R${v / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar
                      dataKey="estimated"
                      name="Margem Estimada"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="realized"
                      name="Margem Realizada"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TransactionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        cases={cases}
        editingItem={editingItem}
      />
      <FeeEstimatorModal
        open={feeModalOpen}
        onOpenChange={setFeeModalOpen}
        cases={cases}
        onSuccess={loadData}
      />

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
