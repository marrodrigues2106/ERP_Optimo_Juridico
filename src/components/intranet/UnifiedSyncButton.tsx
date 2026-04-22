import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface UnifiedSyncButtonProps {
  caseIds?: string[]
  caseId?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  label?: string
  onComplete?: () => void
}

export function UnifiedSyncButton({
  caseIds,
  caseId,
  className,
  variant = 'outline',
  label,
  onComplete,
}: UnifiedSyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    setSyncing(true)
    try {
      const payload: any = {}
      if (caseIds && caseIds.length > 0) payload.caseIds = caseIds
      if (caseId) payload.caseId = caseId

      const res = await pb.send('/backend/v1/sync-followed', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({
        title: 'Sincronização PJe Concluída',
        description:
          res.newCount > 0
            ? `Foram encontradas ${res.newCount} novas movimentações.`
            : 'Nenhuma nova movimentação encontrada.',
      })
      if (onComplete) onComplete()
    } catch (err: any) {
      toast({
        title: 'Erro na Sincronização',
        description: err.message || 'Ocorreu um erro ao sincronizar os processos.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleSync}
      disabled={syncing}
      className={cn('shadow-sm transition-all', className)}
    >
      <RefreshCw className={cn('w-4 h-4 mr-2', syncing && 'animate-spin text-blue-500')} />
      {syncing ? 'Sincronizando...' : label || 'Sincronizar Monitorados'}
    </Button>
  )
}
