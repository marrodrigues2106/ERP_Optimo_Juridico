import { useState, useEffect, useMemo } from 'react'
import { getLawsuits } from '@/services/lawsuits'
import { getNotifications, markLogAsRead } from '@/services/notifications'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useRealtime } from '@/hooks/use-realtime'
import { BellRing } from 'lucide-react'

export function UpdatesWidget() {
  const [lawsuits, setLawsuits] = useState<any[]>([])
  const [notifs, setNotifs] = useState<any[]>([])
  const { user } = useAuth()

  const load = async () => {
    try {
      const [ls, ns] = await Promise.all([getLawsuits(), getNotifications()])
      setLawsuits(ls)
      setNotifs(ns)
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    load()
  }, [])
  useRealtime('lawsuits', load)
  useRealtime('lawsuit_notifications', load)

  const feed = useMemo(() => {
    return lawsuits
      .flatMap((l) =>
        (l.trackingLogs || []).map((log: any) => {
          const n = notifs.find(
            (n) =>
              n.lawsuit === l.id && n.update_content === log.description && n.user === user?.id,
          )
          return {
            id: `${l.id}-${log.date}`,
            lawsuitId: l.id,
            parties: l.parties,
            date: log.date,
            desc: log.description,
            isRead: n?.is_read || false,
            notifId: n?.id,
          }
        }),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15)
  }, [lawsuits, notifs, user])

  const handleToggle = async (item: any) => {
    if (!user?.id) return
    await markLogAsRead(item.lawsuitId, item.desc, user.id, !item.isRead, item.notifId)
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="bg-slate-50 border-b py-4">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Atualizações (Datajud / D.O.)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {feed.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma atualização recente.
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {feed.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border flex gap-3 transition-colors ${
                  item.isRead
                    ? 'bg-slate-50 opacity-60'
                    : 'bg-white shadow-sm hover:border-primary/20'
                }`}
              >
                <Checkbox
                  checked={item.isRead}
                  onCheckedChange={() => handleToggle(item)}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary mb-1 truncate" title={item.parties}>
                    {item.parties}
                  </p>
                  <p className="text-sm text-slate-700 leading-snug">{item.desc}</p>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                    {new Date(item.date).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
