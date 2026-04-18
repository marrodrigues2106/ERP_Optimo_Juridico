import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, BookOpen, Landmark, Bell, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function CentralAtualizacoes() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const loadNotifications = async (currentPage: number) => {
    setLoading(true)
    try {
      const res = await pb.collection('lawsuit_notifications').getList(currentPage, 15, {
        sort: '-created',
        expand: 'lawsuit',
      })
      setNotifications(res.items)
      setTotalPages(res.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications(page)
  }, [page])

  const handleMarkRead = async (id: string, current: boolean) => {
    await pb.collection('lawsuit_notifications').update(id, { is_read: !current })
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: !current } : n)))
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in-up pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" /> Central de Atualizações
        </h1>
        <p className="text-lg text-slate-500">
          Acompanhe as movimentações recentes de todos os processos monitorados (DOU, DataJud e
          PJe).
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 && !loading && (
              <div className="p-12 text-center text-slate-500 text-lg">
                Nenhuma atualização encontrada.
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors',
                  !n.is_read && 'bg-blue-50/40',
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {n.type === 'gazette' ? (
                      <BookOpen className="w-5 h-5 text-amber-500" />
                    ) : n.type === 'discovery' ? (
                      <Bell className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Landmark className="w-5 h-5 text-indigo-500" />
                    )}
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      {n.type === 'gazette'
                        ? 'Diário Oficial'
                        : n.type === 'court'
                          ? 'DataJud/PJe'
                          : 'Atualização'}
                    </span>
                    <span className="text-sm font-medium text-slate-400 ml-auto">
                      {format(new Date(n.created), "dd 'de' MMM, yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  <p
                    className={cn(
                      'text-lg mb-3 leading-relaxed',
                      !n.is_read ? 'font-bold text-slate-900' : 'text-slate-700',
                    )}
                  >
                    {n.update_content}
                  </p>

                  {n.type === 'gazette' && n.discovered_data && (
                    <div className="space-y-3 mb-4 mt-4">
                      {n.discovered_data.excerpt && (
                        <div className="bg-amber-50/60 border-l-4 border-amber-400 p-4 rounded-r-lg">
                          <p className="text-base text-slate-700 italic line-clamp-4">
                            "{n.discovered_data.excerpt}"
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {n.discovered_data.source && (
                          <span>
                            <strong className="font-semibold text-slate-800">Órgão:</strong>{' '}
                            {n.discovered_data.source}
                          </span>
                        )}
                        {n.discovered_data.date && (
                          <span>
                            <strong className="font-semibold text-slate-800">Data:</strong>{' '}
                            {new Date(n.discovered_data.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <Button
                      variant="ghost"
                      className="h-10 text-base font-medium px-4"
                      onClick={() => handleMarkRead(n.id, n.is_read)}
                    >
                      <CheckCircle2
                        className={cn(
                          'w-5 h-5 mr-2',
                          n.is_read ? 'text-slate-400' : 'text-emerald-500',
                        )}
                      />
                      {n.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                    </Button>
                    {n.lawsuit && (
                      <Button
                        variant="secondary"
                        className="h-10 text-base font-medium px-4"
                        asChild
                      >
                        <Link to={`/intranet/processos/${n.lawsuit}`}>Ver Processo</Link>
                      </Button>
                    )}
                    {n.type === 'gazette' && n.discovered_data?.url && (
                      <Button variant="outline" className="h-10 text-base font-medium px-4" asChild>
                        <a href={n.discovered_data.url} target="_blank" rel="noreferrer">
                          <BookOpen className="w-4 h-4 mr-2" /> Original
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
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
