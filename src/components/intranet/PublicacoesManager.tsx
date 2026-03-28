import { useState, useEffect } from 'react'
import { getNotifications, markAllAsRead } from '@/services/notifications'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/hooks/use-realtime'
import { Inbox, BookOpen, Landmark, Bell, CheckCircle2, Archive, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'

export default function PublicacoesManager() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState('inbox')
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const ns = await getNotifications()
      setNotifications(
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
    await pb.collection('lawsuit_notifications').update(id, { is_read: !current })
  }

  const filteredItems = notifications.filter((n) => {
    if (search && !n.update_content.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'inbox') return !n.is_read
    if (filter === 'gazette') return n.type === 'gazette'
    if (filter === 'court') return n.type === 'court' || n.type === 'update'
    if (filter === 'discovery') return n.type === 'discovery'
    if (filter === 'archive') return n.is_read
    return true
  })

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
      <Card className="w-full md:w-64 shrink-0 flex flex-col">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-lg">Caixas</CardTitle>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-y-auto space-y-1">
          <Button
            variant={filter === 'inbox' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setFilter('inbox')}
          >
            <Inbox className="w-4 h-4 mr-2" /> Caixa de Entrada
            <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {notifications.filter((n) => !n.is_read).length}
            </span>
          </Button>
          <Button
            variant={filter === 'gazette' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setFilter('gazette')}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Diários Oficiais
          </Button>
          <Button
            variant={filter === 'court' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setFilter('court')}
          >
            <Landmark className="w-4 h-4 mr-2" /> Tribunais (DataJud)
          </Button>
          <Button
            variant={filter === 'discovery' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setFilter('discovery')}
          >
            <Bell className="w-4 h-4 mr-2" /> Novos Processos
          </Button>
          <Button
            variant={filter === 'archive' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setFilter('archive')}
          >
            <Archive className="w-4 h-4 mr-2" /> Arquivo (Lidos)
          </Button>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="p-4 border-b bg-slate-50 flex flex-row items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar publicações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filter === 'inbox' && (
            <Button size="sm" variant="outline" onClick={() => markAllAsRead(user?.id || '')}>
              Marcar todos como lidos
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          <div className="divide-y">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma notificação encontrada.
              </div>
            ) : (
              filteredItems.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-4 flex gap-4 hover:bg-slate-50 transition-colors',
                    !n.is_read && 'bg-blue-50/30',
                  )}
                >
                  <div className="pt-1">
                    {n.type === 'gazette' ? (
                      <BookOpen className="w-5 h-5 text-amber-500" />
                    ) : n.type === 'discovery' ? (
                      <Bell className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Landmark className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {n.type || 'Atualização'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created).toLocaleString()}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-sm',
                        !n.is_read ? 'font-semibold text-slate-900' : 'text-slate-600',
                      )}
                    >
                      {n.update_content}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs px-2"
                        onClick={() => handleMarkRead(n.id, n.is_read)}
                      >
                        <CheckCircle2
                          className={cn(
                            'w-4 h-4 mr-1.5',
                            n.is_read ? 'text-slate-400' : 'text-emerald-500',
                          )}
                        />
                        {n.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                      </Button>
                      {n.lawsuit && (
                        <Button size="sm" variant="secondary" className="h-8 text-xs px-2" asChild>
                          <Link to={`/intranet/processos/${n.lawsuit}`}>Ver Processo</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
