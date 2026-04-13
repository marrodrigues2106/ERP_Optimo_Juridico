import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchDou, DouSearchResult } from '@/services/dou'
import { Search, Loader2, ExternalLink, Database, Globe, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export default function DouSearch() {
  const [q, setQ] = useState('')
  const [publishFrom, setPublishFrom] = useState('')
  const [publishTo, setPublishTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DouSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [source, setSource] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const res = await searchDou({ q, publishFrom, publishTo })
      setResults(res.data || [])
      setSource(res.source)
    } catch (error) {
      console.error(error)
      setResults([])
      setSource('ERRO')
    } finally {
      setLoading(false)
    }
  }

  const getSourceIcon = () => {
    if (source === 'LOCAL_DB') return <Database className="w-4 h-4 text-blue-500" />
    if (source === 'DOU_SCRAPING') return <Globe className="w-4 h-4 text-emerald-500" />
    if (source === 'QUERIDO_DIARIO') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    return null
  }

  const getSourceText = () => {
    if (source === 'LOCAL_DB') return 'Banco de Dados Local (Cache)'
    if (source === 'DOU_SCRAPING') return 'Ingestão Direta do DOU'
    if (source === 'QUERIDO_DIARIO') return 'Fallback (Querido Diário)'
    if (source === 'ERRO') return 'Falha na Busca'
    return 'Nenhum resultado'
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Motor de Busca DOU</h1>
        <p className="text-slate-500">
          Pesquisa avançada multicamadas no Diário Oficial da União. O sistema tentará buscar
          localmente, fará ingestão direta se necessário e utilizará fallbacks em caso de
          indisponibilidade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Pesquisa</CardTitle>
          <CardDescription>Defina os termos e o período para a busca.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label htmlFor="q">Termo de Busca (Palavra, frase ou processo)</Label>
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
                onChange={(e) => setPublishFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2 w-full md:w-48">
              <Label htmlFor="publishTo">Data Final</Label>
              <Input
                id="publishTo"
                type="date"
                value={publishTo}
                onChange={(e) => setPublishTo(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto min-w-32">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {searched && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Resultados ({results.length})</h2>
            {source && (
              <div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200">
                {getSourceIcon()}
                <span className="text-slate-700">Fonte: {getSourceText()}</span>
              </div>
            )}
          </div>

          {results.length === 0 && !loading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma publicação encontrada para os filtros informados em nenhuma das camadas de
                busca.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {results.map((item, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900 leading-tight">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                          <span className="font-medium text-slate-700">{item.pubName}</span>
                          <span>•</span>
                          <span>{item.artType}</span>
                          <span>•</span>
                          <span>
                            {item.pubDate ? format(new Date(item.pubDate), 'dd/MM/yyyy') : ''}
                          </span>
                        </div>
                      </div>
                      {item.urlTitle && (
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                          <a href={item.urlTitle} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver no DOU
                          </a>
                        </Button>
                      )}
                    </div>

                    {(item.hierarchyStr || item.editionNumber) && (
                      <div className="text-xs text-slate-500 flex flex-wrap gap-3 p-2 bg-slate-50 rounded-md border border-slate-100">
                        {item.hierarchyStr && (
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

                    <div className="relative">
                      <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
