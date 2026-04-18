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
      const [pjeRes, douRes] = await Promise.all([
        pb.collection('results').getList(currentPage, 10, { sort: '-created' }),
        pb.collection('gazette_publications').getList(currentPage, 10, { sort: '-created' }),
      ])

      const merged = [
        ...pjeRes.items.map((item) => ({
          ...item,
          type: 'pje',
          unified_date: new Date(item.created).getTime(),
        })),
        ...douRes.items.map((item) => ({
          ...item,
          type: 'dou',
          unified_date: new Date(item.created).getTime(),
        })),
      ].sort((a, b) => b.unified_date - a.unified_date)

      setTotalPages(Math.max(pjeRes.totalPages, douRes.totalPages) || 1)
      setNotifications(merged)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications(page)
  }, [page])

  const handleMarkRead = async (id: string, current: boolean, type: string) => {
    if (type === 'dou') {
      await pb.collection('gazette_publications').update(id, { is_read: !current })
    }
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
                    {n.type === 'dou' ? (
                      <BookOpen className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Landmark className="w-5 h-5 text-indigo-500" />
                    )}
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      {n.type === 'dou' ? 'Diário Oficial da União' : 'Comunicação PJe'}
                    </span>
                    <span className="text-sm font-medium text-slate-400 ml-auto">
                      {format(new Date(n.created), "dd 'de' MMM, yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="mb-4">
                    {n.type === 'pje' ? (
                      <div className="space-y-2">
                        <p className="text-xl font-bold text-primary">{n.numero_processo}</p>
                        <p
                          className="text-lg text-slate-700 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: n.texto || '' }}
                        ></p>
                        <div className="flex gap-4 text-sm text-slate-500 mt-2">
                          <span>Tribunal: {n.sigla_tribunal}</span>
                          <span>
                            Data Disp:{' '}
                            {n.data_disponibilizacao
                              ? format(new Date(n.data_disponibilizacao), 'dd/MM/yyyy')
                              : '-'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xl font-bold text-amber-700">DOU - {n.orgao}</p>
                        <p className="text-lg text-slate-700 line-clamp-3">
                          {n.texto_normalizado || 'Publicação DOU encontrada'}
                        </p>
                        <div className="flex gap-4 text-sm text-slate-500 mt-2">
                          <span>
                            Data Pub:{' '}
                            {n.data_publicacao
                              ? format(new Date(n.data_publicacao), 'dd/MM/yyyy')
                              : '-'}
                          </span>
                          {n.matched_term && <span>Termo: {n.matched_term}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <Button
                      variant="ghost"
                      className="h-10 text-base font-medium px-4"
                      onClick={() => handleMarkRead(n.id, n.is_read, n.type)}
                    >
                      <CheckCircle2
                        className={cn(
                          'w-5 h-5 mr-2',
                          n.is_read ? 'text-slate-400' : 'text-emerald-500',
                        )}
                      />
                      {n.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                    </Button>

                    {n.type === 'pje' && (
                      <Button
                        variant="secondary"
                        className="h-10 text-base font-medium px-4"
                        asChild
                      >
                        <Link to={`/intranet/comunicacoes/${n.id}`}>Ver Detalhes</Link>
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
