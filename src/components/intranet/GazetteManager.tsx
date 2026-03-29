import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Search,
  Activity,
  RefreshCw,
  FileText,
  Calendar,
  Building2,
  Gavel,
  Scale,
} from 'lucide-react'
import { searchGazettePublications, getGazettes, triggerManualIngest } from '@/services/gazettes'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>

  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 px-1 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

export default function GazetteManager() {
  const [activeTab, setActiveTab] = useState('search')
  const [gazettes, setGazettes] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any>(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [selectedPub, setSelectedPub] = useState<any>(null)
  const { toast } = useToast()

  // Search State
  const [searchParams, setSearchParams] = useState({
    q: '',
    processo: '',
    oab: '',
    parte: '',
    dataInicio: '',
    dataFim: '',
    page: 1,
  })

  const loadMonitoring = async () => {
    try {
      const data = await getGazettes()
      setGazettes(data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (activeTab === 'monitoring') {
      loadMonitoring()
    }
  }, [activeTab])

  useRealtime('gazettes', () => {
    if (activeTab === 'monitoring') loadMonitoring()
  })

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoadingSearch(true)
    try {
      const results = await searchGazettePublications(searchParams)
      setSearchResults(results)
    } catch (error) {
      toast({
        title: 'Erro ao buscar',
        description: 'Verifique os filtros e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoadingSearch(false)
    }
  }

  const handleIngest = async () => {
    setIngesting(true)
    try {
      await triggerManualIngest('TJSP')
      toast({
        title: 'Ingestão concluída',
        description: 'Novas publicações foram extraídas e indexadas.',
      })
    } catch (error) {
      toast({ title: 'Erro na ingestão', variant: 'destructive' })
    } finally {
      setIngesting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
            <Scale className="w-6 h-6" />
            Diários Oficiais
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Busca avançada e monitoramento de publicações judiciais
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" /> Busca de Publicações
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> Monitoramento (Ingestão)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros de Pesquisa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <Label>Termo Livre</Label>
                    <Input
                      placeholder="Busque por palavras no texto..."
                      value={searchParams.q}
                      onChange={(e) => setSearchParams({ ...searchParams, q: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Nº do Processo</Label>
                    <Input
                      placeholder="Ex: 1234567-89.2023..."
                      value={searchParams.processo}
                      onChange={(e) =>
                        setSearchParams({ ...searchParams, processo: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>OAB</Label>
                    <Input
                      placeholder="Ex: 12345/SP"
                      value={searchParams.oab}
                      onChange={(e) => setSearchParams({ ...searchParams, oab: e.target.value })}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Nome da Parte</Label>
                    <Input
                      placeholder="Nome do cliente ou contraparte..."
                      value={searchParams.parte}
                      onChange={(e) => setSearchParams({ ...searchParams, parte: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={searchParams.dataInicio}
                      onChange={(e) =>
                        setSearchParams({ ...searchParams, dataInicio: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={searchParams.dataFim}
                      onChange={(e) =>
                        setSearchParams({ ...searchParams, dataFim: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loadingSearch} className="w-full sm:w-auto">
                    {loadingSearch ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Pesquisar Diários
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {searchResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Resultados da Busca ({searchResults.totalItems})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResults.items.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-3">
                    <Search className="w-10 h-10 opacity-20" />
                    <p>Nenhuma publicação encontrada para os filtros aplicados.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.items.map((pub: any) => (
                      <div
                        key={pub.id}
                        className="p-4 border rounded-lg hover:border-primary/50 transition-colors bg-slate-50/50"
                      >
                        <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{' '}
                              {new Date(pub.data_publicacao).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {pub.orgao}
                            </span>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedPub(pub)}>
                            Ler Íntegra
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {pub.numero_processo?.map((p: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <Gavel className="w-3 h-3 mr-1" /> Proc: {p}
                            </span>
                          ))}
                          {pub.oabs?.map((o: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-800"
                            >
                              OAB: {o}
                            </span>
                          ))}
                        </div>

                        <p className="text-sm line-clamp-3 text-slate-700 leading-relaxed font-serif">
                          <HighlightText text={pub.texto_normalizado} query={searchParams.q} />
                        </p>
                      </div>
                    ))}

                    {searchResults.totalPages > 1 && (
                      <div className="flex justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          disabled={searchResults.page === 1}
                          onClick={() => {
                            setSearchParams({ ...searchParams, page: searchParams.page - 1 })
                            handleSearch()
                          }}
                        >
                          Anterior
                        </Button>
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                          Página {searchResults.page} de {searchResults.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          disabled={searchResults.page === searchResults.totalPages}
                          onClick={() => {
                            setSearchParams({ ...searchParams, page: searchParams.page + 1 })
                            handleSearch()
                          }}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico de Ingestão</CardTitle>
                <CardDescription>
                  Acompanhe o processamento diário de cadernos judiciais.
                </CardDescription>
              </div>
              <Button onClick={handleIngest} disabled={ingesting}>
                {ingesting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4 mr-2" />
                )}
                Forçar Ingestão (Simulação)
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data de Ref.</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gazettes.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        {new Date(g.data_publicacao).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{g.orgao_publicador}</TableCell>
                      <TableCell>{g.tipo_diario}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-semibold',
                            g.status_processamento === 'INDEXADO'
                              ? 'bg-green-100 text-green-800'
                              : g.status_processamento === 'ERRO'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800',
                          )}
                        >
                          {g.status_processamento}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(g.created).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {gazettes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhum registro de ingestão encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedPub} onOpenChange={() => setSelectedPub(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detalhes da Publicação
            </DialogTitle>
          </DialogHeader>

          {selectedPub && (
            <div className="space-y-6 py-4">
              <div className="flex flex-wrap gap-4 text-sm bg-slate-50 p-4 rounded-lg border">
                <div>
                  <span className="text-muted-foreground font-semibold">Órgão:</span>{' '}
                  {selectedPub.orgao}
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Data:</span>{' '}
                  {new Date(selectedPub.data_publicacao).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Hash ID:</span>{' '}
                  <span className="text-xs font-mono">
                    {selectedPub.hash_conteudo.substring(0, 10)}...
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-primary border-b pb-1">
                  Entidades Extraídas
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Processos:</span>
                    {selectedPub.numero_processo?.map((p: string, i: number) => (
                      <div key={i} className="font-mono text-xs">
                        {p}
                      </div>
                    )) || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">OABs:</span>
                    {selectedPub.oabs?.map((o: string, i: number) => <div key={i}>{o}</div>) || '-'}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block mb-1">Partes Mencionadas:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedPub.partes?.map((p: string, i: number) => (
                        <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs">
                          {p}
                        </span>
                      )) || '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-primary border-b pb-1">
                  Texto Original
                </h4>
                <p className="text-sm font-serif leading-relaxed text-slate-800 whitespace-pre-wrap bg-white border rounded-md p-4 shadow-sm">
                  {selectedPub.texto_normalizado}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
