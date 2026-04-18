import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'

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
        <Button variant="link" onClick={() => navigate('/intranet/comunicacoes')}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 animate-fade-in-up pb-12">
      <Button variant="ghost" className="mb-2 text-base font-semibold" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <Card className="border-slate-200 shadow-sm w-full">
        <CardHeader className="border-b border-slate-100 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">
            Detalhes da Comunicação PJe
          </CardTitle>
          <div className="text-lg font-mono mt-3 text-slate-600 bg-slate-50 inline-block px-3 py-1 rounded-md border border-slate-200">
            Processo: {item.numeroProcesso || item.numero_processo}
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">
                Tribunal
              </span>
              <span className="text-slate-900 font-medium text-base">
                {item.siglaTribunal || item.sigla_tribunal || '-'}
              </span>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">
                Órgão
              </span>
              <span className="text-slate-900 font-medium text-base">
                {item.nomeOrgao || item.nome_orgao || '-'}
              </span>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">
                Classe
              </span>
              <span className="text-slate-900 font-medium text-base">
                {item.nomeClasse || item.nome_classe || '-'}
              </span>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">
                Tipo de Documento
              </span>
              <span className="text-slate-900 font-medium text-base">
                {item.tipoDocumento || item.tipo_documento || '-'}
              </span>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">
                Data de Disponibilização
              </span>
              <span className="text-slate-900 font-medium text-base">
                {item.dataDisponibilizacao || item.data_disponibilizacao
                  ? format(
                      new Date(item.dataDisponibilizacao || item.data_disponibilizacao),
                      'dd/MM/yyyy HH:mm',
                    )
                  : '-'}
              </span>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-500 block mb-1 text-xs uppercase tracking-wider">
                Link Original
              </span>
              <span>
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium text-base flex items-center gap-1"
                  >
                    Acessar Documento
                  </a>
                ) : (
                  '-'
                )}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">
              Texto da Comunicação
            </h3>
            <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-inner min-h-[400px]">
              <div
                className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-serif"
                dangerouslySetInnerHTML={{ __html: item.texto || 'Nenhum texto disponível.' }}
              />
            </div>
          </div>

          {item.destinatarios && item.destinatarios.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">
                Destinatários
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.destinatarios.map((d: any, i: number) => (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col"
                  >
                    <span className="font-bold text-base text-slate-900">{d.nome}</span>
                    {d.polo && (
                      <span className="text-sm text-slate-500 mt-1 uppercase tracking-wider font-medium">
                        Polo: {d.polo}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
