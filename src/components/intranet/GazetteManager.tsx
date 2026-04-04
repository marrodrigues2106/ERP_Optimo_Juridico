import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Search, Loader2, BookOpen, ExternalLink, Filter } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function GazetteManager() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const [filters, setFilters] = useState({
    freeText: '',
    caseNumber: '',
    oab: '',
    cpfCnpj: '',
    organ: '',
    startDate: '',
    endDate: '',
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      let filterArr: string[] = []

      if (filters.freeText) filterArr.push(`texto_normalizado ~ "${filters.freeText}"`)
      if (filters.caseNumber) filterArr.push(`numero_processo ~ "${filters.caseNumber}"`)
      if (filters.oab) filterArr.push(`oabs ~ "${filters.oab}"`)
      if (filters.cpfCnpj) filterArr.push(`cpfs_cnpjs ~ "${filters.cpfCnpj}"`)
      if (filters.organ) filterArr.push(`orgao ~ "${filters.organ}"`)
      if (filters.startDate) filterArr.push(`data_publicacao >= "${filters.startDate} 00:00:00"`)
      if (filters.endDate) filterArr.push(`data_publicacao <= "${filters.endDate} 23:59:59"`)

      const filterStr = filterArr.join(' && ')

      const gazetteRes = await pb.collection('gazette_publications').getList(1, 100, {
        filter: filterStr,
        sort: '-data_publicacao',
        expand: 'diario',
      })

      let douFilterArr: string[] = []
      if (filters.freeText) douFilterArr.push(`texto_normalizado ~ "${filters.freeText}"`)
      if (filters.caseNumber) douFilterArr.push(`texto_normalizado ~ "${filters.caseNumber}"`)
      if (filters.oab) douFilterArr.push(`texto_normalizado ~ "${filters.oab}"`)
      if (filters.cpfCnpj) douFilterArr.push(`texto_normalizado ~ "${filters.cpfCnpj}"`)
      if (filters.organ) douFilterArr.push(`orgao ~ "${filters.organ}"`)
      if (filters.startDate) douFilterArr.push(`data_publicacao >= "${filters.startDate} 00:00:00"`)
      if (filters.endDate) douFilterArr.push(`data_publicacao <= "${filters.endDate} 23:59:59"`)

      const douFilterStr = douFilterArr.join(' && ')

      const douRes = await pb.collection('publicacoes_dou').getList(1, 100, {
        filter: douFilterStr,
        sort: '-data_publicacao',
      })

      const merged = [
        ...gazetteRes.items.map((i) => ({ ...i, _source: 'Tribunal' })),
        ...douRes.items.map((i) => ({ ...i, _source: 'DOU' })),
      ].sort(
        (a, b) => new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime(),
      )

      setResults(merged)
      if (merged.length === 0) {
        toast({ title: 'Nenhum resultado encontrado.' })
      }
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Erro na busca', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFilters({
      freeText: '',
      caseNumber: '',
      oab: '',
      cpfCnpj: '',
      organ: '',
      startDate: '',
      endDate: '',
    })
    setResults([])
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">
          Buscador de Diários Oficiais
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Pesquise publicações em diários de justiça e DOU utilizando filtros avançados.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Pesquisa livre no conteúdo da publicação..."
                  className="pl-10 h-12 text-base"
                  value={filters.freeText}
                  onChange={(e) => setFilters({ ...filters, freeText: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-4 whitespace-nowrap"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros {showAdvanced ? 'Ocultar' : 'Avançados'}
                </Button>
                <Button type="submit" className="h-12 px-8" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label>Número do Processo</Label>
                  <Input
                    placeholder="Ex: 0000000-00.0000.0.00.0000"
                    value={filters.caseNumber}
                    onChange={(e) => setFilters({ ...filters, caseNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>OAB</Label>
                  <Input
                    placeholder="Ex: 12345/SP"
                    value={filters.oab}
                    onChange={(e) => setFilters({ ...filters, oab: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF / CNPJ</Label>
                  <Input
                    placeholder="Somente números"
                    value={filters.cpfCnpj}
                    onChange={(e) => setFilters({ ...filters, cpfCnpj: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Órgão / Tribunal</Label>
                  <Input
                    placeholder="Ex: TRF1, STJ..."
                    value={filters.organ}
                    onChange={(e) => setFilters({ ...filters, organ: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClear}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center justify-between">
              <span>Resultados Encontrados ({results.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {results.map((item, idx) => (
                <div key={idx} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={item._source === 'DOU' ? 'secondary' : 'default'}
                        className="uppercase"
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        {item._source}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-700">
                        {item.orgao ||
                          item.expand?.diario?.orgao_publicador ||
                          'Órgão não especificado'}
                      </span>
                      <span className="text-sm text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                        {new Date(item.data_publicacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {item.expand?.diario?.url_original && (
                      <Button variant="outline" size="sm" asChild className="h-8">
                        <a href={item.expand.diario.url_original} target="_blank" rel="noreferrer">
                          Ver Original <ExternalLink className="w-3.5 h-3.5 ml-2" />
                        </a>
                      </Button>
                    )}
                    {item.url_origem && (
                      <Button variant="outline" size="sm" asChild className="h-8">
                        <a href={item.url_origem} target="_blank" rel="noreferrer">
                          Ver Original <ExternalLink className="w-3.5 h-3.5 ml-2" />
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white border border-slate-100 p-4 rounded-md shadow-sm max-h-[300px] overflow-y-auto font-mono">
                    {item.texto_normalizado || item.texto_bruto || 'Conteúdo indisponível'}
                  </div>

                  {item._source === 'Tribunal' &&
                    item.numero_processo &&
                    Array.isArray(item.numero_processo) &&
                    item.numero_processo.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.numero_processo.map((cnj: string, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs text-blue-600 bg-blue-50 border-blue-200"
                          >
                            CNJ: {cnj}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
