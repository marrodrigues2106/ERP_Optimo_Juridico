import { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function FollowButton({
  numeroProcesso,
  siglaTribunal,
  status,
  className,
}: {
  numeroProcesso: string
  siglaTribunal?: string
  status?: string
  className?: string
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isFollowing, setIsFollowing] = useState(false)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isMandatory = status === 'Ativo'

  useEffect(() => {
    if (!user || !numeroProcesso) {
      setLoading(false)
      return
    }

    if (isMandatory) {
      setIsFollowing(true)
      setLoading(false)
      return
    }

    const checkStatus = async () => {
      try {
        const records = await pb.collection('followed_processes').getFullList({
          filter: `numero_processo = "${numeroProcesso}" && user_id = "${user.id}"`,
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
    checkStatus()
  }, [numeroProcesso, user])

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!user) return

    if (isMandatory) {
      toast({ title: 'Processos ativos são monitorados automaticamente.', variant: 'default' })
      return
    }

    setLoading(true)
    try {
      if (isFollowing && recordId) {
        await pb.collection('followed_processes').delete(recordId)
        setIsFollowing(false)
        setRecordId(null)
        toast({ title: 'Processo deixado de seguir.' })
      } else {
        const record = await pb.collection('followed_processes').create({
          user_id: user.id,
          numero_processo: numeroProcesso,
          sigla_tribunal: siglaTribunal || '',
        })
        setIsFollowing(true)
        setRecordId(record.id)
        toast({ title: 'Processo sendo monitorado com sucesso.' })
      }
    } catch (err) {
      toast({ title: 'Erro ao alterar monitoramento.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (!numeroProcesso) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFollow}
      disabled={loading}
      className={cn(
        'h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-100',
        isFollowing && 'text-primary',
        className,
      )}
      title={isFollowing ? 'Deixar de seguir' : 'Acompanhar este processo'}
    >
      <Bookmark className={cn('w-4 h-4', isFollowing && 'fill-current')} />
    </Button>
  )
}
