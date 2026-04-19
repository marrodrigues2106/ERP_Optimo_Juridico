import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Filter,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  AlertTriangle,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

const chartConfig = {
  income: { label: 'Receitas', color: 'hsl(var(--primary))' },
  expenses: { label: 'Despesas', color: 'hsl(var(--destructive))' },
}

export function FinanceOverviewTab({ transactions, cases, user, onEdit, onDelete }: any) {
  const [lawsuitFilter, setLawsuitFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filteredTransactions =
    lawsuitFilter === 'all'
      ? transactions
      : transactions.filter((t: any) => t.linked_lawsuit === lawsuitFilter)

  const paginatedTransactions = filteredTransactions.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.ceil(filteredTransactions.length / perPage) || 1

  const monthlyData = filteredTransactions.reduce((acc: any, t: any) => {
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

  const caseBudgets = cases.reduce((acc: any, c: any) => {
    const cFinances = transactions.filter(
      (t: any) =>
        t.linked_lawsuit === c.id &&
        t.type === 'outflow' &&
        !['orçado', 'estimado'].includes(t.status),
    )
    const actual = cFinances.reduce((sum: number, t: any) => sum + t.amount, 0)
    acc[c.id] = { estimated: c.estimated_total_cost || 0, actual }
    return acc
  }, {})

  const canSeeAlerts =
    user?.isAdmin || ['admin', 'manager', 'financial_user', 'coordinator'].includes(user?.role)
  const activeCasesCount = cases.filter((c: any) => c.lifecycle_status === 'Ativo').length || 1

  const fixedCategories = [
    'P20.01.00001',
    'P10.01.00001',
    'P10.01.00002',
    'P10.01.00003',
    'P10.01.00004',
    'P10.01.00007',
    'P10.01.00008',
    'P10.01.00009',
    'P10.01.00011',
    'P10.01.00012',
    'P10.01.00013',
    'P10.01.00014',
    'P10.01.00015',
    'P10.01.00016',
    'P10.01.00017',
    'P10.01.00018',
    'P10.01.00019',
    'P10.01.00020',
    'P10.01.00021',
    'P11.01.00001',
    'P11.01.00002',
    'P11.01.00003',
    'P11.01.00004',
    'P11.01.00005',
    'P11.01.00006',
    'P11.01.00008',
    'P11.01.00009',
    'P11.01.00011',
    'P11.01.00013',
    'P11.01.00014',
  ]
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const totalFixedExpensesLast12m = transactions
    .filter(
      (t: any) =>
        t.type === 'outflow' &&
        new Date(t.date) >= oneYearAgo &&
        fixedCategories.includes(t.category_code),
    )
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const monthlyFixedCostAvg = totalFixedExpensesLast12m / 12
  const selectedCase = cases.find((c: any) => c.id === lawsuitFilter)
  const allocated =
    lawsuitFilter !== 'all' && selectedCase ? selectedCase.allocated_fixed_cost || 0 : 0
  const fixedCostPerProcess = monthlyFixedCostAvg / activeCasesCount + allocated

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Custo Fixo Mensal / Processo
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Rateio de custos fixos + alocação específica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">
              R$ {fixedCostPerProcess.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <strong>Base Média:</strong> R$ {(monthlyFixedCostAvg / activeCasesCount).toFixed(2)}
            </p>
            {lawsuitFilter !== 'all' && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <strong>Alocado (Processo):</strong> R$ {allocated.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex flex-col md:flex-row gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-700 mb-1">Filtrar Movimentações</h4>
            <p className="text-xs text-slate-500">Selecione um processo específico.</p>
          </div>
          <Select
            value={lawsuitFilter}
            onValueChange={(v) => {
              setLawsuitFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:w-[300px] bg-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filtrar por Processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Processos</SelectItem>
              {cases.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.parties || c.description || c.case_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart data={chartData as any[]}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R${v / 1000}k`} />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="px-0 flex-1 flex flex-col">
            <div className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Descrição</TableHead>
                    <TableHead>Valor / Data</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((t: any) => {
                    const budget = t.linked_lawsuit ? caseBudgets[t.linked_lawsuit] : null
                    const isOver =
                      budget && budget.estimated > 0 && budget.actual >= budget.estimated * 0.8
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
                              <Repeat className="w-3 h-3 text-blue-500 shrink-0" />
                            )}
                          </div>
                          {t.expand?.linked_lawsuit && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] text-slate-500 truncate">
                                Ref:{' '}
                                {t.expand.linked_lawsuit.parties ||
                                  t.expand.linked_lawsuit.description ||
                                  t.expand.linked_lawsuit.case_number}
                              </span>
                              {canSeeAlerts && isOver && t.type === 'outflow' && (
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
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
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(t)}>
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(t)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="py-4 px-6 mt-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.max(1, p - 1))
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm text-slate-500 mx-4">
                      Página {page} de {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.min(totalPages, p + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
