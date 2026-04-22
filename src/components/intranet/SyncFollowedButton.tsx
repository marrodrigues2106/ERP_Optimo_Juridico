import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function SyncFollowedButton() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/sync-followed', { method: 'POST' })
      toast({
        title: 'Sincronização Finalizada',
        description:
          res.newCount > 0
            ? `Foram encontradas ${res.newCount} novas comunicações.`
            : 'Nenhuma nova comunicação encontrada nos processos monitorados.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro na sincronização',
        description: err?.message || 'Ocorreu um erro ao sincronizar processos seguidos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleSync} disabled={loading} className="gap-2 bg-white">
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      Sincronizar Monitorados
    </Button>
  )
}
