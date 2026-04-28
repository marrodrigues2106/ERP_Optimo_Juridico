import { useState } from 'react'
import { Search, Loader2, BookOpen, Calendar, ExternalLink, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'

export function DouSearch() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [source, setSource] = useState('')
  const { toast } = useToast()

  const [q, setQ] = useState('')
  const [publishFrom, setPublishFrom] = useState('')
  const [publishTo, setPublishTo] = useState('')

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

    setLoading(true)
    setResults([])
    setSource('')
    try {
      const res = await pb.send('/backend/v1/dou/search', {
        method: 'POST',
        body: JSON.stringify({ q, publishFrom, publishTo }),
      })

      if (res.items && res.items.length > 0) {
        setResults(res.items)
        setSource(res.source)
        toast({
          title: 'Sucesso',
          description: `${res.items.length} publicações encontradas (${res.source}).`,
        })
      } else {
        toast({ title: 'Aviso', description: 'Nenhuma publicação encontrada.' })
      }
    } catch (err: any) {
      toast({
        title: 'Erro na busca',
        description: err.message || 'Falha ao buscar no DOU',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col h-full bg-white/50">
      <div className="mb-6 md:mb-8 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
          <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" /> Motor de Busca DOU
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-2">
          Busca avançada no Diário Oficial da União com fallback automático.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>Defina os parâmetros para localizar publicações.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 flex flex-col gap-2">
                <Label>Termo de Busca *</Label>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ex: Nome da Parte, CPF, Termo Específico..."
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={publishFrom}
                  onChange={(e) => setPublishFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={publishTo}
                  onChange={(e) => setPublishTo(e.target.value)}
                />
              </div>
            </div>
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
                Pesquisar no DOU
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
              Fonte: {source}
            </Badge>
          </div>
          <ScrollArea className="flex-1 rounded-md border p-4 bg-slate-50/50 h-[500px]">
            <div className="flex flex-col gap-4">
              {results.map((r) => (
                <Card
                  key={r.id}
                  className="overflow-hidden bg-white hover:shadow-md transition-shadow"
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
                        {r.fonte_coleta || source}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-md border border-slate-100 whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar">
                      <div dangerouslySetInnerHTML={{ __html: r.texto_normalizado || '' }} />
                    </div>

                    {r.url_origem && (
                      <div className="flex justify-end pt-2 border-t">
                        <a
                          href={r.url_origem}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 hover:text-emerald-600 h-9 px-3"
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
