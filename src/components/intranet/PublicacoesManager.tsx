import { useState, useEffect } from 'react'
import { getNotifications, markAllAsRead, markMultipleAsRead } from '@/services/notifications'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/hooks/use-realtime'
import { Inbox, BookOpen, Landmark, Bell, CheckCircle2, Archive, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export default function PublicacoesManager() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState('inbox')
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])

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

  useEffect(() => {
    setSelectedItems([])
  }, [filter, search])

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredItems.map((n) => n.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, id])
    } else {
      setSelectedItems((prev) => prev.filter((i) => i !== id))
    }
  }

  const handleBulkAction = async (markAsRead: boolean) => {
    if (selectedItems.length === 0) return
    const ids = [...selectedItems]

    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: markAsRead } : n)),
    )
    setSelectedItems([])

    try {
      await markMultipleAsRead(ids, markAsRead)
    } catch (e) {
      load()
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 h-[calc(100vh-120px)] animate-fade-in">
      <Card className="w-full md:w-72 shrink-0 flex flex-col border-slate-200 shadow-sm">
        <CardHeader className="p-5 border-b border-slate-100">
          <CardTitle className="text-xl">Caixas</CardTitle>
        </CardHeader>
        <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
          <Button
            variant={filter === 'inbox' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-base py-5 h-auto"
            onClick={() => setFilter('inbox')}
          >
            <Inbox className="w-5 h-5 mr-3" /> Caixa de Entrada
            <span className="ml-auto bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
              {notifications.filter((n) => !n.is_read).length}
            </span>
          </Button>
          <Button
            variant={filter === 'gazette' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-base py-5 h-auto"
            onClick={() => setFilter('gazette')}
          >
            <BookOpen className="w-5 h-5 mr-3" /> Diários Oficiais
          </Button>
          <Button
            variant={filter === 'court' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-base py-5 h-auto"
            onClick={() => setFilter('court')}
          >
            <Landmark className="w-5 h-5 mr-3" /> Tribunais (DataJud)
          </Button>
          <Button
            variant={filter === 'discovery' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-base py-5 h-auto"
            onClick={() => setFilter('discovery')}
          >
            <Bell className="w-5 h-5 mr-3" /> Novos Processos
          </Button>
          <Button
            variant={filter === 'archive' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-base py-5 h-auto"
            onClick={() => setFilter('archive')}
          >
            <Archive className="w-5 h-5 mr-3" /> Arquivo (Lidos)
          </Button>
          <div className="pt-6 mt-6 border-t border-slate-100">
            <Button
              variant="outline"
              className="w-full justify-start bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200 text-base py-5 h-auto"
              asChild
            >
              <Link to="/intranet/busca-dou">
                <Search className="w-5 h-5 mr-3" /> Motor de Busca DOU
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="p-5 border-b bg-slate-50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar publicações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-base py-5"
              />
            </div>
            {filter === 'inbox' && (
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base font-medium"
                onClick={() => markAllAsRead(user?.id || '')}
              >
                Marcar todos como lidos
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length}
                onCheckedChange={handleSelectAll}
                disabled={filteredItems.length === 0}
              />
              <Label
                htmlFor="select-all"
                className="text-base cursor-pointer text-slate-700 font-medium"
              >
                Selecionar Todos
              </Label>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-3 animate-in fade-in duration-200">
                <span className="text-sm text-slate-500 font-medium">
                  {selectedItems.length} selecionados
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-sm px-4 py-2 bg-white"
                  onClick={() => handleBulkAction(true)}
                >
                  Marcar como Lido
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-sm px-4 py-2 bg-white"
                  onClick={() => handleBulkAction(false)}
                >
                  Marcar como Não Lido
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          <div className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-lg">
                Nenhuma notificação encontrada nesta caixa.
              </div>
            ) : (
              filteredItems.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-6 flex gap-6 hover:bg-slate-50 transition-colors',
                    !n.is_read && 'bg-blue-50/40',
                    selectedItems.includes(n.id) && 'bg-slate-100/80',
                  )}
                >
                  <div className="pt-2 flex flex-col items-center gap-4">
                    <Checkbox
                      checked={selectedItems.includes(n.id)}
                      onCheckedChange={(c) => handleSelect(n.id, !!c)}
                    />
                    {n.type === 'gazette' ? (
                      <BookOpen className="w-6 h-6 text-amber-500" />
                    ) : n.type === 'discovery' ? (
                      <Bell className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Landmark className="w-6 h-6 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                        {n.type === 'gazette' ? 'Diário Oficial' : n.type || 'Atualização'}
                      </span>
                      <span className="text-sm font-medium text-slate-400">
                        {new Date(n.created).toLocaleString()}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-lg mb-3 leading-relaxed',
                        !n.is_read ? 'font-bold text-slate-900' : 'text-slate-700 font-medium',
                      )}
                    >
                      {n.update_content}
                    </p>

                    {n.type === 'gazette' && n.discovered_data && (
                      <div className="space-y-3 mb-4">
                        {n.discovered_data.excerpt && (
                          <div className="bg-amber-50/60 border-l-4 border-amber-400 p-4 rounded-r-lg">
                            <p className="text-base text-slate-700 italic line-clamp-4">
                              "{n.discovered_data.excerpt}"
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {n.discovered_data.source && (
                            <span>
                              <strong className="font-semibold text-slate-800">
                                Órgão emissor:
                              </strong>{' '}
                              {n.discovered_data.source}
                            </span>
                          )}
                          {n.discovered_data.date && (
                            <span>
                              <strong className="font-semibold text-slate-800">
                                Data da Publicação:
                              </strong>{' '}
                              {new Date(n.discovered_data.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <Button
                        variant="ghost"
                        className="h-10 text-base font-medium px-4"
                        onClick={() => handleMarkRead(n.id, n.is_read)}
                      >
                        <CheckCircle2
                          className={cn(
                            'w-5 h-5 mr-2',
                            n.is_read ? 'text-slate-400' : 'text-emerald-500',
                          )}
                        />
                        {n.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                      </Button>
                      {n.lawsuit && (
                        <Button
                          variant="secondary"
                          className="h-10 text-base font-medium px-4"
                          asChild
                        >
                          <Link to={`/intranet/processos/${n.lawsuit}`}>Ver Processo</Link>
                        </Button>
                      )}
                      {n.type === 'gazette' && n.discovered_data?.url && (
                        <Button
                          variant="outline"
                          className="h-10 text-base font-medium px-4"
                          asChild
                        >
                          <a href={n.discovered_data.url} target="_blank" rel="noreferrer">
                            <BookOpen className="w-4 h-4 mr-2" /> Ver Documento Original
                          </a>
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
