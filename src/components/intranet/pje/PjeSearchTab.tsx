import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Search, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PjeSearchTab() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const { toast } = useToast()

  const { register, handleSubmit } = useForm({
    defaultValues: { numeroProcesso: '' },
  })

  const onSubmit = async (data: any) => {
    if (!data.numeroProcesso) return
    const num = data.numeroProcesso.replace(/\D/g, '')
    if (num.length !== 20) {
      toast({
        title: 'Erro',
        description: 'Número de processo inválido. O CNJ deve ter 20 dígitos.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${num}`,
      )
      if (!res.ok) throw new Error('Serviço indisponível no momento.')
      const json = await res.json()
      const items = json.items || (Array.isArray(json) ? json : [])
      setResults(items)
      if (items.length === 0) {
        toast({ title: 'Aviso', description: 'Nenhuma comunicação encontrada para este processo.' })
      } else {
        toast({ title: 'Sucesso', description: `${items.length} comunicações encontradas.` })
      }
    } catch (err: any) {
      toast({ title: 'Erro na busca', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Consulta de Comunicações PJe</CardTitle>
          <CardDescription>
            Consulte comunicações e intimações diretamente na base nacional do PJe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            <div className="flex flex-col gap-2">
              <Label>Número do Processo (CNJ)</Label>
              <div className="flex gap-2">
                <Input
                  {...register('numeroProcesso')}
                  placeholder="0000000-00.0000.0.00.0000"
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Buscar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Resultados ({results.length})</h3>
          <ScrollArea className="h-[600px] w-full rounded-md border p-4 bg-slate-50/50">
            <div className="flex flex-col gap-4">
              {results.map((r, i) => (
                <Card key={i} className="overflow-hidden bg-white">
                  <div className="border-b bg-slate-50 p-4 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        {r.siglaTribunal || 'Tribunal'}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700">{r.numeroProcesso}</span>
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {r.dataDisponibilizacao
                        ? new Date(r.dataDisponibilizacao).toLocaleDateString('pt-BR')
                        : 'Data indisponível'}
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {r.tipoComunicacao || 'Comunicação'}
                      </h4>
                      {r.nomeOrgao && <p className="text-sm text-slate-600">{r.nomeOrgao}</p>}
                    </div>

                    {r.texto && (
                      <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-md border border-slate-100 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {r.texto}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {r.meio && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Meio: {r.meio}
                        </Badge>
                      )}
                      {Array.isArray(r.destinatarios) &&
                        r.destinatarios.map((d: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 text-xs font-normal hover:bg-blue-100"
                          >
                            Destinatário: {d.nome || 'Desconhecido'}
                          </Badge>
                        ))}
                    </div>
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
