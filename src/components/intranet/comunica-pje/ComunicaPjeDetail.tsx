import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'

export default function ComunicaPjeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id === 'temp') {
      const saved = sessionStorage.getItem('comunica_temp_detail')
      if (saved) {
        setItem(JSON.parse(saved))
      }
      setLoading(false)
      return
    }

    pb.collection('results')
      .getOne(id as string)
      .then((record) => {
        setItem(record.raw_json || record)
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return <div className="p-8 text-center text-lg text-slate-500">Carregando detalhes...</div>
  }

  if (!item) {
    return (
      <div className="p-8 text-center text-lg text-slate-500">
        <p>Comunicação não encontrada.</p>
        <Button variant="link" onClick={() => navigate('/intranet/comunicacoes')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-12">
      <Button variant="ghost" className="mb-2 text-lg" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-primary">Detalhes da Comunicação</CardTitle>
          <div className="text-xl font-mono mt-2 text-slate-600">
            Processo: {item.numeroProcesso || item.numero_processo}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
            <div>
              <span className="font-bold text-slate-500 block mb-1">Tribunal:</span>
              <span className="text-slate-900 font-medium">{item.siglaTribunal || item.sigla_tribunal}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Órgão:</span>
              <span className="text-slate-900 font-medium">{item.nomeOrgao || item.nome_orgao}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Classe:</span>
              <span className="text-slate-900 font-medium">{item.nomeClasse || item.nome_classe}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Tipo de Documento:</span>
              <span className="text-slate-900 font-medium">{item.tipoDocumento || item.tipo_documento}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Data de Disponibilização:</span>
              <span className="text-slate-900 font-medium">
                {item.dataDisponibilizacao || item.data_disponibilizacao
                  ? format(new Date(item.dataDisponibilizacao || item.data_disponibilizacao), 'dd/MM/yyyy HH:mm')
                  : '-'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Link:</span>
              <span>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                    Acessar Documento Original
                  </a>
                ) : (
                  '-'
                )}
              </span>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">Texto da Comunicação</h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div 
                className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap break-words" 
                dangerouslySetInnerHTML={{ __html: item.texto || 'Nenhum texto disponível.' }} 
              />
            </div>
          </div>

          {item.destinatarios && item.destinatarios.length > 0 && (
            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-2xl font-bold mb-4 text-slate-800">Destinatários</h3>
              <div className="space-y-3">
                {item.destinatarios.map((d: any, i: number) => (
                  <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <div className="font-bold text-lg text-slate-900">{d.nome}</div>
                    {d.polo && <div className="text-slate-500 mt-1">Polo: {d.polo}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
