import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageSquare, CalendarClock, Scale, Tag, Paperclip, Search } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function CrmServicesTab() {
  const [interactions, setInteractions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const orgId = pb.authStore.record?.active_organization
      const ints = await pb.collection('crm_interactions').getFullList({
        filter: `organization = "${orgId}"`,
        sort: '-date',
        expand: 'client,linked_case,responsible',
      })
      setInteractions(ints)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('crm_interactions', loadData)

  const filteredInteractions = interactions.filter((int) => {
    const matchesSearch =
      searchTerm === '' ||
      (int.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (int.expand?.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (int.tags && int.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())))

    const matchesStatus = statusFilter === 'all' || int.status === statusFilter
    const matchesDate = dateFilter === '' || int.date.startsWith(dateFilter)

    return matchesSearch && matchesStatus && matchesDate
  })

  const renderInteractionNode = (int: any, allItems: any[], isChild = false) => {
    const children = allItems.filter((i) => i.parent_interaction === int.id)
    return (
      <div
        key={int.id}
        className={cn(
          'relative group',
          isChild ? 'ml-8 mt-4 border-l-2 border-slate-200 pl-4' : '',
        )}
      >
        {!isChild && (
          <div className="absolute -left-[31px] top-1 w-4 h-4 bg-primary rounded-full ring-4 ring-white" />
        )}
        <div className="bg-white p-4 border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                  {int.type}
                </span>
                {int.status && (
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-semibold border',
                      int.status === 'closed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-blue-50 text-blue-700',
                    )}
                  >
                    {int.status === 'closed' ? 'Fechado' : 'Em andamento'}
                  </span>
                )}
                {int.tags &&
                  Array.isArray(int.tags) &&
                  int.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center"
                    >
                      <Tag className="w-3 h-3 mr-1" /> {t}
                    </span>
                  ))}
              </div>
              <div
                className="text-sm font-medium text-slate-800 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: int.description }}
              />

              {int.expand?.client && (
                <div
                  className="mt-2 text-xs font-medium text-slate-600 cursor-pointer hover:text-primary"
                  onClick={() => navigate(`/intranet/clientes/${int.client}`)}
                >
                  Cliente: {int.expand.client.name || int.expand.client.fullName}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded">
              {new Date(int.date).toLocaleString()}
            </span>
          </div>

          {int.attachments && int.attachments.length > 0 && (
            <div className="flex gap-2 mt-3">
              {int.attachments.map((att: string) => (
                <a
                  key={att}
                  href={pb.files.getUrl(int, att)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs flex items-center bg-slate-50 border px-2 py-1 rounded hover:bg-slate-100"
                >
                  <Paperclip className="w-3 h-3 mr-1" /> Anexo
                </a>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-50">
            <div className="flex flex-wrap gap-2">
              {int.follow_up_date && (
                <span className="flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                  <CalendarClock className="w-3 h-3 mr-1.5" /> Follow-up:{' '}
                  {new Date(int.follow_up_date).toLocaleDateString()}
                </span>
              )}
              {int.expand?.linked_case && (
                <span
                  className="flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full cursor-pointer hover:bg-blue-100"
                  onClick={() => navigate(`/intranet/processos/${int.linked_case}`)}
                >
                  <Scale className="w-3 h-3 mr-1.5" /> Ref:{' '}
                  {int.expand.linked_case.case_number || int.expand.linked_case.parties}
                </span>
              )}
            </div>
          </div>
        </div>
        {children.map((c) => renderInteractionNode(c, allItems, true))}
      </div>
    )
  }

  const rootFiltered = filteredInteractions.filter(
    (i) =>
      !i.parent_interaction || !filteredInteractions.find((f) => f.id === i.parent_interaction),
  )

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <CardTitle className="text-lg">Gestão Global de Atendimentos</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Buscar por conteúdo, cliente ou tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Em Andamento</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
        </div>

        {rootFiltered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto opacity-20 mb-2" />
            <p>Nenhum atendimento encontrado para os filtros atuais.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
            {rootFiltered.map((int) => renderInteractionNode(int, filteredInteractions))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
