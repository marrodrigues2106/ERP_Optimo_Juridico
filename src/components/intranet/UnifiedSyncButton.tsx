import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'

interface UnifiedSyncButtonProps {
  className?: string
  caseId?: string
}

export function UnifiedSyncButton({ className, caseId }: UnifiedSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      if (caseId) {
        await pb.send(`/backend/v1/sync/case/${caseId}`, { method: 'GET' })
      } else {
        await pb.send('/backend/v1/sync/all', { method: 'GET' })
      }
      toast({ title: 'Sincronização concluída com sucesso.' })
    } catch (error) {
      toast({
        title: 'Erro na sincronização',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setTimeout(() => setIsSyncing(false), 1000)
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className={cn('bg-white', className)}
    >
      <RefreshCw className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
      {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
    </Button>
  )
}
