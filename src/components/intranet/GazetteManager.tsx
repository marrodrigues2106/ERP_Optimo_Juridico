import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Search } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { PublicationCard } from './cases/PublicationCard'

export default function GazetteManager() {
  const [publications, setPublications] = useState<any[]>([])
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const pubs = await pb.collection('gazette_publications').getList(1, 50, {
        sort: '-data_publicacao',
        expand: 'diario',
      })
      setPublications(pubs.items)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('gazette_publications', loadData)

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
            <Search className="w-6 h-6" /> Monitoramento DOU e Diários Oficiais
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resultados das buscas ativas em diários.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/intranet/profile')}>
          <Settings className="w-4 h-4 mr-2" /> Configurações de Monitoramento
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-lg">Publicações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {publications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>Nenhuma publicação encontrada para os termos monitorados.</p>
              <Button variant="link" onClick={() => navigate('/intranet/profile')} className="mt-2">
                Cadastrar novos termos
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 p-4 space-y-4">
              {publications.map((pub) => (
                <PublicationCard key={pub.id} item={pub} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
