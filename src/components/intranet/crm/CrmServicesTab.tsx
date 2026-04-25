import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Search, ExternalLink, CalendarClock, MessageSquare, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

export function CrmServicesTab() {
  const [interactions, setInteractions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadInteractions = async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const records = await pb.collection('crm_interactions').getFullList({
        filter: orgId ? `organization = "${orgId}"` : '',
        sort: '-date',
        expand: 'client,responsible,linked_case',
      })
      setInteractions(records)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadInteractions()
  }, [])
  useRealtime('crm_interactions', loadInteractions)

  const filtered = interactions.filter((int) => {
    if (statusFilter !== 'all' && int.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const title = (int.title || '').toLowerCase()
      const clientName = (int.expand?.client?.name || '').toLowerCase()
      if (!title.includes(s) && !clientName.includes(s)) return false
    }
    return true
  })

  return (
    <Card className="border-slate-200 shadow-sm animate-fade-in">
      <CardHeader className="border-b bg-slate-50/50 pb-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Histórico Geral de Atendimentos
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar assunto ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Em Andamento</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhum atendimento encontrado com os filtros atuais.
            </div>
          ) : (
            filtered.map((int) => (
              <div
                key={int.id}
                className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {int.type}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        int.status === 'closed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {int.status === 'closed' ? 'Fechado' : 'Em andamento'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(int.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{int.title || 'Sem Assunto'}</h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">
                      Cliente: {int.expand?.client?.name || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {int.follow_up_date && (
                    <div className="text-xs flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <CalendarClock className="w-3 h-3 mr-1" />
                      Follow-up: {new Date(int.follow_up_date).toLocaleDateString()}
                    </div>
                  )}
                  {int.expand?.client?.id && (
                    <Link to={`/intranet/clientes/${int.expand.client.id}?tab=crm`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" /> Acessar no Cliente
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
