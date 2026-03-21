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
import { Plus, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { getFinances, createFinance, deleteFinance } from '@/services/finances'
import { useRealtime } from '@/hooks/use-realtime'

const chartConfig = {
  income: { label: 'Receitas', color: 'hsl(var(--primary))' },
  expenses: { label: 'Despesas', color: 'hsl(var(--destructive))' },
}

export default function FinanceManager() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  const loadData = async () => {
    try {
      setTransactions(await getFinances())
    } catch (e) {}
  }
  useEffect(() => {
    loadData()
  }, [])
  useRealtime('finances', loadData)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    data.amount = parseFloat(data.amount as string) as any
    await createFinance(data)
    setOpen(false)
  }

  // Group by month for chart
  const monthlyData = transactions.reduce((acc: any, t) => {
    const month = new Date(t.date).toLocaleString('default', { month: 'short' })
    if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 }
    if (t.type === 'inflow') acc[month].income += t.amount
    else acc[month].expenses += t.amount
    return acc
  }, {})

  const chartData = Object.values(monthlyData).slice(0, 5).reverse()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão Financeira</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <Input name="description" required placeholder="Ex: Honorários ABC" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="type" defaultValue="inflow">
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
                <Input name="amount" type="number" step="0.01" required />
              </div>
              <div>
                <Label>Data</Label>
                <Input name="date" type="date" required />
              </div>
              <div>
                <Label>Status</Label>
                <Input name="status" required placeholder="Ex: Pago" />
              </div>
              <Button type="submit" className="w-full">
                Salvar Transação
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas</CardTitle>
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell
                      className="font-medium flex items-center gap-2 max-w-[150px] truncate"
                      title={t.description}
                    >
                      {t.type === 'inflow' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      {t.description}
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
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteFinance(t.id)}>
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
