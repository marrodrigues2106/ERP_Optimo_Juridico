import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity } from 'lucide-react'

export default function CentralAtualizacoes() {
  const [movements, setMovements] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const loadMovements = async (currentPage: number) => {
    setLoading(true)
    try {
      const res = await pb.collection('case_movements').getList(currentPage, 15, {
        sort: '-event_date',
        expand: 'case',
        filter: 'deleted_at = ""',
      })
      setMovements(res.items)
      setTotalPages(res.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMovements(page)
  }, [page])

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in-up pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" /> Central de Atualizações
        </h1>
        <p className="text-lg text-slate-500">
          Acompanhe as movimentações recentes de todos os processos monitorados.
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {movements.length === 0 && !loading && (
              <div className="p-12 text-center text-slate-500 text-lg">
                Nenhuma movimentação processual encontrada.
              </div>
            )}
            {movements.map((mov) => (
              <div key={mov.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-md uppercase tracking-wider">
                      {mov.source}
                    </span>
                    <span className="text-base font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
                      Processo: {mov.expand?.case?.case_number || 'N/A'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-400 shrink-0">
                    {format(new Date(mov.event_date), "dd 'de' MMM, yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-lg text-slate-800 font-medium leading-snug">{mov.description}</p>
                {mov.details && (
                  <p className="text-base text-slate-600 mt-3 whitespace-pre-wrap p-4 bg-slate-50 rounded-lg border border-slate-100">
                    {mov.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination className="mt-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setPage((p) => Math.max(1, p - 1))
                }}
                className={
                  page === 1 ? 'pointer-events-none opacity-50 text-base' : 'text-base font-medium'
                }
              />
            </PaginationItem>
            <span className="text-base text-slate-500 mx-6 flex items-center font-medium">
              Página <strong className="mx-2 text-slate-900">{page}</strong> de{' '}
              <strong className="ml-2 text-slate-900">{totalPages}</strong>
            </span>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setPage((p) => Math.min(totalPages, p + 1))
                }}
                className={
                  page === totalPages
                    ? 'pointer-events-none opacity-50 text-base'
                    : 'text-base font-medium'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
