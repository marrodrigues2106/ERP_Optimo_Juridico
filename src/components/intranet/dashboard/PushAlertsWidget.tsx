import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Plus, CheckSquare, Square, Mail, MailOpen } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { EventFormModal } from '../cases/EventFormModal'
import { cn } from '@/lib/utils'

export function PushAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [selectedEventAlert, setSelectedEventAlert] = useState<any>(null)
  const navigate = useNavigate()

  const loadAlerts = async () => {
    try {
      const gazettes = await pb.collection('gazette_publications').getList(1, 15, {
        sort: '-created',
      })
      const followUps = await pb.collection('crm_interactions').getList(1, 15, {
        sort: '-follow_up_date',
        expand: 'linked_case',
      })
      const movements = await pb.collection('case_movements').getList(1, 15, {
        sort: '-event_date',
        expand: 'case',
      })

      const combined = [
        ...gazettes.items.map((g) => ({
          id: g.id,
          type: 'gazette',
          category: 'Publicação',
          title: 'Nova publicação no Diário',
          desc: `${g.orgao || 'Órgão'} - Termo: ${g.matched_term || 'Indefinido'}`,
          date: g.created,
          isRead: g.is_read,
          raw: g,
          lawsuitId: g.numero_processo?.[0] ? null : null, // Future connection directly
          caseNumber: g.numero_processo?.[0] || '',
        })),
        ...followUps.items.map((f) => ({
          id: f.id,
          type: 'crm',
          category: 'CRM / Tarefa',
          title: `Follow-up: ${f.type}`,
          desc: f.description,
          date: f.follow_up_date || f.created,
          isRead: f.status === 'Completed',
          raw: f,
          lawsuitId: f.expand?.linked_case?.id,
          caseNumber:
            f.expand?.linked_case?.case_number || f.expand?.linked_case?.parties || 'Processo',
        })),
        ...movements.items.map((m) => ({
          id: m.id,
          type: 'movement',
          category: 'Movimentação',
          title: `Andamento de Processo`,
          desc: m.description,
          date: m.event_date,
          isRead: m.notified_client, // Utilized as read indicator
          raw: m,
          lawsuitId: m.case,
          caseNumber: m.expand?.case?.case_number || m.expand?.case?.parties || 'Acessar Processo',
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 25)

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
    if (a.lawsuitId) {
      navigate(`/intranet/processos/${a.lawsuitId}`)
    } else if (a.type === 'gazette') {
      navigate('/intranet/diarios-oficiais')
    } else if (a.type === 'crm') {
      navigate('/intranet/crm')
    }
  }

  const openEvent = (e: React.MouseEvent, a: any) => {
    e.stopPropagation()
    setSelectedEventAlert(a)
    setEventModalOpen(true)
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedAlerts)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedAlerts(newSet)
  }

  const selectAll = () => {
    setSelectedAlerts(new Set(alerts.map((a) => a.id)))
  }

  const deselectAll = () => {
    setSelectedAlerts(new Set())
  }

  const markSelectedAs = async (read: boolean) => {
    if (selectedAlerts.size === 0) return

    setAlerts((prev) => prev.map((a) => (selectedAlerts.has(a.id) ? { ...a, isRead: read } : a)))

    const promises = Array.from(selectedAlerts).map(async (id) => {
      const alert = alerts.find((a) => a.id === id)
      if (!alert) return

      try {
        if (alert.type === 'gazette') {
          await pb.collection('gazette_publications').update(id, { is_read: read })
        } else if (alert.type === 'crm') {
          await pb
            .collection('crm_interactions')
            .update(id, { status: read ? 'Completed' : 'Pending' })
        } else if (alert.type === 'movement') {
          await pb.collection('case_movements').update(id, { notified_client: read })
        }
      } catch (err) {
        console.error('Error updating alert', id, err)
      }
    })

    await Promise.all(promises)
    setSelectedAlerts(new Set())
  }

  const unreadCount = alerts.filter((a) => !a.isRead).length

  return (
    <>
      <Card className="h-full flex flex-col shadow-sm border-slate-200 bg-white">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-800">
              <Bell className="w-5 h-5 text-primary" />
              Central de Atualizações
            </span>
            <span className="text-xs font-medium text-white bg-primary px-2.5 py-0.5 rounded-full shadow-sm">
              {unreadCount} não lidos
            </span>
          </CardTitle>
          {alerts.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectedAlerts.size === alerts.length ? deselectAll : selectAll}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm"
                >
                  {selectedAlerts.size === alerts.length ? (
                    <Square className="w-4 h-4 mr-1.5" />
                  ) : (
                    <CheckSquare className="w-4 h-4 mr-1.5" />
                  )}
                  {selectedAlerts.size === alerts.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                </Button>
                {selectedAlerts.size > 0 && (
                  <span className="text-xs text-muted-foreground ml-2 font-medium">
                    {selectedAlerts.size} selecionado(s)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-white"
                  disabled={selectedAlerts.size === 0}
                  onClick={() => markSelectedAs(true)}
                >
                  <MailOpen className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Marcar Lido
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-white"
                  disabled={selectedAlerts.size === 0}
                  onClick={() => markSelectedAs(false)}
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Marcar Não Lido
                </Button>
              </div>
            </div>
          )}
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
                  className={cn(
                    'p-4 transition-all duration-200 flex items-start gap-3 cursor-pointer group',
                    a.isRead
                      ? 'bg-slate-50/70 hover:bg-slate-100/70'
                      : 'bg-white hover:bg-slate-50',
                  )}
                  onClick={() => handleAlertClick(a)}
                >
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedAlerts.has(a.id)}
                      onCheckedChange={() => toggleSelection(a.id)}
                      className={cn(!a.isRead && 'border-primary')}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col w-full">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={cn(
                              'text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-sm',
                              a.type === 'gazette'
                                ? 'bg-blue-100 text-blue-700'
                                : a.type === 'crm'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-emerald-100 text-emerald-700',
                            )}
                          >
                            {a.category}
                          </span>
                          {!a.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_0_2px_rgba(59,130,246,0.2)]" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'text-sm',
                              a.isRead ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold',
                            )}
                          >
                            {a.title}
                          </span>

                          {a.caseNumber &&
                            (a.lawsuitId ? (
                              <Link
                                to={`/intranet/processos/${a.lawsuitId}`}
                                className="text-[11px] font-semibold text-primary hover:text-white bg-primary/10 hover:bg-primary px-2 py-0.5 rounded transition-colors inline-flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {a.caseNumber}
                              </Link>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-flex items-center border border-slate-200">
                                {a.caseNumber}
                              </span>
                            ))}
                        </div>
                        <p
                          className={cn(
                            'text-xs mt-1.5 line-clamp-2',
                            a.isRead ? 'text-slate-500' : 'text-slate-600 font-medium',
                          )}
                        >
                          {a.desc}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                          {new Date(a.date).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(a.date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border-slate-200 text-slate-700 hover:bg-slate-100"
                          onClick={(e) => openEvent(e, a)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Evento
                        </Button>
                      </div>
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
        lawsuitId={selectedEventAlert?.lawsuitId}
        prefilledDescription={
          selectedEventAlert ? `Ref: ${selectedEventAlert.title} - ${selectedEventAlert.desc}` : ''
        }
        onSuccess={() => {
          setEventModalOpen(false)
          setSelectedEventAlert(null)
        }}
      />
    </>
  )
}
