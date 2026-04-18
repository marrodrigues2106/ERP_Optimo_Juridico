import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchDou, checkDouHealth, DouSearchResult } from '@/services/dou'
import {
  Search,
  Loader2,
  ExternalLink,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CalendarIcon,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
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
  const [numeroProcesso, setNumeroProcesso] = useState(
    () => sessionStorage.getItem('dou_numeroProcesso') || '',
  )
  const [numeroOab, setNumeroOab] = useState(() => sessionStorage.getItem('dou_numeroOab') || '')
  const [cpfCnpj, setCpfCnpj] = useState(() => sessionStorage.getItem('dou_cpfCnpj') || '')
  const [fonteColeta, setFonteColeta] = useState(
    () => sessionStorage.getItem('dou_fonteColeta') || '',
  )
  const [secaoDou, setSecaoDou] = useState(() => sessionStorage.getItem('dou_secaoDou') || '')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DouSearchResult[]>(() => {
    const saved = sessionStorage.getItem('dou_results')
    return saved ? JSON.parse(saved) : []
  })
  const [searched, setSearched] = useState(() => !!sessionStorage.getItem('dou_searched'))
  const [source, setSource] = useState(() => sessionStorage.getItem('dou_source') || '')
  const [message, setMessage] = useState(() => sessionStorage.getItem('dou_message') || '')

  const [douHealth, setDouHealth] = useState<'checking' | 'up' | 'down' | 'blocked'>('checking')
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
    sessionStorage.setItem('dou_numeroProcesso', numeroProcesso)
    sessionStorage.setItem('dou_numeroOab', numeroOab)
    sessionStorage.setItem('dou_cpfCnpj', cpfCnpj)
    sessionStorage.setItem('dou_fonteColeta', fonteColeta)
    sessionStorage.setItem('dou_secaoDou', secaoDou)
  }, [
    q,
    searchType,
    date,
    orgPrin,
    artType,
    numeroProcesso,
    numeroOab,
    cpfCnpj,
    fonteColeta,
    secaoDou,
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
    checkDouHealth()
      .then((res) => setDouHealth(res.status as 'up' | 'down' | 'blocked'))
      .catch(() => setDouHealth('down'))
  }, [])

  if (!user?.can_view_search_module && user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-6" />
        <h2 className="text-3xl font-bold text-slate-900">Acesso Negado</h2>
        <p className="mt-4 text-xl text-slate-600 max-w-md">
          Você não tem permissão para acessar o módulo de busca.
        </p>
      </div>
    )
  }

  const handleQuickPeriod = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDate({ from: start, to: end })
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

    if (date?.from && date?.to) {
      const diffTime = Math.abs(date.to.getTime() - date.from.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays > 60) {
        toast({
          title: 'Período muito longo',
          description: 'O período máximo de busca por data é de 60 dias',
          variant: 'destructive',
        })
        return
      }
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
        numeroProcesso,
        numeroOab,
        cpfCnpj,
        fonteColeta,
        secaoDou,
      })
      setResults(res.data || [])
      setSource(res.source)
      setMessage(res.message || '')
    } catch (error) {
      setResults([])
      setSource('ERRO')
      setMessage('Ocorreu um erro inesperado ao realizar a busca.')
    } finally {
      setLoading(false)
    }
  }

  const formatArtType = (type: string) =>
    type ? type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : ''

  const totalPages = Math.ceil(results.length / itemsPerPage)
  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Busca DOU
          </h1>
          <p className="text-lg text-slate-500">
            Pesquisa ativa diretamente no Diário Oficial da União (DOU).
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-full shadow-sm text-base font-medium">
          <span className="text-slate-500">Status IN.GOV:</span>
          {douHealth === 'checking' && (
            <span className="flex items-center text-amber-600 font-bold">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verificando
            </span>
          )}
          {douHealth === 'up' && (
            <span className="flex items-center text-emerald-600 font-bold">
              <CheckCircle2 className="w-5 h-5 mr-2" /> Online
            </span>
          )}
          {douHealth === 'blocked' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center text-amber-600 font-bold cursor-help">
                    <AlertTriangle className="w-5 h-5 mr-2" /> Bloqueado
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    O portal bloqueou nossa requisição (Erro 403/429).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {douHealth === 'down' && (
            <span className="flex items-center text-red-600 font-bold">
              <XCircle className="w-5 h-5 mr-2" /> Indisponível
            </span>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl">Filtros de Pesquisa</CardTitle>
          <CardDescription className="text-base">
            Defina os termos, o período e filtros específicos para a busca avançada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 md:items-end">
              <div className="flex-1 space-y-3 w-full">
                <Label htmlFor="q" className="text-base font-medium">
                  Termo de Busca (obrigatório)
                </Label>
                <Input
                  id="q"
                  placeholder='Ex: "João da Silva" ou 0000000-00.0000.0.00.0000'
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  required
                  className="text-base py-6"
                />
              </div>
              <div className="space-y-3 w-full md:w-56">
                <Label htmlFor="searchType" className="text-base font-medium">
                  Modo de Busca
                </Label>
                <Select value={searchType} onValueChange={setSearchType} required>
                  <SelectTrigger id="searchType" className="text-base py-6 h-auto">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="palavras_chave" className="text-base">
                      Palavras-chave
                    </SelectItem>
                    <SelectItem value="frase_exata" className="text-base">
                      Frase Exata
                    </SelectItem>
                    <SelectItem value="regex" className="text-base">
                      Regex Avançado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 w-full md:w-auto flex flex-col">
                <Label className="text-base font-medium">Período (Máx: 60 dias)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={'outline'}
                      className={cn(
                        'w-full md:w-[300px] justify-start text-left font-normal text-base py-6 h-auto',
                        !date && 'text-slate-500',
                      )}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5" />
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

            <div className="flex gap-3 -mt-2 mb-2">
              <Button
                type="button"
                variant="secondary"
                className="text-sm font-medium px-4"
                onClick={() => handleQuickPeriod(15)}
              >
                Últimos 15 dias
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="text-sm font-medium px-4"
                onClick={() => handleQuickPeriod(30)}
              >
                Últimos 30 dias
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="text-sm font-medium px-4"
                onClick={() => handleQuickPeriod(60)}
              >
                Últimos 60 dias
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <Label htmlFor="numeroProcesso" className="text-base">
                  Número do Processo
                </Label>
                <Input
                  id="numeroProcesso"
                  placeholder="Ex: 0000000-00.0000..."
                  value={numeroProcesso}
                  onChange={(e) => setNumeroProcesso(e.target.value)}
                  className="text-base py-5"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="numeroOab" className="text-base">
                  Número da OAB
                </Label>
                <Input
                  id="numeroOab"
                  placeholder="Ex: 123456/SP"
                  value={numeroOab}
                  onChange={(e) => setNumeroOab(e.target.value)}
                  className="text-base py-5"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="cpfCnpj" className="text-base">
                  CPF / CNPJ
                </Label>
                <Input
                  id="cpfCnpj"
                  placeholder="Ex: 000.000.000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="text-base py-5"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="orgPrin" className="text-base">
                  Órgão / Tribunal
                </Label>
                <Input
                  id="orgPrin"
                  placeholder="Ex: Ministério da Fazenda"
                  value={orgPrin}
                  onChange={(e) => setOrgPrin(e.target.value)}
                  className="text-base py-5"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="secaoDou" className="text-base">
                  Seção DOU
                </Label>
                <Select value={secaoDou} onValueChange={setSecaoDou}>
                  <SelectTrigger id="secaoDou" className="text-base py-5 h-auto">
                    <SelectValue placeholder="Todas as seções" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base">
                      Todas as seções
                    </SelectItem>
                    <SelectItem value="do1" className="text-base">
                      Seção 1
                    </SelectItem>
                    <SelectItem value="do2" className="text-base">
                      Seção 2
                    </SelectItem>
                    <SelectItem value="do3" className="text-base">
                      Seção 3
                    </SelectItem>
                    <SelectItem value="doextra" className="text-base">
                      Edição Extra
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="fonteColeta" className="text-base">
                  Fonte de Coleta
                </Label>
                <Input
                  id="fonteColeta"
                  placeholder="Ex: Diário Oficial da União"
                  value={fonteColeta}
                  onChange={(e) => setFonteColeta(e.target.value)}
                  className="text-base py-5"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="artType" className="text-base">
                  Tipo de Ato
                </Label>
                <Input
                  id="artType"
                  placeholder="Ex: Portaria, Resolução"
                  value={artType}
                  onChange={(e) => setArtType(e.target.value)}
                  className="text-base py-5"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={loading || !q.trim() || !searchType || !date?.from || !date?.to}
                  className="w-full py-6 text-lg font-bold"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  ) : (
                    <Search className="w-6 h-6 mr-3" />
                  )}
                  Pesquisar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {searched && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Resultados da Busca ({results.length})
            </h2>
            {source && (
              <div className="flex items-center gap-2 text-base font-bold px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shadow-sm">
                <Globe className="w-5 h-5" />
                Busca concluída
              </div>
            )}
          </div>

          {results.length === 0 && !loading ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-2">
                  Nenhuma publicação encontrada
                </p>
                <p className="text-lg text-slate-500">
                  Tente ajustar os filtros ou o período da busca.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6">
                {paginatedResults.map((item, idx) => (
                  <Card
                    key={idx}
                    className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border-slate-200"
                  >
                    <div className="p-6 flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-slate-900 leading-snug">
                            {item.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-base text-slate-600 font-medium">
                            <span className="bg-slate-100 px-3 py-1 rounded text-sm text-slate-800 font-bold tracking-wide">
                              {item.pubName}
                            </span>
                            {item.artType && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span>{formatArtType(item.artType)}</span>
                              </>
                            )}
                            <span className="text-slate-300">•</span>
                            <span>
                              {item.pubDate ? format(new Date(item.pubDate), 'dd/MM/yyyy') : ''}
                            </span>
                          </div>
                        </div>
                        {item.urlTitle && (
                          <Button
                            variant="outline"
                            size="lg"
                            asChild
                            className="shrink-0 bg-white border-slate-300 text-base"
                          >
                            <a href={item.urlTitle} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-5 h-5 mr-2" /> Ler Original
                            </a>
                          </Button>
                        )}
                      </div>

                      {(item.hierarchyStr || item.editionNumber || item.orgao_principal) && (
                        <div className="text-sm md:text-base text-slate-600 flex flex-col sm:flex-row flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          {item.orgao_principal && (
                            <span>
                              <strong className="text-slate-800">Órgão:</strong>{' '}
                              {item.orgao_principal}{' '}
                              {item.organizacao_subordinada
                                ? `- ${item.organizacao_subordinada}`
                                : ''}
                            </span>
                          )}
                          {!item.orgao_principal && item.hierarchyStr && (
                            <span>
                              <strong className="text-slate-800">Hierarquia:</strong>{' '}
                              {item.hierarchyStr}
                            </span>
                          )}
                          {item.editionNumber && (
                            <span>
                              <strong className="text-slate-800">Edição:</strong>{' '}
                              {item.editionNumber}
                            </span>
                          )}
                          {item.numberPage && (
                            <span>
                              <strong className="text-slate-800">Página:</strong> {item.numberPage}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="relative mt-2">
                        <p className="text-base md:text-lg text-slate-700 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }}
                          className={
                            currentPage === 1
                              ? 'pointer-events-none opacity-50 text-base'
                              : 'text-base font-medium'
                          }
                        />
                      </PaginationItem>
                      <span className="text-base text-slate-600 mx-6 flex items-center font-medium">
                        Página <strong className="mx-2 text-slate-900">{currentPage}</strong> de{' '}
                        <strong className="ml-2 text-slate-900">{totalPages}</strong>
                      </span>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }}
                          className={
                            currentPage === totalPages
                              ? 'pointer-events-none opacity-50 text-base'
                              : 'text-base font-medium'
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
