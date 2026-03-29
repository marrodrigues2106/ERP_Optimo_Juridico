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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, ArrowUpRight, ArrowDownRight, Trash2, Edit2, Filter } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { getFinances, createFinance, updateFinance, deleteFinance } from '@/services/finances'
import { getLegalCases } from '@/services/legal_cases'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

const chartConfig = {
  income: { label: 'Receitas', color: 'hsl(var(--primary))' },
  expenses: { label: 'Despesas', color: 'hsl(var(--destructive))' },
}

export default function FinanceManager() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [lawsuitFilter, setLawsuitFilter] = useState('all')
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setTransactions(await getFinances())
      setCases(await getLegalCases())
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('finances', loadData)

  const handleOpenNew = () => {
    setEditingItem(null)
    setOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: any = Object.fromEntries(fd.entries())
    data.amount = parseFloat(data.amount)
    if (data.linked_lawsuit === 'none') data.linked_lawsuit = null

    try {
      if (editingItem) {
        await updateFinance(editingItem.id, data)
        toast({ title: 'Transação atualizada' })
      } else {
        await createFinance(data)
        toast({ title: 'Transação registrada' })
      }
      setOpen(false)
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      await deleteFinance(id)
    }
  }

  const filteredTransactions =
    lawsuitFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.linked_lawsuit === lawsuitFilter)

  const monthlyData = filteredTransactions.reduce((acc: any, t) => {
    const month = new Date(t.date).toLocaleString('default', { month: 'short' })
    if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 }
    if (t.type === 'inflow') acc[month].income += t.amount
    else acc[month].expenses += t.amount
    return acc
  }, {})
  const chartData = Object.values(monthlyData).slice(0, 5).reverse()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão Financeira</h2>
        <div className="flex items-center gap-3">
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

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenNew}>
                <Plus className="w-4 h-4 mr-2" /> Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
              </DialogHeader>
              <form key={editingItem?.id || 'new'} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Descrição</Label>
                  <Input
                    name="description"
                    required
                    placeholder="Ex: Honorários ABC"
                    defaultValue={editingItem?.description}
                  />
                </div>
                <div>
                  <Label>Processo Vinculado</Label>
                  <Select
                    name="linked_lawsuit"
                    defaultValue={editingItem?.linked_lawsuit || 'none'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um processo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum processo</SelectItem>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.case_number || c.parties}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select name="type" defaultValue={editingItem?.type || 'inflow'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inflow">Receita</SelectItem>
                        <SelectItem value="outflow">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingItem?.amount}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <Input
                      name="date"
                      type="date"
                      required
                      defaultValue={editingItem?.date?.split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input
                      name="status"
                      required
                      placeholder="Ex: Pago"
                      defaultValue={editingItem?.status}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Salvar Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Receitas vs Despesas{' '}
              {lawsuitFilter !== 'all' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">(Filtrado)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
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
            <CardTitle>Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 10).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell
                      className="font-medium flex flex-col gap-1 max-w-[150px] truncate"
                      title={t.description}
                    >
                      <div className="flex items-center gap-2">
                        {t.type === 'inflow' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="truncate">{t.description}</span>
                      </div>
                      {t.expand?.linked_lawsuit && (
                        <span className="text-[10px] text-slate-500 truncate ml-6">
                          Ref: {t.expand.linked_lawsuit.case_number || 'Processo vinculado'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${t.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      R$ {t.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
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
    </div>
  )
}
