import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Bell, Scale, CalendarClock } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export function PushAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([])

  const loadAlerts = async () => {
    try {
      const gazettes = await pb.collection('gazette_publications').getList(1, 5, {
        filter: 'is_read = false',
        sort: '-created',
      })
      const followUps = await pb.collection('crm_interactions').getList(1, 5, {
        filter: 'status = "Pending" && follow_up_date != ""',
        sort: 'follow_up_date',
      })

      const combined = [
        ...gazettes.items.map((g) => ({
          id: g.id,
          type: 'gazette',
          title: 'Nova publicação encontrada no Diário',
          desc: `${g.orgao || 'Órgão'} - Termo: ${g.matched_term || 'Indefinido'}`,
          date: g.created,
        })),
        ...followUps.items.map((f) => ({
          id: f.id,
          type: 'crm',
          title: `Follow-up Pendente: ${f.type}`,
          desc: f.description,
          date: f.follow_up_date,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)

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

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Feed de Alertas e Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <Bell className="w-10 h-10 opacity-20 mb-3" />
            <p>Nenhum alerta ou publicação pendente no momento.</p>
          </div>
        ) : (
          <div className="divide-y">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 group cursor-default"
              >
                {a.type === 'gazette' ? (
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-full shrink-0 mt-0.5">
                    <Scale className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-full shrink-0 mt-0.5">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">{a.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{a.desc}</p>
                  <span className="text-[10px] font-medium text-muted-foreground mt-1.5 block">
                    {new Date(a.date).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
