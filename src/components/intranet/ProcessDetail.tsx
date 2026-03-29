import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegalCase } from '@/services/legal_cases'
import { getCaseMovements, createCaseMovement } from '@/services/case_movements'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Calendar, Briefcase, User, Landmark, Edit3, Scale, Plus } from 'lucide-react'

export default function ProcessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [legalCase, setLegalCase] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      setLegalCase(await getLegalCase(id))
      setMovements(await getCaseMovements(id))
    } catch (e) {
      toast({ title: 'Registro não encontrado', variant: 'destructive' })
      navigate('/intranet/processos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('legal_cases', loadData)
  useRealtime('case_movements', loadData)

  const handleAddManualMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const desc = fd.get('description') as string

    try {
      await createCaseMovement({
        case: id,
        event_date: new Date().toISOString(),
        description: desc,
        source: 'Manual',
        external_id: `manual_${Date.now()}`,
      })
      toast({ title: 'Andamento registrado' })
      e.currentTarget.reset()
    } catch (err) {
      toast({ title: 'Erro ao registrar andamento', variant: 'destructive' })
    }
  }

  if (loading || !legalCase)
    return <div className="p-8 animate-pulse text-center">Carregando Detalhes...</div>

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/intranet/processos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">{legalCase.parties}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {legalCase.type} {legalCase.case_number ? `nº ${legalCase.case_number}` : ''}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="bg-slate-100 uppercase">
            {legalCase.lifecycle_status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="text-lg">Metadados (V2)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Tribunal / Órgão
                </span>
                <p className="font-medium text-sm mt-1">{legalCase.court || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Status Sincronização
                </span>
                <p className="font-medium text-sm mt-1">
                  {legalCase.datajud_sync_status || 'Pendente'}
                </p>
                {legalCase.search_after_token && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    Token: {legalCase.search_after_token}
                  </p>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Fase Atual</span>
                <p className="font-medium text-sm mt-1">{legalCase.status || 'Não informada'}</p>
              </div>
              <div className="pt-4 border-t border-dashed">
                <span className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-2">
                  <User className="w-3.5 h-3.5 mr-1" /> Cliente Relacionado
                </span>
                <p className="text-sm font-medium">{legalCase.expand?.client?.name || 'Nenhum'}</p>
              </div>
              <div className="pt-4 border-t border-dashed">
                <span className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-2">
                  <Briefcase className="w-3.5 h-3.5 mr-1" /> Colaborador
                </span>
                <p className="text-sm font-medium">
                  {legalCase.expand?.responsible_collaborator?.name || 'Nenhum'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="text-lg">Linha do Tempo Estruturada</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="relative border-l-2 border-slate-200 ml-3 md:ml-4 space-y-8 mb-8 pb-4">
                {movements.length === 0 ? (
                  <p className="text-muted-foreground ml-[-1rem] text-sm text-center">
                    Nenhum andamento registrado.
                  </p>
                ) : (
                  movements.map((mov, idx) => (
                    <div key={mov.id} className="relative pl-6 md:pl-8 group">
                      <span
                        className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-${mov.source === 'DataJud' ? 'blue' : 'slate'}-500 transition-transform group-hover:scale-110`}
                      ></span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-slate-800">
                            {new Date(mov.event_date).toLocaleString('pt-BR')}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {mov.source}
                          </Badge>
                        </div>
                        <div className="bg-white p-4 rounded-lg border shadow-sm text-sm text-slate-700">
                          {mov.description}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleAddManualMovement}
                className="mt-6 bg-slate-50 p-4 rounded-lg border border-dashed"
              >
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800">
                  <Edit3 className="w-4 h-4" /> Inserir Movimento Manual
                </h4>
                <div className="flex gap-3">
                  <Input
                    name="description"
                    placeholder="Ex: Audiência agendada..."
                    required
                    className="flex-1 bg-white"
                  />
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" /> Salvar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
