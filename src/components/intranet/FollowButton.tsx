import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FollowButtonProps {
  numeroProcesso: string
  status?: string
}

export function FollowButton({ numeroProcesso, status }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const isForcedActive = status === 'Ativo'

  useEffect(() => {
    checkStatus()
  }, [numeroProcesso])

  const checkStatus = async () => {
    try {
      const userId = pb.authStore.record?.id
      if (!userId) return

      const records = await pb.collection('followed_processes').getFullList({
        filter: `user_id = '${userId}' && numero_processo = '${numeroProcesso}'`,
      })

      if (records.length > 0) {
        setIsFollowing(true)
        setRecordId(records[0].id)
      } else {
        setIsFollowing(false)
        setRecordId(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleFollow = async () => {
    if (isForcedActive) return

    const userId = pb.authStore.record?.id
    if (!userId) return

    setLoading(true)
    try {
      if (isFollowing && recordId) {
        await pb.collection('followed_processes').delete(recordId)
        setIsFollowing(false)
        setRecordId(null)
        toast({ title: 'Monitoramento desativado' })
      } else {
        const record = await pb.collection('followed_processes').create({
          user_id: userId,
          numero_processo: numeroProcesso,
        })
        setIsFollowing(true)
        setRecordId(record.id)
        toast({ title: 'Monitoramento ativado' })
      }
    } catch (err) {
      toast({ title: 'Erro ao alterar monitoramento', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="h-8 w-8 bg-white/50 border border-slate-200"
      >
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </Button>
    )
  }

  const buttonContent = (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFollow}
      disabled={isForcedActive}
      className={`h-8 w-8 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm ${
        isFollowing || isForcedActive ? 'text-primary' : 'text-slate-400'
      }`}
    >
      {isFollowing || isForcedActive ? (
        <Bell className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
    </Button>
  )

  if (isForcedActive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block cursor-not-allowed">{buttonContent}</div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-800 text-white text-xs border-none">
            <p>Monitoramento obrigatório para processos ativos.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent className="bg-slate-800 text-white text-xs border-none">
          <p>{isFollowing ? 'Parar de monitorar' : 'Monitorar processo'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
