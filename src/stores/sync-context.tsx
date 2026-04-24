import { createContext, useContext, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface SyncProgress {
  current: number
  total: number
  currentCase: string
}

interface SyncContextType {
  isBatchSyncing: boolean
  batchProgress: SyncProgress
  startBatchSync: (casesToSync: any[]) => Promise<void>
}

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export const useSync = () => {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [isBatchSyncing, setIsBatchSyncing] = useState(false)
  const [batchProgress, setBatchProgress] = useState<SyncProgress>({
    current: 0,
    total: 0,
    currentCase: '',
  })
  const { toast } = useToast()

  const startBatchSync = async (casesToSync: any[]) => {
    if (casesToSync.length === 0) return
    setIsBatchSyncing(true)
    setBatchProgress({ current: 0, total: casesToSync.length, currentCase: '' })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < casesToSync.length; i++) {
      const c = casesToSync[i]
      setBatchProgress({
        current: i + 1,
        total: casesToSync.length,
        currentCase: c.case_number || 'Sem número',
      })

      try {
        await pb
          .collection('legal_cases')
          .update(c.id, { sync_status: 'syncing' })
          .catch(() => {})

        const cleanNumber = (c.case_number || '').replace(/\D/g, '')
        if (cleanNumber.length !== 20) {
          throw new Error('Número do processo deve ter 20 dígitos')
        }

        const response = await fetch(
          `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${cleanNumber}`,
          { headers: { Accept: 'application/json' } },
        )

        if (!response.ok) throw new Error(`Erro na API do PJe (${response.status})`)

        const data = await response.json()
        const items = data.items || []

        if (items.length > 0) {
          for (const item of items) {
            const externalId = `pje_${item.id || item.numeroComunicacao || item.hash}`
            try {
              await pb.collection('case_movements').create({
                case: c.id,
                event_date: item.dataDisponibilizacao || new Date().toISOString(),
                description: item.tipoComunicacao || 'Comunicação PJe',
                source: 'PJe',
                external_id: externalId,
                details: item.texto || '',
                organization: c.organization,
                movement_details: item,
                external_link: item.link || item.url || null,
              })
            } catch (err: any) {
              if (err?.response?.data?.external_id?.code !== 'validation_not_unique') {
                console.warn(`Failed to save movement ${externalId}:`, err)
              }
            }
          }
        }

        await pb
          .collection('legal_cases')
          .update(c.id, {
            sync_status: 'updated',
            last_sync_attempt: new Date().toISOString(),
          })
          .catch(() => {})

        successCount++
      } catch (err: any) {
        failCount++
        await pb
          .collection('legal_cases')
          .update(c.id, {
            sync_status: 'error',
            last_sync_attempt: new Date().toISOString(),
          })
          .catch(() => {})
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    setIsBatchSyncing(false)
    toast({
      title: 'Sincronização em Lote Concluída',
      description: `Sucesso: ${successCount} processos atualizados. Falhas: ${failCount}.`,
    })
  }

  return (
    <SyncContext.Provider value={{ isBatchSyncing, batchProgress, startBatchSync }}>
      {children}
    </SyncContext.Provider>
  )
}
