import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Scale, CalendarClock, Plus } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { EventFormModal } from '../cases/EventFormModal'
import { PublicationCard } from '../cases/PublicationCard'

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

      const combined = [
        ...gazettes.items.map((g) => ({
          id: g.id,
          type: 'gazette',
          title: 'Nova publicação encontrada no Diário',
          desc: `${g.orgao || 'Órgão'} - Termo: ${g.matched_term || 'Indefinido'}`,
          date: g.created,
          raw: g,
        })),
        ...followUps.items.map((f) => ({
          id: f.id,
          type: 'crm',
          title: `Follow-up Pendente: ${f.type}`,
          desc: f.description,
          date: f.follow_up_date,
          raw: f,
          lawsuitId: f.expand?.linked_case?.id,
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

  const handleAlertClick = (a: any) => {
    if (a.type === 'gazette') {
      navigate('/intranet/diarios-oficiais') // Could navigate to specific publication if route existed
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
                <PublicationCard
                  key={a.id}
                  item={a.raw}
                  onClick={() => handleAlertClick(a)}
                  showActions={
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs bg-white border shadow-sm"
                      onClick={(e) => openEvent(e, a)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Criar Evento
                    </Button>
                  }
                />
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
          // Optional: Mark as read or reload
        }}
      />
    </>
  )
}
