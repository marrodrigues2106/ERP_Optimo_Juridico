import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { searchDou, checkDouHealth, clearDouLogs, DouSearchResult } from '@/services/dou'
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
  CalendarIcon,
  Trash2,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function getLocalDateStr(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLastBusinessDay() {
  const date = new Date()
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0) date.setDate(date.getDate() - 2)
  else if (dayOfWeek === 6) date.setDate(date.getDate() - 1)
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

  const [q, setQ] = useState(() => sessionStorage.getItem('dou_q') || '')
  const [searchType, setSearchType] = useState(
    () => sessionStorage.getItem('dou_searchType') || 'palavras_chave',
  )

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const fromStr = sessionStorage.getItem('dou_publishFrom') || getLastBusinessDay()
    const toStr = sessionStorage.getItem('dou_publishTo') || getLastBusinessDay()
    return {
      from: fromStr ? new Date(fromStr + 'T12:00:00Z') : new Date(),
      to: toStr ? new Date(toStr + 'T12:00:00Z') : new Date(),
    }
  })

  const [orgPrin, setOrgPrin] = useState(() => sessionStorage.getItem('dou_orgPrin') || '')
  const [artType, setArtType] = useState(() => sessionStorage.getItem('dou_artType') || '')
  const [processNumber, setProcessNumber] = useState(
    () => sessionStorage.getItem('dou_processNumber') || '',
  )
  const [oabNumber, setOabNumber] = useState(() => sessionStorage.getItem('dou_oabNumber') || '')
  const [cpfCnpj, setCpfCnpj] = useState(() => sessionStorage.getItem('dou_cpfCnpj') || '')
  const [fonteColeta, setFonteColeta] = useState(
    () => sessionStorage.getItem('dou_fonteColeta') || '',
  )
  const [douSection, setDouSection] = useState(() => sessionStorage.getItem('dou_douSection') || '')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DouSearchResult[]>(() => {
    const saved = sessionStorage.getItem('dou_results')
    return saved ? JSON.parse(saved) : []
  })
  const [searched, setSearched] = useState(() => !!sessionStorage.getItem('dou_searched'))
  const [source, setSource] = useState(() => sessionStorage.getItem('dou_source') || '')
  const [message, setMessage] = useState(() => sessionStorage.getItem('dou_message') || '')

  const [douHealth, setDouHealth] = useState<'checking' | 'up' | 'down' | 'blocked'>('checking')
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('dou_page')
    return saved ? parseInt(saved, 10) : 1
  })
  const itemsPerPage = 10

  useEffect(() => {
    sessionStorage.setItem('dou_q', q)
    sessionStorage.setItem('dou_searchType', searchType)
    if (date?.from) sessionStorage.setItem('dou_publishFrom', format(date.from, 'yyyy-MM-dd'))
    if (date?.to) sessionStorage.setItem('dou_publishTo', format(date.to, 'yyyy-MM-dd'))
    sessionStorage.setItem('dou_orgPrin', orgPrin)
    sessionStorage.setItem('dou_artType', artType)
    sessionStorage.setItem('dou_processNumber', processNumber)
    sessionStorage.setItem('dou_oabNumber', oabNumber)
    sessionStorage.setItem('dou_cpfCnpj', cpfCnpj)
    sessionStorage.setItem('dou_fonteColeta', fonteColeta)
    sessionStorage.setItem('dou_douSection', douSection)
  }, [
    q,
    searchType,
    date,
    orgPrin,
    artType,
    processNumber,
    oabNumber,
    cpfCnpj,
    fonteColeta,
    douSection,
  ])

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
        setDouHealth(res.status as 'up' | 'down' | 'blocked')
      } catch (err) {
        setDouHealth('down')
      }
    }
    checkHealth()
  }, [])

  useEffect(() => {
    const fetchInitialLogs = async () => {
      try {
        const records = await pb.collection('logs_processamento').getList(1, 50, {
          sort: '-created',
        })
        const items = records.items
          .map((r: any) => ({
            id: r.id,
            etapa: r.etapa,
            status: r.status,
            mensagem: r.mensagem,
            data_hora: r.data_hora,
          }))
          .reverse()
        setLiveLogs(items)
      } catch (error) {
        console.error('Failed to fetch initial logs', error)
      }
    }
    fetchInitialLogs()
  }, [])

  useRealtime('logs_processamento', (e) => {
    if (e.action === 'create') {
      setLiveLogs((prev) => {
        const next = [...prev, e.record as unknown as LogEntry]
        return next.slice(-100)
      })
    } else if (e.action === 'delete') {
      setLiveLogs((prev) => prev.filter((log) => log.id !== e.record.id))
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

    const publishFrom = date?.from ? format(date.from, 'yyyy-MM-dd') : ''
    const publishTo = date?.to ? format(date.to, 'yyyy-MM-dd') : ''

    if (!publishFrom || !publishTo) {
      toast({
        title: 'Período obrigatório',
        description: 'Por favor, selecione a Data Inicial e a Data Final.',
        variant: 'destructive',
      })
      return
    }

    if (publishFrom > publishTo) {
      toast({
        title: 'Data inválida',
        description: 'A Data Final não pode ser anterior à Data Inicial.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setSearched(true)
    setCurrentPage(1)

    try {
      const res = await searchDou({
        q,
        searchType,
        publishFrom,
        publishTo,
        orgPrin,
        artType,
        processNumber,
        oabNumber,
        cpfCnpj,
        fonteColeta,
        douSection,
      })
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

  const handleClearLogs = async () => {
    try {
      await clearDouLogs()
      setLiveLogs([])
      toast({ title: 'Histórico de logs apagado com sucesso' })
    } catch (error) {
      toast({ title: 'Erro ao apagar histórico', variant: 'destructive' })
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
    liveLogs.some(
      (l) =>
        l.mensagem.includes('403') || l.mensagem.includes('429') || l.mensagem.includes('Blocked'),
    ) ||
    message.includes('403') ||
    message.includes('429') ||
    message.includes('Blocked')

  let currentStepText = 'Execução em Tempo Real'
  if (loading) {
    if (liveLogs.length > 0) {
      const lastLog = liveLogs[liveLogs.length - 1]
      if (lastLog.etapa.includes('Scraping') || lastLog.etapa.includes('Conexão'))
        currentStepText = 'Conectando ao DOU...'
      else if (lastLog.etapa.includes('Parse')) currentStepText = 'Lendo e decodificando dados...'
      else if (lastLog.etapa.includes('Tratamento') || lastLog.etapa.includes('Normalizando'))
        currentStepText = 'Extraindo e Normalizando dados...'
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
            Pesquisa ativa diretamente no Diário Oficial da União (DOU). O sistema realiza a busca
            em tempo real na fonte oficial, garantindo dados sempre atualizados.
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
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Online
            </span>
          )}
          {douHealth === 'blocked' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center text-amber-500 cursor-help">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Bloqueado/Segurança
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    O portal DOU está ativo, mas bloqueou nossa requisição temporariamente (Erro
                    403/429). Tente novamente mais tarde.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
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
                <Label htmlFor="searchType">Modo de Busca</Label>
                <Select value={searchType} onValueChange={setSearchType} required>
                  <SelectTrigger id="searchType">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="palavras_chave">Palavras-chave</SelectItem>
                    <SelectItem value="frase_exata">Frase Exata</SelectItem>
                    <SelectItem value="regex">Regex Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full md:w-auto flex flex-col">
                <Label>Período: Data Inicial e Data Final (obrigatório)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={'outline'}
                      className={cn(
                        'w-full md:w-[280px] justify-start text-left font-normal',
                        !date && 'text-slate-500',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, 'dd/MM/yyyy')} - {format(date.to, 'dd/MM/yyyy')}
                          </>
                        ) : (
                          format(date.from, 'dd/MM/yyyy')
                        )
                      ) : (
                        <span>Data Inicial - Data Final</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="processNumber">Número do Processo</Label>
                <Input
                  id="processNumber"
                  placeholder="Ex: 0000000-00.0000.0.00.0000"
                  value={processNumber}
                  onChange={(e) => setProcessNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oabNumber">Número da OAB</Label>
                <Input
                  id="oabNumber"
                  placeholder="Ex: 123456/SP"
                  value={oabNumber}
                  onChange={(e) => setOabNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
                <Input
                  id="cpfCnpj"
                  placeholder="Ex: 000.000.000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgPrin">Órgão / Tribunal</Label>
                <Input
                  id="orgPrin"
                  placeholder="Ex: Ministério da Fazenda"
                  value={orgPrin}
                  onChange={(e) => setOrgPrin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="douSection">Seção DOU</Label>
                <Select value={douSection} onValueChange={setDouSection}>
                  <SelectTrigger id="douSection">
                    <SelectValue placeholder="Todas as seções" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as seções</SelectItem>
                    <SelectItem value="do1">Seção 1</SelectItem>
                    <SelectItem value="do2">Seção 2</SelectItem>
                    <SelectItem value="do3">Seção 3</SelectItem>
                    <SelectItem value="doextra">Edição Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fonteColeta">Fonte de Coleta</Label>
                <Input
                  id="fonteColeta"
                  placeholder="Ex: Diário Oficial da União"
                  value={fonteColeta}
                  onChange={(e) => setFonteColeta(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artType">Tipo de Ato</Label>
                <Input
                  id="artType"
                  placeholder="Ex: Portaria, Resolução"
                  value={artType}
                  onChange={(e) => setArtType(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={loading || !q.trim() || !searchType || !date?.from || !date?.to}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Pesquisar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {hasBlockedError && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conexão Bloqueada</AlertTitle>
          <AlertDescription>
            O portal do DOU bloqueou a nossa requisição de extração (Erro 403/429). Isso geralmente
            ocorre devido a limites de segurança do governo contra acessos automatizados. Tente
            refazer a busca em alguns minutos.
          </AlertDescription>
        </Alert>
      )}

      {(loading || liveLogs.length > 0) && (
        <Card className="border-indigo-100/50 shadow-md animate-fade-in overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {loading ? (
                <Activity className="w-4 h-4 animate-pulse text-indigo-600" />
              ) : (
                <Database className="w-4 h-4 text-slate-500" />
              )}
              <CardTitle className="text-sm font-semibold text-slate-700">
                {loading ? currentStepText : 'Console de Processamento'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                  Processando
                </span>
              )}
              {!loading && liveLogs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearLogs}
                  className="h-7 text-xs text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Limpar Histórico
                </Button>
              )}
            </div>
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
                    <div
                      key={log.id || i}
                      className="mb-2 flex flex-col sm:flex-row sm:gap-2 text-slate-300"
                    >
                      <div className="flex gap-2 shrink-0">
                        <span className="text-slate-500">
                          [{log.data_hora ? new Date(log.data_hora).toLocaleTimeString() : ''}]
                        </span>
                        <span
                          className={cn(
                            'font-semibold',
                            log.status?.toLowerCase().includes('erro') ||
                              log.status?.toLowerCase().includes('fail') ||
                              log.mensagem?.includes('403') ||
                              log.mensagem?.includes('500')
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
