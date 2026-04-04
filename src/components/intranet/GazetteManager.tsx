import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Calendar, Loader2, FileText, FileSearch, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function GazetteManager() {
  const [keyword, setKeyword] = useState('')
  const [processo, setProcesso] = useState('')
  const [oab, setOab] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [orgao, setOrgao] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [resultsGazette, setResultsGazette] = useState<any[]>([])
  const [resultsDOU, setResultsDOU] = useState<any[]>([])

  const [selectedPub, setSelectedPub] = useState<any | null>(null)
  const [pubType, setPubType] = useState<'gazette' | 'dou' | null>(null)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsLoading(true)

    const gFilters: string[] = []
    if (keyword) gFilters.push(`texto_normalizado ~ "${keyword}"`)
    if (processo) gFilters.push(`numero_processo ~ "${processo}"`)
    if (oab) gFilters.push(`oabs ~ "${oab}"`)
    if (cpfCnpj) gFilters.push(`cpfs_cnpjs ~ "${cpfCnpj}"`)
    if (dateStart) gFilters.push(`data_publicacao >= "${dateStart} 00:00:00"`)
    if (dateEnd) gFilters.push(`data_publicacao <= "${dateEnd} 23:59:59"`)
    if (orgao) gFilters.push(`orgao ~ "${orgao}"`)

    const dFilters: string[] = []
    if (keyword) dFilters.push(`texto_normalizado ~ "${keyword}"`)
    if (processo) dFilters.push(`texto_normalizado ~ "${processo}"`)
    if (oab) dFilters.push(`texto_normalizado ~ "${oab}"`)
    if (cpfCnpj) dFilters.push(`texto_normalizado ~ "${cpfCnpj}"`)
    if (dateStart) dFilters.push(`data_publicacao >= "${dateStart} 00:00:00"`)
    if (dateEnd) dFilters.push(`data_publicacao <= "${dateEnd} 23:59:59"`)
    if (orgao) dFilters.push(`orgao ~ "${orgao}"`)

    try {
      const [gRes, dRes] = await Promise.all([
        pb.collection('gazette_publications').getList(1, 100, {
          filter: gFilters.length ? gFilters.join(' && ') : 'id != ""',
          sort: '-data_publicacao',
          expand: 'diario',
        }),
        pb.collection('publicacoes_dou').getList(1, 100, {
          filter: dFilters.length ? dFilters.join(' && ') : 'id != ""',
          sort: '-data_publicacao',
        }),
      ])

      setResultsGazette(gRes.items)
      setResultsDOU(dRes.items)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const renderSnippet = (text: string) => {
    if (!text) return ''
    return text.substring(0, 300) + (text.length > 300 ? '...' : '')
  }

  const renderJsonArray = (val: any) => {
    if (Array.isArray(val)) return val.join(', ')
    if (typeof val === 'string') return val
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-primary tracking-tight">
            Motor de Busca: Diários Oficiais
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pesquise publicações e despachos nos Diários de Justiça Estaduais e no Diário Oficial da
            União.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <Label>Termos Livres / Palavras-chave</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Ex: deferimento, liminar, nome da parte..."
                    className="pl-9"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Número do Processo</Label>
                <Input
                  placeholder="0000000-00.0000.0.00.0000"
                  value={processo}
                  onChange={(e) => setProcesso(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Número da OAB</Label>
                <Input
                  placeholder="Ex: 123456/SP"
                  value={oab}
                  onChange={(e) => setOab(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>CPF / CNPJ</Label>
                <Input
                  placeholder="Apenas números"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Órgão / Tribunal</Label>
                <Input
                  placeholder="Ex: TRF-1, TJSP, STJ..."
                  value={orgao}
                  onChange={(e) => setOrgao(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex items-end">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" /> Realizar Busca
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="gazette" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="gazette">Diários Estaduais ({resultsGazette.length})</TabsTrigger>
          <TabsTrigger value="dou">Diário Oficial da União ({resultsDOU.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="gazette" className="mt-4">
          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {resultsGazette.length === 0 ? (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                  <FileSearch className="w-12 h-12 mb-3 text-slate-300" />
                  Nenhuma publicação encontrada nos diários estaduais.
                </div>
              ) : (
                resultsGazette.map((pub) => (
                  <div key={pub.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                        <Badge
                          variant="outline"
                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50"
                        >
                          {pub.orgao || pub.expand?.diario?.orgao_publicador || 'Diário de Justiça'}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {pub.data_publicacao
                            ? new Date(pub.data_publicacao).toLocaleDateString()
                            : 'N/D'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPub(pub)
                          setPubType('gazette')
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ler na íntegra
                      </Button>
                    </div>
                    {pub.numero_processo && renderJsonArray(pub.numero_processo) && (
                      <div className="mb-1 text-sm font-semibold text-slate-800">
                        Processo: {renderJsonArray(pub.numero_processo)}
                      </div>
                    )}
                    {pub.oabs && renderJsonArray(pub.oabs) && (
                      <div className="mb-1 text-xs text-slate-600">
                        <span className="font-semibold">OABs:</span> {renderJsonArray(pub.oabs)}
                      </div>
                    )}
                    {pub.cpfs_cnpjs && renderJsonArray(pub.cpfs_cnpjs) && (
                      <div className="mb-2 text-xs text-slate-600">
                        <span className="font-semibold">CPF/CNPJ:</span>{' '}
                        {renderJsonArray(pub.cpfs_cnpjs)}
                      </div>
                    )}
                    <p className="text-sm text-slate-600 font-mono bg-slate-100 p-3 rounded leading-relaxed mt-2 break-words">
                      {renderSnippet(pub.texto_normalizado)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dou" className="mt-4">
          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {resultsDOU.length === 0 ? (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                  <FileSearch className="w-12 h-12 mb-3 text-slate-300" />
                  Nenhuma publicação encontrada no DOU.
                </div>
              ) : (
                resultsDOU.map((pub) => (
                  <div key={pub.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        >
                          {pub.orgao || 'DOU'} - {pub.secao || 'Seção'}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {pub.data_publicacao
                            ? new Date(pub.data_publicacao).toLocaleDateString()
                            : 'N/D'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPub(pub)
                          setPubType('dou')
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ler na íntegra
                      </Button>
                    </div>
                    {pub.titulo && (
                      <div className="mb-2 text-sm font-semibold text-slate-800">{pub.titulo}</div>
                    )}
                    <p className="text-sm text-slate-600 font-mono bg-slate-100 p-3 rounded leading-relaxed">
                      {renderSnippet(pub.texto_normalizado || pub.texto_bruto)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedPub} onOpenChange={(open) => !open && setSelectedPub(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Publicação na Íntegra</span>
              {pubType === 'dou' && selectedPub?.url_origem && (
                <a
                  href={selectedPub.url_origem}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary flex items-center hover:underline mr-6"
                >
                  <ExternalLink className="w-4 h-4 mr-1" /> Ver no site original
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-md border border-slate-100">
              {pubType === 'gazette' ? (
                <>
                  <div>
                    <strong>Órgão:</strong>{' '}
                    {selectedPub?.orgao || selectedPub?.expand?.diario?.orgao_publicador || 'N/D'}
                  </div>
                  <div>
                    <strong>Data:</strong>{' '}
                    {selectedPub?.data_publicacao
                      ? new Date(selectedPub.data_publicacao).toLocaleDateString()
                      : 'N/D'}
                  </div>
                  {selectedPub?.numero_processo && renderJsonArray(selectedPub.numero_processo) && (
                    <div className="w-full">
                      <strong>Processo:</strong> {renderJsonArray(selectedPub.numero_processo)}
                    </div>
                  )}
                  {selectedPub?.oabs && renderJsonArray(selectedPub.oabs) && (
                    <div className="w-full">
                      <strong>OABs:</strong> {renderJsonArray(selectedPub.oabs)}
                    </div>
                  )}
                  {selectedPub?.cpfs_cnpjs && renderJsonArray(selectedPub.cpfs_cnpjs) && (
                    <div className="w-full">
                      <strong>CPF/CNPJ:</strong> {renderJsonArray(selectedPub.cpfs_cnpjs)}
                    </div>
                  )}
                  {selectedPub?.partes && renderJsonArray(selectedPub.partes) && (
                    <div className="w-full">
                      <strong>Partes:</strong> {renderJsonArray(selectedPub.partes)}
                    </div>
                  )}
                  {selectedPub?.advogados && renderJsonArray(selectedPub.advogados) && (
                    <div className="w-full">
                      <strong>Advogados:</strong> {renderJsonArray(selectedPub.advogados)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <strong>Órgão:</strong> {selectedPub?.orgao || 'N/D'}
                  </div>
                  <div>
                    <strong>Seção:</strong> {selectedPub?.secao || 'N/D'}
                  </div>
                  <div>
                    <strong>Data:</strong>{' '}
                    {selectedPub?.data_publicacao
                      ? new Date(selectedPub.data_publicacao).toLocaleDateString()
                      : 'N/D'}
                  </div>
                  {selectedPub?.titulo && (
                    <div className="w-full">
                      <strong>Título:</strong> {selectedPub.titulo}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-md font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {selectedPub?.texto_normalizado ||
                selectedPub?.texto_bruto ||
                'Conteúdo não disponível'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
