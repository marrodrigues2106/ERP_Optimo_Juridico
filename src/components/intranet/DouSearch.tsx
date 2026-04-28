import { useState } from 'react'
import { Search, Loader2, BookOpen, Calendar, ExternalLink, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format, differenceInDays, parseISO } from 'date-fns'
import { searchDouInit, searchDouRun } from '@/services/dou'
import { useRealtime } from '@/hooks/use-realtime'
import { Progress } from '@/components/ui/progress'

export function DouSearch() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [source, setSource] = useState('')
  const { toast } = useToast()

  const [q, setQ] = useState('')
  const [publishFrom, setPublishFrom] = useState('')
  const [publishTo, setPublishTo] = useState('')
  const [orgPrin, setOrgPrin] = useState('')
  const [secao, setSecao] = useState('todos')

  const [jobId, setJobId] = useState<string | null>(null)
  const [progressMsg, setProgressMsg] = useState('')
  const [progressValue, setProgressValue] = useState(0)

  useRealtime(
    'logs_processamento',
    (e) => {
      if ((e.action === 'create' || e.action === 'update') && jobId) {
        if (e.record.metadados?.jobId === jobId) {
          setProgressMsg(`${e.record.etapa}: ${e.record.mensagem}`)
          if (e.record.etapa === 'Conectando') setProgressValue(20)
          if (e.record.etapa === 'Lendo Página') {
            const page = e.record.metadados?.page || 1
            setProgressValue(Math.min(90, 20 + page * 5))
          }
          if (e.record.etapa === 'Finalizado') setProgressValue(100)
        }
      }
    },
    !!jobId,
  )

  useRealtime(
    'publicacoes_dou',
    (e) => {
      if (e.action === 'create' && loading) {
        const pubDate = e.record.data_publicacao
        if (publishFrom && pubDate < publishFrom) return
        if (publishTo && pubDate > publishTo + 'T23:59:59') return
        if (secao !== 'todos' && e.record.secao?.toLowerCase() !== secao.toLowerCase()) return

        setResults((prev) => {
          if (prev.find((r) => r.id === e.record.id)) return prev
          return [e.record, ...prev]
        })
      }
    },
    loading,
  )

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!q.trim()) {
      toast({
        title: 'Aviso',
        description: 'O termo de busca é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (publishFrom && publishTo) {
      const diff = differenceInDays(parseISO(publishTo), parseISO(publishFrom))
      if (diff > 30) {
        toast({
          title: 'Aviso',
          description: 'O período de busca não pode ser superior a 30 dias.',
          variant: 'destructive',
        })
        return
      }
    }

    setLoading(true)
    setResults([])
    setSource('')
    setProgressMsg('Iniciando...')
    setProgressValue(5)
    setJobId(null)

    // Format terms with OR if separated by comma
    const formattedQ = q.includes(',')
      ? q
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .join(' OR ')
      : q

    try {
      const res = await searchDouInit(formattedQ, publishFrom, publishTo, orgPrin, secao)

      if (res.localItems && res.localItems.length > 0) {
        setResults(res.localItems)
        setSource('Cache Local + Buscando Novos...')
        toast({
          title: 'Resultados Locais',
          description: `${res.localItems.length} publicações em cache exibidas imediatamente.`,
        })
      } else {
        setSource('Buscando Novos...')
      }

      const newJobId = res.jobId
      setJobId(newJobId)
      setProgressValue(10)

      searchDouRun(newJobId, formattedQ, publishFrom, publishTo, orgPrin, secao)
        .then((runRes) => {
          setLoading(false)
          setProgressMsg('Busca concluída.')
          setProgressValue(100)
          setSource((prev) =>
            prev.replace(' + Buscando Novos...', '').replace('Buscando Novos...', 'Origem (DOU)'),
          )
          if (runRes.count > 0) {
            toast({
              title: 'Busca Concluída',
              description: `Novas publicações encontradas e salvas.`,
            })
          } else {
            toast({ title: 'Busca Concluída', description: 'Nenhuma nova publicação na origem.' })
          }
        })
        .catch((err) => {
          setLoading(false)
          setProgressMsg('Erro no processamento em segundo plano.')
          toast({ title: 'Erro', description: err.message, variant: 'destructive' })
        })
    } catch (err: any) {
      setLoading(false)
      setProgressMsg('')
      toast({
        title: 'Erro na busca',
        description: err.message || 'Falha ao iniciar busca no DOU',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col h-full bg-white/50">
      <div className="mb-6 md:mb-8 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
          <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" /> Motor de Busca DOU
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-2">
          Busca otimizada e assíncrona no Diário Oficial da União.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>
            Defina os parâmetros para localizar publicações (Máximo 30 dias).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 flex flex-col gap-2">
                <Label>Termo de Busca *</Label>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ex: Termo 1, Termo 2"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Separe os termos por vírgula para buscar qualquer um deles (OR).
                </p>
              </div>
              <div className="md:col-span-3 flex flex-col gap-2">
                <Label>Data Inicial *</Label>
                <Input
                  type="date"
                  value={publishFrom}
                  onChange={(e) => setPublishFrom(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-3 flex flex-col gap-2">
                <Label>Data Final *</Label>
                <Input
                  type="date"
                  value={publishTo}
                  onChange={(e) => setPublishTo(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-6 flex flex-col gap-2">
                <Label>Órgão (Opcional)</Label>
                <Input
                  value={orgPrin}
                  onChange={(e) => setOrgPrin(e.target.value)}
                  placeholder="Ex: Ministério da Fazenda..."
                />
              </div>
              <div className="md:col-span-6 flex flex-col gap-2">
                <Label>Seção</Label>
                <Select value={secao} onValueChange={setSecao}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todas as Seções" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as Seções</SelectItem>
                    <SelectItem value="do1">Seção 1 (DO1)</SelectItem>
                    <SelectItem value="do2">Seção 2 (DO2)</SelectItem>
                    <SelectItem value="do3">Seção 3 (DO3)</SelectItem>
                    <SelectItem value="do1e">Seção 1 Extra (DO1e)</SelectItem>
                    <SelectItem value="do2e">Seção 2 Extra (DO2e)</SelectItem>
                    <SelectItem value="do3e">Seção 3 Extra (DO3e)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading && (
              <div className="pt-4 pb-2 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center text-sm text-emerald-700 font-medium">
                  <span>{progressMsg}</span>
                  <span>{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Buscando...' : 'Pesquisar no DOU'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-lg font-medium">Resultados ({results.length})</h3>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {source}
            </Badge>
          </div>
          <ScrollArea className="flex-1 rounded-md border p-4 bg-slate-50/50 h-[500px]">
            <div className="flex flex-col gap-4">
              {results.map((r) => (
                <Card
                  key={r.id}
                  className="overflow-hidden bg-white hover:shadow-md transition-shadow animate-fade-in"
                >
                  <div className="border-b bg-slate-50 p-4 flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-base">{r.titulo}</h4>
                      <p className="text-sm text-slate-500 font-medium">
                        {r.orgao} {r.secao ? `- ${r.secao}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm text-slate-500 flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm border">
                        <Calendar className="w-3.5 h-3.5" />
                        {r.data_publicacao
                          ? format(new Date(r.data_publicacao), 'dd/MM/yyyy')
                          : 'Data não informada'}
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        <Activity className="w-3 h-3 mr-1" />
                        {r.fonte_coleta === 'LOCAL_DB'
                          ? 'Cache Local'
                          : r.fonte_coleta === 'DOU_SCRAPING'
                            ? 'Origem (DOU)'
                            : r.fonte_coleta}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {r.artType && <Badge variant="outline">{r.artType}</Badge>}
                      {r.editionNumber && (
                        <Badge variant="outline">Edição: {r.editionNumber}</Badge>
                      )}
                      {r.numberPage && <Badge variant="outline">Página: {r.numberPage}</Badge>}
                    </div>
                    <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-md border border-slate-100 whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar">
                      {r.texto_normalizado?.replace(/<[^>]*>?/gm, '') || ''}
                    </div>

                    {r.url_origem && (
                      <div className="flex justify-end pt-2 border-t">
                        <a
                          href={r.url_origem}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-emerald-600 h-9 px-3"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" /> Ver no DOU
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
