import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { searchDou, checkDouHealth, DouSearchResult } from '@/services/dou'
import {
  Search,
  Loader2,
  ExternalLink,
  Database,
  Globe,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

function getLocalDateStr(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLastBusinessDay() {
  const date = new Date()
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0)
    date.setDate(date.getDate() - 2) // Sunday -> Friday
  else if (dayOfWeek === 6) date.setDate(date.getDate() - 1) // Saturday -> Friday
  return getLocalDateStr(date)
}

interface LogEntry {
  id: string
  etapa: string
  status: string
  mensagem: string
  data_hora: string
}

export default function DouSearch() {
  const { user } = useAuth()
  const { toast } = useToast()

  const todayStr = getLocalDateStr(new Date())

  const [q, setQ] = useState(() => sessionStorage.getItem('dou_q') || '')
  const [publishFrom, setPublishFrom] = useState(
    () => sessionStorage.getItem('dou_publishFrom') || getLastBusinessDay(),
  )
  const [publishTo, setPublishTo] = useState(
    () => sessionStorage.getItem('dou_publishTo') || getLastBusinessDay(),
  )
  const [orgPrin, setOrgPrin] = useState(() => sessionStorage.getItem('dou_orgPrin') || '')
  const [artType, setArtType] = useState(() => sessionStorage.getItem('dou_artType') || '')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DouSearchResult[]>(() => {
    const saved = sessionStorage.getItem('dou_results')
    return saved ? JSON.parse(saved) : []
  })
  const [searched, setSearched] = useState(() => !!sessionStorage.getItem('dou_searched'))
  const [source, setSource] = useState(() => sessionStorage.getItem('dou_source') || '')
  const [message, setMessage] = useState(() => sessionStorage.getItem('dou_message') || '')

  const [douHealth, setDouHealth] = useState<'checking' | 'up' | 'down'>('checking')
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('dou_page')
    return saved ? parseInt(saved, 10) : 1
  })
  const itemsPerPage = 10

  useEffect(() => {
    sessionStorage.setItem('dou_q', q)
    sessionStorage.setItem('dou_publishFrom', publishFrom)
    sessionStorage.setItem('dou_publishTo', publishTo)
    sessionStorage.setItem('dou_orgPrin', orgPrin)
    sessionStorage.setItem('dou_artType', artType)
  }, [q, publishFrom, publishTo, orgPrin, artType])

  useEffect(() => {
    if (searched) {
      sessionStorage.setItem('dou_searched', 'true')
      sessionStorage.setItem('dou_results', JSON.stringify(results))
      sessionStorage.setItem('dou_source', source)
      sessionStorage.setItem('dou_message', message)
      sessionStorage.setItem('dou_page', currentPage.toString())
    }
  }, [searched, results, source, message, currentPage])

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await checkDouHealth()
        setDouHealth(res.status === 'up' ? 'up' : 'down')
      } catch (err) {
        setDouHealth('down')
      }
    }
    checkHealth()
  }, [])

  useRealtime('logs_processamento', (e) => {
    if ((loading || liveLogs.length > 0) && e.action === 'create') {
      setLiveLogs((prev) => {
        const next = [...prev, e.record as unknown as LogEntry]
        return next.slice(-50)
      })
    }
  })

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [liveLogs])

  if (!user?.can_view_search_module && user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Acesso Negado</h2>
        <p className="mt-2 text-slate-600 max-w-md">
          Você não tem permissão para acessar o módulo de busca. Entre em contato com o
          administrador do sistema.
        </p>
      </div>
    )
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return

    if (publishFrom && publishTo && publishFrom > publishTo) {
      toast({
        title: 'Data inválida',
        description: 'A Data Final não pode ser anterior à Data Inicial.',
        variant: 'destructive',
      })
      return
    }

    setLiveLogs([])
    setLoading(true)
    setSearched(true)
    setCurrentPage(1)

    try {
      const res = await searchDou({ q, publishFrom, publishTo, orgPrin, artType })
      setResults(res.data || [])
      setSource(res.source)
      setMessage(res.message || '')
    } catch (error) {
      console.error(error)
      setResults([])
      setSource('ERRO')
      setMessage('Ocorreu um erro inesperado ao realizar a busca.')
    } finally {
      setLoading(false)
    }
  }

  const getSourceIcon = () => {
    if (source === 'CACHE') return <Zap className="w-4 h-4 text-yellow-500" />
    if (source === 'LOCAL_DB') return <Database className="w-4 h-4 text-blue-500" />
    if (source === 'DOU_SCRAPING') return <Globe className="w-4 h-4 text-emerald-500" />
    if (source === 'QUERIDO_DIARIO') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    return null
  }

  const getSourceText = () => {
    if (source === 'CACHE') return 'Cache Rápido'
    if (source === 'LOCAL_DB') return 'Banco de Dados Local'
    if (source === 'DOU_SCRAPING') return 'Ingestão Direta do DOU'
    if (source === 'QUERIDO_DIARIO') return 'Fallback (Querido Diário)'
    if (source === 'ERRO') return 'Falha na Busca'
    return 'Nenhum resultado'
  }

  const totalPages = Math.ceil(results.length / itemsPerPage)
  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const formatArtType = (type: string) => {
    if (!type) return ''
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const hasBlockedError =
    liveLogs.some((l) => l.mensagem.includes('403') || l.mensagem.includes('Blocked')) ||
    message.includes('403') ||
    message.includes('Blocked')

  let currentStepText = 'Execução em Tempo Real'
  if (loading) {
    if (liveLogs.length > 0) {
      const lastLog = liveLogs[liveLogs.length - 1]
      if (lastLog.etapa.includes('Scraping') || lastLog.etapa.includes('Conexão'))
        currentStepText = 'Conectando ao DOU...'
      else if (lastLog.etapa.includes('Tratamento') || lastLog.etapa.includes('Normalizando'))
        currentStepText = 'Extraindo e Normalizando dados...'
      else if (lastLog.etapa.includes('Salvar') || lastLog.etapa.includes('Cache'))
        currentStepText = 'Indexando resultados...'
      else currentStepText = lastLog.etapa
    } else {
      currentStepText = 'Iniciando Busca...'
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Motor de Busca DOU</h1>
          <p className="text-slate-500">
            Pesquisa avançada multicamadas no Diário Oficial da União. O sistema tenta buscar no
            Cache, Dados Locais, realiza ingestão direta se necessário e utiliza fallbacks.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm text-sm font-medium">
          <span className="text-slate-500">Status IN.GOV:</span>
          {douHealth === 'checking' && (
            <span className="flex items-center text-amber-500">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verificando
            </span>
          )}
          {douHealth === 'up' && (
            <span className="flex items-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Conectado
            </span>
          )}
          {douHealth === 'down' && (
            <span className="flex items-center text-red-600">
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Indisponível
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Pesquisa</CardTitle>
          <CardDescription>
            Defina os termos, o período e filtros específicos para a busca.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="q">Termo de Busca (obrigatório)</Label>
                <Input
                  id="q"
                  placeholder='Ex: "João da Silva" ou 0000000-00.0000.0.00.0000'
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 w-full md:w-48">
                <Label htmlFor="publishFrom">Data Inicial</Label>
                <Input
                  id="publishFrom"
                  type="date"
                  value={publishFrom}
                  max={todayStr}
                  onChange={(e) => setPublishFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2 w-full md:w-48">
                <Label htmlFor="publishTo">Data Final</Label>
                <Input
                  id="publishTo"
                  type="date"
                  value={publishTo}
                  max={todayStr}
                  onChange={(e) => setPublishTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="orgPrin">Órgão (opcional)</Label>
                <Input
                  id="orgPrin"
                  placeholder="Ex: Ministério da Fazenda"
                  value={orgPrin}
                  onChange={(e) => setOrgPrin(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="artType">Tipo de Ato (opcional)</Label>
                <Input
                  id="artType"
                  placeholder="Ex: Portaria, Resolução"
                  value={artType}
                  onChange={(e) => setArtType(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto min-w-40 mt-6 md:mt-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Pesquisar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {hasBlockedError && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conexão Bloqueada</AlertTitle>
          <AlertDescription>
            O portal do DOU bloqueou a nossa requisição de extração (Erro 403 - Forbidden). Isso
            geralmente ocorre devido a limites de segurança do governo contra acessos automatizados.
            O sistema tentará buscar dados no Cache Local ou via Querido Diário, mas os resultados
            podem estar incompletos.
          </AlertDescription>
        </Alert>
      )}

      {(loading || liveLogs.length > 0) && (
        <Card className="border-indigo-100/50 shadow-md animate-fade-in overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center text-slate-700">
              {loading ? (
                <Activity className="w-4 h-4 mr-2 animate-pulse text-indigo-600" />
              ) : (
                <Database className="w-4 h-4 mr-2 text-slate-500" />
              )}
              {loading ? currentStepText : 'Último Log de Execução'}
            </CardTitle>
            {loading && (
              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                Running
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0 bg-slate-950">
            <ScrollArea className="h-48 p-4 font-mono text-[11px] leading-relaxed tracking-tight sm:text-xs">
              {liveLogs.length === 0 ? (
                <div className="flex items-center text-slate-400 h-full justify-center opacity-70">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aguardando eventos do servidor...
                </div>
              ) : (
                <div className="flex flex-col">
                  {liveLogs.map((log, i) => (
                    <div key={i} className="mb-2 flex flex-col sm:flex-row sm:gap-2 text-slate-300">
                      <div className="flex gap-2 shrink-0">
                        <span className="text-slate-500">
                          [{log.data_hora ? new Date(log.data_hora).toLocaleTimeString() : ''}]
                        </span>
                        <span
                          className={cn(
                            'font-semibold',
                            log.status?.toLowerCase().includes('erro') ||
                              log.status?.toLowerCase().includes('fail')
                              ? 'text-red-400'
                              : log.status?.toLowerCase().includes('aviso')
                                ? 'text-yellow-400'
                                : 'text-emerald-400',
                          )}
                        >
                          [{log.status || 'Info'}]
                        </span>
                        <span className="text-indigo-300">[{log.etapa}]</span>
                      </div>
                      <span className="break-words mt-0.5 sm:mt-0 opacity-90">{log.mensagem}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {searched && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Resultados ({results.length})</h2>
            {source && (
              <div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200 shadow-sm">
                {getSourceIcon()}
                <span className="text-slate-700">Fonte: {getSourceText()}</span>
              </div>
            )}
          </div>

          {results.length === 0 && !loading ? (
            <Card>
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-lg font-medium text-slate-900 mb-1">
                  Nenhuma publicação encontrada
                </p>
                <p className="text-slate-500 mb-4">
                  Não encontramos resultados nas camadas de busca para os filtros informados.
                </p>
                {message && (
                  <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500 font-mono">
                    Diagnóstico: {message}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedResults.map((item, idx) => (
                  <Card
                    key={idx}
                    className="overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg text-slate-900 leading-tight">
                            {item.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {item.pubName}
                            </span>
                            {item.artType && (
                              <>
                                <span>•</span>
                                <span>{formatArtType(item.artType)}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              {item.pubDate ? format(new Date(item.pubDate), 'dd/MM/yyyy') : ''}
                            </span>
                          </div>
                        </div>
                        {item.urlTitle && (
                          <Button variant="outline" size="sm" asChild className="shrink-0 bg-white">
                            <a href={item.urlTitle} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ler Original
                            </a>
                          </Button>
                        )}
                      </div>

                      {(item.hierarchyStr || item.editionNumber || item.orgao_principal) && (
                        <div className="text-xs text-slate-500 flex flex-col sm:flex-row flex-wrap gap-3 p-2 bg-slate-50 rounded-md border border-slate-100">
                          {item.orgao_principal && (
                            <span>
                              <strong>Órgão:</strong> {item.orgao_principal}{' '}
                              {item.organizacao_subordinada
                                ? `- ${item.organizacao_subordinada}`
                                : ''}
                            </span>
                          )}
                          {!item.orgao_principal && item.hierarchyStr && (
                            <span>
                              <strong>Hierarquia:</strong> {item.hierarchyStr}
                            </span>
                          )}
                          {item.editionNumber && (
                            <span>
                              <strong>Edição:</strong> {item.editionNumber}
                            </span>
                          )}
                          {item.numberPage && (
                            <span>
                              <strong>Página:</strong> {item.numberPage}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="relative mt-1">
                        <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((p) => Math.max(1, p - 1))
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === pageNum}
                              onClick={(e) => {
                                e.preventDefault()
                                setCurrentPage(pageNum)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className={
                            currentPage === totalPages ? 'pointer-events-none opacity-50' : ''
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
