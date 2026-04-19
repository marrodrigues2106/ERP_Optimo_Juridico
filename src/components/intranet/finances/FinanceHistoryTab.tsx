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
import { Input } from '@/components/ui/input'
import { ArrowUpRight, ArrowDownRight, Edit2, Trash2 } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export function FinanceHistoryTab({ transactions, cases, onEdit, onDelete }: any) {
  const [filterMonth, setFilterMonth] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filtered = transactions.filter((t: any) => {
    if (!filterMonth) return true
    const d = new Date(t.date)
    const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return yyyyMm === filterMonth
  })

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.ceil(filtered.length / perPage) || 1

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Histórico Completo</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value)
              setPage(1)
            }}
            className="w-auto"
          />
          <Button
            variant="outline"
            onClick={() => {
              setFilterMonth('')
              setPage(1)
            }}
          >
            Limpar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Processo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {t.type === 'inflow' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                    {t.description}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {t.expand?.linked_lawsuit?.parties ||
                    t.expand?.linked_lawsuit?.description ||
                    t.expand?.linked_lawsuit?.case_number ||
                    '-'}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {t.status}
                  </span>
                </TableCell>
                <TableCell
                  className={`whitespace-nowrap ${t.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}
                >
                  R$ {t.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(t)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(t)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="py-4 mt-4 border-t flex justify-center">
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
  )
}
