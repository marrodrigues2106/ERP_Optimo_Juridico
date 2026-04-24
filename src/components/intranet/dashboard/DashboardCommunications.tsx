import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Loader2, Mail, MailOpen } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { format } from 'date-fns'
import { useRealtime } from '@/hooks/use-realtime'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function DashboardCommunications() {
  const navigate = useNavigate()
  const [communications, setCommunications] = useState<any[]>([])
  const [commsTotal, setCommsTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [readFilter, setReadFilter] = useState<'unread' | 'read'>('unread')
  const [loadingComms, setLoadingComms] = useState(false)

  const loadComms = async () => {
    setLoadingComms(true)
    try {
      const orgId = pb.authStore.record?.active_organization
      const isReadVal = readFilter === 'read' ? 'true' : 'false'
      const filter = orgId
        ? `organization="${orgId}" && is_read=${isReadVal}`
        : `is_read=${isReadVal}`

      const res = await pb.collection('pje_communications').getList(page, perPage, {
        filter,
        sort: '-dataDisponibilizacao',
        expand: 'linked_case',
      })
      setCommunications(res.items)
      setCommsTotal(res.totalItems)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingComms(false)
    }
  }

  useEffect(() => {
    loadComms()
  }, [page, perPage, readFilter])
  useRealtime('pje_communications', loadComms)

  const toggleReadStatus = async (e: React.MouseEvent, c: any) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await pb.collection('pje_communications').update(c.id, { is_read: !c.is_read })
      loadComms()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden h-full">
      <CardHeader className="pb-3 border-b bg-white flex flex-row items-center justify-between shrink-0">
        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
          <Bell className="w-5 h-5 text-primary" /> Comunicações Processuais
        </CardTitle>
        <div className="flex items-center gap-3">
          <Select
            value={readFilter}
            onValueChange={(v: any) => {
              setReadFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unread">Não Lidos</SelectItem>
              <SelectItem value="read">Lidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-slate-50/30">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[300px]">
          {loadingComms ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin w-8 h-8 text-primary/50" />
            </div>
          ) : communications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-8">
              <Bell className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium">Nenhuma comunicação encontrada.</p>
            </div>
          ) : (
            communications.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'p-4 border rounded-lg transition-colors bg-white relative group',
                  c.is_read ? 'border-slate-200 opacity-75' : 'border-primary/30 shadow-sm',
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {c.siglaTribunal || 'PJe'}
                    </span>
                    {!c.is_read && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">
                      {c.dataDisponibilizacao
                        ? format(new Date(c.dataDisponibilizacao), 'dd/MM/yyyy HH:mm')
                        : ''}
                    </span>
                    <button
                      onClick={(e) => toggleReadStatus(e, c)}
                      className="text-slate-400 hover:text-primary transition-colors"
                      title={c.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                    >
                      {c.is_read ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p
                  className="text-sm font-bold text-slate-800 mb-1 hover:text-primary cursor-pointer transition-colors"
                  onClick={() => c.linked_case && navigate(`/intranet/processos/${c.linked_case}`)}
                >
                  {c.numeroProcesso}
                </p>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {c.texto || c.tipoComunicacao}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Itens por página:</span>
            <Select
              value={perPage.toString()}
              onValueChange={(v) => {
                setPerPage(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Pagination className="justify-end w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => Math.max(1, p - 1))
                  }}
                  className={cn(
                    'h-8 px-3 text-xs',
                    page === 1 ? 'pointer-events-none opacity-50' : '',
                  )}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-slate-600 px-3">
                  Pág. {page} {commsTotal > 0 && `de ${Math.ceil(commsTotal / perPage)}`}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => p + 1)
                  }}
                  className={cn(
                    'h-8 px-3 text-xs',
                    page * perPage >= commsTotal ? 'pointer-events-none opacity-50' : '',
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  )
}
