import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  UserCircle,
  Search,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function GlobalSearch() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''

  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{
    clients: any[]
    legalCases: any[]
    tasks: any[]
    agendaEvents: any[]
    collaborators: any[]
  }>({
    clients: [],
    legalCases: [],
    tasks: [],
    agendaEvents: [],
    collaborators: [],
  })

  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setResults({
        clients: [],
        legalCases: [],
        tasks: [],
        agendaEvents: [],
        collaborators: [],
      })
      return
    }

    const fetchResults = async () => {
      setIsLoading(true)
      try {
        const safeQ = q.replace(/"/g, '').trim()
        const orgId = pb.authStore.record?.active_organization
        const baseFilter = `deleted_at="" ${orgId ? `&& organization="${orgId}"` : ''}`

        // Clients
        const clientsPromise = pb.collection('clients').getList(1, 20, {
          filter: `${baseFilter} && (name ~ "${safeQ}" || fullName ~ "${safeQ}" || email ~ "${safeQ}" || cpf ~ "${safeQ}")`,
        })

        // Legal Cases
        const legalCasesPromise = pb.collection('legal_cases').getList(1, 20, {
          filter: `${baseFilter} && (case_number ~ "${safeQ}" || parties ~ "${safeQ}" || court ~ "${safeQ}" || description ~ "${safeQ}")`,
        })

        // Tasks
        const tasksPromise = pb.collection('tasks').getList(1, 20, {
          filter: `${baseFilter} && (title ~ "${safeQ}" || description ~ "${safeQ}")`,
        })

        // Agenda Events
        const agendaPromise = pb.collection('agenda_events').getList(1, 20, {
          filter: `${baseFilter} && (title ~ "${safeQ}" || description ~ "${safeQ}")`,
        })

        // Collaborators
        const collabPromise = pb.collection('collaborators').getList(1, 20, {
          filter: `${baseFilter} && (name ~ "${safeQ}" || email ~ "${safeQ}")`,
        })

        const [clientsRes, casesRes, tasksRes, agendaRes, collabRes] = await Promise.allSettled([
          clientsPromise,
          legalCasesPromise,
          tasksPromise,
          agendaPromise,
          collabPromise,
        ])

        setResults({
          clients: clientsRes.status === 'fulfilled' ? clientsRes.value.items : [],
          legalCases: casesRes.status === 'fulfilled' ? casesRes.value.items : [],
          tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.items : [],
          agendaEvents: agendaRes.status === 'fulfilled' ? agendaRes.value.items : [],
          collaborators: collabRes.status === 'fulfilled' ? collabRes.value.items : [],
        })
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [q])

  const totalResults =
    results.clients.length +
    results.legalCases.length +
    results.tasks.length +
    results.agendaEvents.length +
    results.collaborators.length

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 p-3 rounded-full">
          <Search className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Resultados da Busca</h1>
          <p className="text-slate-500 mt-1">
            {q ? (
              <>
                Buscando por <span className="font-semibold text-slate-700">"{q}"</span>
              </>
            ) : (
              'Digite um termo na barra superior para buscar.'
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p>Buscando informações no sistema...</p>
        </div>
      ) : !q || q.length < 2 ? (
        <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Por favor, digite pelo menos 2 caracteres para realizar a busca.
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-lg text-slate-600">Nenhum resultado encontrado para '{q}'</p>
          <p className="text-sm mt-2">Tente buscar por termos diferentes ou parciais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.legalCases.length > 0 && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Processos
                </h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {results.legalCases.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {results.legalCases.map((item) => (
                  <Link
                    key={item.id}
                    to={`/intranet/processos/${item.id}`}
                    className="flex items-start p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.case_number || 'Sem número'}
                      </p>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        {item.parties || item.description || 'Sem descrição'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors ml-3 mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.clients.length > 0 && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> Clientes
                </h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {results.clients.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {results.clients.map((item) => (
                  <Link
                    key={item.id}
                    to={`/intranet/clientes/${item.id}`}
                    className="flex items-start p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.name || item.fullName}
                      </p>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        {item.email || item.cpf || item.phone || 'Sem contato'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors ml-3 mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.tasks.length > 0 && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-600" /> Tarefas
                </h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {results.tasks.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {results.tasks.map((item) => (
                  <Link
                    key={item.id}
                    to={`/intranet/dashboard`}
                    className="flex items-start p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        {item.description || 'Sem descrição'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors ml-3 mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.agendaEvents.length > 0 && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" /> Agenda
                </h3>
                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {results.agendaEvents.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {results.agendaEvents.map((item) => (
                  <Link
                    key={item.id}
                    to={`/intranet/agenda`}
                    className="flex items-start p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        {item.start_date
                          ? new Date(item.start_date).toLocaleDateString('pt-BR')
                          : 'Sem data'}{' '}
                        - {item.type}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors ml-3 mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.collaborators.length > 0 && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-rose-600" /> Colaboradores
                </h3>
                <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {results.collaborators.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {results.collaborators.map((item) => (
                  <Link
                    key={item.id}
                    to={`/intranet/equipe/${item.id}`}
                    className="flex items-start p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.name || item.fullName}
                      </p>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        {item.role || item.email || 'Sem email'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition-colors ml-3 mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
