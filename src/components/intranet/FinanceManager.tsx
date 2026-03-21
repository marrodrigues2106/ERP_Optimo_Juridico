import { useState } from 'react'
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
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const chartData = [
  { month: 'Jul', income: 15000, expenses: 8000 },
  { month: 'Ago', income: 18000, expenses: 9500 },
  { month: 'Set', income: 22000, expenses: 8500 },
  { month: 'Out', income: 19500, expenses: 9000 },
  { month: 'Nov', income: 25000, expenses: 8800 },
]

const chartConfig = {
  income: { label: 'Receitas', color: 'hsl(var(--primary))' },
  expenses: { label: 'Despesas', color: 'hsl(var(--destructive))' },
}

const mockTransactions = [
  {
    id: '1',
    desc: 'Honorários - Cliente ABC',
    type: 'inflow',
    amount: 'R$ 5.000,00',
    date: '10/10/2023',
    status: 'Pago',
  },
  {
    id: '2',
    desc: 'Aluguel Escritório',
    type: 'outflow',
    amount: 'R$ 3.500,00',
    date: '05/10/2023',
    status: 'Pago',
  },
  {
    id: '3',
    desc: 'Honorários - Cliente XYZ',
    type: 'inflow',
    amount: 'R$ 2.500,00',
    date: '15/10/2023',
    status: 'Pendente',
  },
  {
    id: '4',
    desc: 'Licenças de Software',
    type: 'outflow',
    amount: 'R$ 450,00',
    date: '20/10/2023',
    status: 'Pago',
  },
]

export default function FinanceManager() {
  const [transactions] = useState(mockTransactions)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-primary">Gestão Financeira</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Nova Transação
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <BarChart data={chartData}>
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
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell
                      className="font-medium flex items-center gap-2 max-w-[150px] truncate"
                      title={t.desc}
                    >
                      {t.type === 'inflow' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      {t.desc}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${t.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {t.amount}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {t.status}
                      </span>
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
