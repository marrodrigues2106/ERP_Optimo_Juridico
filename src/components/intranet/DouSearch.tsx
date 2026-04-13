import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchDou, DouSearchResult } from '@/services/dou'
import { Search, Loader2, ExternalLink, Database, Globe, AlertTriangle, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'

export default function DouSearch() {
  const { user } = useAuth()

  const [q, setQ] = useState('')
  const [publishFrom, setPublishFrom] = useState('')
  const [publishTo, setPublishTo] = useState('')
  const [orgPrin, setOrgPrin] = useState('')
  const [artType, setArtType] = useState('')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DouSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [source, setSource] = useState('')
  const [message, setMessage] = useState('')

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

    setLoading(true)
    setSearched(true)
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

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Motor de Busca DOU</h1>
        <p className="text-slate-500">
          Pesquisa avançada multicamadas no Diário Oficial da União. O sistema tenta buscar no
          Cache, Dados Locais, realiza ingestão direta se necessário e utiliza fallbacks.
        </p>
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
            <div className="grid gap-4">
              {results.map((item, idx) => (
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
                              <span>{item.artType}</span>
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

                    <div className="relative mt-1">
                      <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap leading-relaxed">
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
