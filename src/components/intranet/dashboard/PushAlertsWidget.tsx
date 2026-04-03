import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Plus } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { EventFormModal } from '../cases/EventFormModal'

export function PushAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const navigate = useNavigate()

  const loadAlerts = async () => {
    try {
      const gazettes = await pb.collection('gazette_publications').getList(1, 10, {
        filter: 'is_read = false',
        sort: '-created',
      })
      const followUps = await pb.collection('crm_interactions').getList(1, 5, {
        filter: 'status = "Pending" && follow_up_date != ""',
        sort: 'follow_up_date',
        expand: 'linked_case',
      })
      const movements = await pb.collection('case_movements').getList(1, 5, {
        sort: '-event_date',
        expand: 'case',
      })

      const combined = [
        ...gazettes.items.map((g) => ({
          id: g.id,
          type: 'gazette',
          title: 'Nova publicação',
          desc: `${g.orgao || 'Órgão'} - Termo: ${g.matched_term || 'Indefinido'}`,
          date: g.created,
          raw: g,
        })),
        ...followUps.items.map((f) => ({
          id: f.id,
          type: 'crm',
          title: `Follow-up: ${f.type}`,
          desc: f.description,
          date: f.follow_up_date,
          raw: f,
          lawsuitId: f.expand?.linked_case?.id,
          caseNumber: f.expand?.linked_case?.case_number || 'Processo',
        })),
        ...movements.items.map((m) => ({
          id: m.id,
          type: 'movement',
          title: `Movimentação`,
          desc: m.description,
          date: m.event_date,
          raw: m,
          lawsuitId: m.case,
          caseNumber: m.expand?.case?.case_number || m.expand?.case?.parties || 'Acessar Processo',
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)

      setAlerts(combined)
    } catch (e) {
      console.error('Error loading alerts', e)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  useRealtime('gazette_publications', loadAlerts)
  useRealtime('crm_interactions', loadAlerts)
  useRealtime('case_movements', loadAlerts)

  const handleAlertClick = (a: any) => {
    if (a.type === 'gazette') {
      navigate('/intranet/diarios-oficiais')
    } else if (a.type === 'crm') {
      navigate('/intranet/crm')
    } else if (a.lawsuitId) {
      navigate(`/intranet/processos/${a.lawsuitId}`)
    }
  }

  const openEvent = (e: React.MouseEvent, a: any) => {
    e.stopPropagation()
    setSelectedAlert(a)
    setEventModalOpen(true)
  }

  return (
    <>
      <Card className="h-full flex flex-col shadow-sm border-slate-200 bg-white">
        <CardHeader className="pb-3 border-b bg-white">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-800">
              <Bell className="w-5 h-5 text-primary" />
              Publicações e Andamentos
            </span>
            <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">
              {alerts.length} não lidos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {alerts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
              <Bell className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-sm">Nenhum alerta ou publicação pendente no momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-2 cursor-pointer"
                  onClick={() => handleAlertClick(a)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800">{a.title}</span>
                        {a.lawsuitId && (
                          <Link
                            to={`/intranet/processos/${a.lawsuitId}`}
                            className="text-xs font-medium text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {a.caseNumber}
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{a.desc}</p>
                      <span className="text-[10px] text-slate-400 mt-2 block">
                        {new Date(a.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs bg-white border shadow-sm"
                        onClick={(e) => openEvent(e, a)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Evento
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EventFormModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        lawsuitId={selectedAlert?.lawsuitId}
        prefilledDescription={
          selectedAlert ? `Ref: ${selectedAlert.title} - ${selectedAlert.desc}` : ''
        }
        onSuccess={() => {
          setEventModalOpen(false)
          setSelectedAlert(null)
        }}
      />
    </>
  )
}
