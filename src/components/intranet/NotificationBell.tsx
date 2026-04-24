import { useState, useEffect } from 'react'
import { Bell, Check, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mail } from 'lucide-react'
import { EmailSenderModal } from './EmailSenderModal'

export function NotificationBell() {
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [contextData, setContextData] = useState<any>({})
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    if (!user?.id) return
    try {
      const [notifRes, occRes] = await Promise.all([
        pb.collection('notifications').getList(1, 20, {
          filter: `user_id = "${user.id}" && is_read = false`,
          sort: '-created',
          expand: 'client',
        }),
        pb.collection('ocorrencias_dou').getList(1, 20, {
          filter: `termo_id.usuario_id = "${user.id}" && status_alerta = 'pendente'`,
          sort: '-created',
          expand: 'publicacao_id,termo_id',
        }),
      ])

      const mappedOcc = occRes.items.map((occ) => ({
        id: occ.id,
        message: `Nova ocorrência para o termo: ${occ.expand?.termo_id?.termo || 'Desconhecido'}`,
        numero_processo: occ.expand?.publicacao_id?.orgao || 'Monitoramento',
        created: occ.created,
        is_read: false,
        type: 'ocorrencia',
        original: occ,
      }))

      const mappedNotif = notifRes.items.map((n) => ({
        ...n,
        type: 'notificacao',
      }))

      const combined = [...mappedNotif, ...mappedOcc]
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, 20)

      setNotifications(combined)
      setUnreadCount(notifRes.totalItems + occRes.totalItems)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [user?.id])

  useRealtime(
    'notifications',
    (e) => {
      if (e.record.user_id === user?.id) {
        fetchNotifications()
      }
    },
    !!user?.id,
  )

  useRealtime(
    'ocorrencias_dou',
    (e) => {
      fetchNotifications()
    },
    !!user?.id,
  )

  const markAsRead = async (notif: any) => {
    try {
      if (notif.type === 'ocorrencia') {
        await pb.collection('ocorrencias_dou').update(notif.id, { status_alerta: 'visualizado' })
      } else {
        await pb.collection('notifications').update(notif.id, { is_read: true })
      }
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error(err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.map((n) => {
          if (n.type === 'ocorrencia') {
            return pb.collection('ocorrencias_dou').update(n.id, { status_alerta: 'visualizado' })
          }
          return pb.collection('notifications').update(n.id, { is_read: true })
        }),
      )
      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      console.error(err)
    }
  }

  if (!user) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-primary">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-0 text-xs text-primary hover:bg-transparent"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm p-8 text-center">
              <Bell className="w-8 h-8 mb-2 text-slate-300" />
              Nenhuma notificação nova no momento.
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex gap-3 group"
                >
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-snug break-words">
                      {notif.message}
                    </p>
                    {notif.numero_processo && (
                      <p className="text-xs font-mono text-slate-500">{notif.numero_processo}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[10px] text-slate-400">
                        {new Date(notif.created).toLocaleString()}
                      </p>
                      {notif.expand?.client?.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-primary z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedClient(notif.expand?.client)
                            setContextData({
                              case_number: notif.numero_processo || '',
                              client_name: notif.expand?.client?.name,
                            })
                            setEmailModalOpen(true)
                          }}
                        >
                          <Mail className="w-3 h-3 mr-1" /> Avisar Cliente
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-slate-400 hover:text-primary shrink-0"
                    onClick={() => markAsRead(notif)}
                    title="Marcar como lida"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full text-sm text-primary" asChild>
            <Link to="/intranet/atualizacoes">Ver Central de Alertas</Link>
          </Button>
        </div>
      </PopoverContent>

      <EmailSenderModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        client={selectedClient}
        context={contextData}
      />
    </Popover>
  )
}
