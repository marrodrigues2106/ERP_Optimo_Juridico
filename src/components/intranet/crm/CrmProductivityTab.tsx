import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { DashboardCrm } from '../dashboard/DashboardCrm'
import { Loader2 } from 'lucide-react'

export function CrmProductivityTab(props: any) {
  const [interactions, setInteractions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await pb.collection('crm_interactions').getFullList({
          expand: 'responsible',
          sort: '-created',
        })
        setInteractions(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DashboardCrm interactions={interactions} chartType="bar" {...props} />
    </div>
  )
}
