import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegalCase } from '@/services/legal_cases'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, Scale, Clock, Briefcase } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

const renderMovementText = (text: string) => {
  if (!text) return text
  const keywords = [
    'NÚMERO ÚNICO:',
    'POLO ATIVO',
    'POLO PASSIVO',
    'ADVOGADO \\(A/S\\)',
    'DATA DE DISPONIBILIZAÇÃO:',
    'DATA DE PUBLICAÇÃO:',
  ]
  const regex = new RegExp(`(${keywords.join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (keywords.some((k) => new RegExp(`^${k.replace(/\\/g, '')}`, 'i').test(part))) {
      return <strong key={i}>{part}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export default function ProcessDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [legalCase, setLegalCase] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      getLegalCase(id)
        .then(setLegalCase)
        .catch((err: any) => {
          console.error(err)
          toast({ title: 'Erro ao carregar processo', variant: 'destructive' })
        })
      pb.collection('case_movements')
        .getFullList({ filter: `case = "${id}"`, sort: '-event_date' })
        .then(setMovements)
        .catch(console.error)
    }
  }, [id, toast])

  if (!legalCase)
    return <div className="p-8 text-center text-slate-500">Carregando processo...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Scale className="w-6 h-6" /> {legalCase.case_number || 'Detalhes do Processo'}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-slate-800">{legalCase.parties}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Número do Processo</p>
              <p className="font-semibold text-slate-900">
                {legalCase.case_number || 'Não informado'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Status</p>
              <p className="font-semibold text-slate-900">
                {legalCase.lifecycle_status || 'Ativo'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Tipo</p>
              <p className="font-semibold text-slate-900">{legalCase.type || 'Processo'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Data de Distribuição</p>
              <p className="font-semibold text-slate-900">
                {legalCase.distribution_date
                  ? new Date(legalCase.distribution_date).toLocaleDateString('pt-BR')
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movements" className="w-full">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="movements" className="data-[state=active]:bg-white">
            <Clock className="w-4 h-4 mr-2" /> Movimentações
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:bg-white">
            <Briefcase className="w-4 h-4 mr-2" /> Detalhes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linha do Tempo de Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed rounded-lg bg-slate-50">
                  Nenhuma movimentação registrada.
                </div>
              ) : (
                <div className="space-y-6">
                  {movements.map((mov) => (
                    <div
                      key={mov.id}
                      className="border-b border-slate-100 pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <span className="font-bold text-primary flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(mov.event_date || mov.created).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                          {mov.description || 'Movimentação'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                        {renderMovementText(
                          mov.texto_normalizado || mov.trecho_encontrado || mov.description || '',
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {legalCase.description ||
                    legalCase.desc_obs ||
                    'Nenhuma descrição adicional informada.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
