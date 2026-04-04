import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, ArrowRight } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ClientCasesTab({ clientId }: { clientId: string }) {
  const [cases, setCases] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    pb.collection('legal_cases')
      .getFullList({ filter: `client = '${clientId}' && deleted_at = ""` })
      .then(setCases)
      .catch(console.error)
  }, [clientId])

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b py-4">
        <CardTitle className="text-lg flex items-center">
          <Scale className="w-5 h-5 mr-2 text-primary" /> Processos & Serviços Vinculados
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {cases.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Scale className="w-8 h-8 mx-auto opacity-20 mb-2" />
              <p>Nenhum processo ou serviço vinculado a este cliente.</p>
            </div>
          ) : (
            cases.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => navigate(`/intranet/processos/${c.id}`)}
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {c.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${c.lifecycle_status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {c.lifecycle_status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">
                      {c.case_number || c.parties || 'Processo sem numeração'}
                    </h4>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{c.parties}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-medium text-slate-400">Tribunal</p>
                      <p className="text-sm text-slate-700">{c.court || '-'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-slate-400 hover:text-primary"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
