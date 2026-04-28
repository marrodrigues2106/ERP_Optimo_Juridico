import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Check, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function PjeSavedTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadItems = async () => {
    setLoading(true)
    try {
      const records = await pb.collection('pje_communications').getList(1, 50, {
        sort: '-created',
        expand: 'linked_case',
        filter: 'is_saved = true',
      })
      setItems(records.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  useRealtime('pje_communications', () => {
    loadItems()
  })

  const toggleRead = async (id: string, current: boolean) => {
    await pb.collection('pje_communications').update(id, { is_read: !current })
    loadItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta comunicação salva definitivamente?')) return
    await pb.collection('pje_communications').delete(id)
    loadItems()
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Atualizar
        </Button>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'p-5 border rounded-xl flex gap-4 transition-colors',
            item.is_read ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-200 shadow-sm',
          )}
        >
          <div className="flex-1">
            <div className="flex justify-between mb-2 items-center">
              <h4
                className={cn(
                  'font-bold text-lg',
                  item.is_read ? 'text-slate-600' : 'text-slate-900',
                )}
              >
                {item.numeroProcesso}
              </h4>
              <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border shadow-sm">
                {new Date(item.dataDisponibilizacao || item.created).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p
              className={cn(
                'text-sm mb-4 leading-relaxed line-clamp-3',
                item.is_read ? 'text-slate-500' : 'text-slate-700',
              )}
            >
              {item.texto}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-auto text-xs font-semibold">
              <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                {item.siglaTribunal || 'N/A'}
              </span>
              {item.tipoComunicacao && (
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  {item.tipoComunicacao}
                </span>
              )}

              {item.expand?.linked_case && (
                <Link
                  to={`/intranet/processos/${item.linked_case}`}
                  className="text-primary hover:text-primary/80 flex items-center bg-primary/5 px-2 py-1 rounded transition-colors"
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Ver Processo
                </Link>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                className="ml-auto h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleRead(item.id, item.is_read)}
                className={cn(
                  'h-8',
                  item.is_read
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-primary hover:text-primary/80',
                )}
              >
                <Check className="w-4 h-4 mr-1.5" />{' '}
                {item.is_read ? 'Mover para Não Lidos' : 'Marcar como Lido'}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 bg-slate-50 border border-dashed rounded-xl">
          <p className="text-slate-500 font-medium">Nenhuma comunicação salva no sistema.</p>
        </div>
      )}
    </div>
  )
}
