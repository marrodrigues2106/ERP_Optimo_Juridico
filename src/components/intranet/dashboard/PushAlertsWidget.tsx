import { useState, useEffect } from 'react'
import { getNotifications, markLogAsRead } from '@/services/notifications'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { createLawsuit } from '@/services/lawsuits'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bell, CheckCircle2, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PushAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([])
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [openRegister, setOpenRegister] = useState(false)

  const load = async () => {
    try {
      const ns = await getNotifications()
      // Sort by creation date descending
      setAlerts(
        ns
          .filter((n) => n.user === user?.id)
          .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()),
      )
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
  }, [user])
  useRealtime('lawsuit_notifications', load)

  const handleMarkRead = async (id: string, current: boolean) => {
    try {
      await pb.collection('lawsuit_notifications').update(id, { is_read: !current })
    } catch (e) {}
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await createLawsuit(Object.fromEntries(fd.entries()))
      toast({ title: 'Processo registrado com sucesso!' })
      if (selectedAlert) {
        await handleMarkRead(selectedAlert.id, false)
      }
      setOpenRegister(false)
    } catch (err) {
      toast({ title: 'Erro ao registrar processo', variant: 'destructive' })
    }
  }

  return (
    <Card className="border-border shadow-sm h-full flex flex-col">
      <CardHeader className="bg-slate-50 border-b py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Alertas de Monitoramento (Push)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum alerta pendente.</p>
        ) : (
          <div className="space-y-3 max-h-[400px]">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'p-3 border rounded-lg flex gap-3 items-start transition-colors',
                  a.is_read ? 'bg-slate-50 opacity-60' : 'bg-blue-50/30 border-blue-100 shadow-sm',
                )}
              >
                <div className="mt-1.5 shrink-0">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      a.is_read ? 'bg-slate-300' : 'bg-blue-500',
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      a.is_read ? 'text-slate-600' : 'text-slate-900',
                    )}
                  >
                    {a.update_content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {new Date(a.created).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => handleMarkRead(a.id, a.is_read)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{' '}
                      {a.is_read ? 'Marcar Não Lido' : 'Marcar Lido'}
                    </Button>
                    {a.type === 'discovery' && !a.is_read && (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          setSelectedAlert(a)
                          setOpenRegister(true)
                        }}
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1" /> Registrar Processo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={openRegister} onOpenChange={setOpenRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Processo Descoberto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label>Número do Processo</Label>
              <Input
                name="number"
                defaultValue={selectedAlert?.discovered_data?.number || ''}
                required
              />
            </div>
            <div>
              <Label>Tribunal / Órgão</Label>
              <Input name="court" defaultValue={selectedAlert?.discovered_data?.court || ''} />
            </div>
            <div>
              <Label>Partes</Label>
              <Input name="parties" defaultValue={selectedAlert?.discovered_data?.parties || ''} />
            </div>
            <div>
              <Label>Status Inicial</Label>
              <Input name="status" defaultValue="Em Andamento" />
            </div>
            <Button type="submit" className="w-full">
              Salvar e Registrar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
