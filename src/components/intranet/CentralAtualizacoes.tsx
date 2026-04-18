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
import { Activity, BookOpen, Landmark, CheckCircle2 } from 'lucide-react'
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
          <Activity className="w-8 h-8 text-primary" /> Central de Atualizações (Publicações)
        </h1>
        <p className="text-lg text-slate-500">
          Dashboard unificado com publicações do Diário Oficial (DOU) e Comunicações do PJe.
        </p>
      </div>

      <div className="grid gap-6">
        {notifications.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500 text-lg bg-white rounded-xl border border-slate-200">
            Nenhuma atualização encontrada.
          </div>
        )}
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={cn(
              'overflow-hidden border-slate-200 transition-colors shadow-sm',
              !n.is_read ? 'bg-blue-50/40 border-blue-100' : 'bg-white',
            )}
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
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

              <div className="space-y-3">
                {n.type === 'pje' ? (
                  <>
                    <p className="text-2xl font-bold text-primary font-mono mb-2">
                      {n.numero_processo}
                    </p>
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <p
                        className="text-lg text-slate-700 line-clamp-4 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: n.texto || '' }}
                      ></p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-base text-slate-600 font-medium mt-3">
                      <span className="bg-slate-100 px-3 py-1 rounded-md">
                        Tribunal: {n.sigla_tribunal}
                      </span>
                      <span className="bg-slate-100 px-3 py-1 rounded-md">
                        Disp:{' '}
                        {n.data_disponibilizacao
                          ? format(new Date(n.data_disponibilizacao), 'dd/MM/yyyy')
                          : '-'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-amber-700 mb-2">
                      {n.orgao || 'Órgão Desconhecido'}
                    </p>
                    <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100/50">
                      <p className="text-lg text-slate-800 line-clamp-4 leading-relaxed">
                        {n.texto_normalizado || 'Publicação DOU encontrada'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-base text-slate-600 font-medium mt-3">
                      <span className="bg-slate-100 px-3 py-1 rounded-md">
                        Pub:{' '}
                        {n.data_publicacao
                          ? format(new Date(n.data_publicacao), 'dd/MM/yyyy')
                          : '-'}
                      </span>
                      {n.matched_term && (
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-md font-bold">
                          Termo: {n.matched_term}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  className={cn('h-10 text-base font-bold bg-white', n.is_read && 'text-slate-500')}
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
                    className="h-10 text-base font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                    asChild
                  >
                    <Link to={`/intranet/comunicacoes/${n.id}`}>Página Completa</Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

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
                  page === 1
                    ? 'pointer-events-none opacity-50 text-base'
                    : 'text-base font-bold cursor-pointer'
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
                    : 'text-base font-bold cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
