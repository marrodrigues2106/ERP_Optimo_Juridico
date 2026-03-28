import { useState, useEffect } from 'react'
import { getNotifications, markAllAsRead } from '@/services/notifications'
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
import { Bell, CheckCircle2, PlusCircle, Activity, ArrowRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function PushAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([])
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [openRegister, setOpenRegister] = useState(false)

  const load = async () => {
    try {
      const ns = await getNotifications()
      // Sort prioritizing unread items, then by date descending
      setAlerts(
        ns
          .filter((n) => n.user === user?.id && !n.is_read)
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
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    try {
      await markAllAsRead(user.id)
      toast({ title: 'Todos os alertas marcados como lidos' })
      load()
    } catch (e) {
      toast({ title: 'Erro ao marcar alertas', variant: 'destructive' })
    }
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

  const unreadCount = alerts.filter((a) => !a.is_read).length

  return (
    <Card className="border-border shadow-sm h-full flex flex-col">
      <CardHeader className="bg-slate-50 border-b py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Feed de Atualizações & Alertas</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full hidden sm:inline-block">
                {unreadCount} Não lidos
              </span>
            )}
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8 text-xs">
                Marcar todos lidos
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Nenhum alerta ou atualização pendente.
          </p>
        ) : (
          <div className="divide-y">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'p-4 flex gap-4 items-start transition-colors',
                  a.is_read ? 'bg-white opacity-70' : 'bg-blue-50/40 hover:bg-blue-50/60',
                )}
              >
                <div className="mt-1 shrink-0">
                  {a.type === 'discovery' ? (
                    <Bell
                      className={cn(
                        'w-5 h-5',
                        a.is_read ? 'text-slate-400' : 'text-blue-600 fill-blue-100',
                      )}
                    />
                  ) : a.type === 'gazette' ? (
                    <BookOpen
                      className={cn(
                        'w-5 h-5',
                        a.is_read ? 'text-slate-400' : 'text-amber-500 fill-amber-100',
                      )}
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-2.5 h-2.5 rounded-full mt-1.5',
                        a.is_read ? 'bg-slate-300' : 'bg-primary',
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium leading-relaxed',
                      a.is_read ? 'text-slate-600' : 'text-slate-900',
                    )}
                  >
                    {a.update_content}
                  </p>

                  {a.type === 'gazette' && a.discovered_data && (
                    <div className="mt-2 space-y-2">
                      {a.discovered_data.excerpt && (
                        <div className="bg-amber-50/50 border-l-2 border-amber-400 p-2.5 rounded-r-md">
                          <p className="text-xs text-slate-700 italic line-clamp-3">
                            "{a.discovered_data.excerpt}"
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {a.discovered_data.source && (
                          <span>
                            <strong className="font-semibold text-slate-700">Órgão emissor:</strong>{' '}
                            {a.discovered_data.source}
                          </span>
                        )}
                        {a.discovered_data.date && (
                          <span>
                            <strong className="font-semibold text-slate-700">Data:</strong>{' '}
                            {new Date(a.discovered_data.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-2">
                    {new Date(a.created).toLocaleString()}
                    {a.type === 'discovery' && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                        Novo Descoberto
                      </span>
                    )}
                    {a.type === 'gazette' && (
                      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                        Diário Oficial
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-3 bg-white"
                      onClick={() => handleMarkRead(a.id, a.is_read)}
                    >
                      <CheckCircle2
                        className={cn(
                          'w-3.5 h-3.5 mr-1.5',
                          a.is_read ? 'text-slate-400' : 'text-emerald-500',
                        )}
                      />
                      {a.is_read ? 'Marcar Não Lido' : 'Marcar Lido'}
                    </Button>
                    {a.type === 'discovery' && !a.is_read && (
                      <Button
                        size="sm"
                        className="h-8 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          setSelectedAlert(a)
                          setOpenRegister(true)
                        }}
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Registrar Processo
                      </Button>
                    )}
                    {a.type !== 'discovery' && a.lawsuit && (
                      <Button size="sm" variant="secondary" className="h-8 text-xs px-3" asChild>
                        <Link to={`/intranet/processos/${a.lawsuit}`}>
                          <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Ver Processo
                        </Link>
                      </Button>
                    )}
                    {a.type === 'gazette' && a.discovered_data?.url && (
                      <Button size="sm" variant="outline" className="h-8 text-xs px-3" asChild>
                        <a href={a.discovered_data.url} target="_blank" rel="noreferrer">
                          <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Ver Documento Original
                        </a>
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
