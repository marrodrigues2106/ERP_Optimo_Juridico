import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

export async function resolveCourtAlias(courtName: string): Promise<string> {
  if (!courtName) return 'api_publica_tjrj'
  const normalized = courtName.toLowerCase().replace(/[^a-z0-9]/g, '')
  try {
    const tribunals = await pb.collection('tribunals').getFullList()
    const match = tribunals.find((t: any) => {
      const tNorm = t.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const tAliasNorm = t.alias.toLowerCase().replace(/[^a-z0-9]/g, '')
      return tNorm === normalized || tAliasNorm === normalized
    })
    if (match) return match.alias
  } catch (e) {
    console.warn('Failed to fetch tribunals', e)
  }

  if (normalized.startsWith('tjrj')) return 'api_publica_tjrj'
  if (normalized.startsWith('trf1')) return 'api_publica_trf1'
  if (normalized.startsWith('trf')) return `api_publica_${normalized.substring(0, 4)}`
  if (normalized.startsWith('tj')) return `api_publica_${normalized.substring(0, 4)}`

  return 'api_publica_tjrj'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function runDatajudSync(lawsuit: any, onProgress: (msg: string) => void) {
  onProgress('Resolvendo tribunal...')
  const alias = await resolveCourtAlias(lawsuit.court || lawsuit.tribunal || '')

  let searchAfter: any[] | undefined = undefined
  let page = 1
  let hasMore = true
  let totalSynced = 0

  while (hasMore) {
    onProgress(`Buscando página ${page}...`)
    const payload = {
      query: { match: { numeroProcesso: lawsuit.number.replace(/\D/g, '') } },
      sort: [{ '@timestamp': 'asc' }],
      size: 100,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    }

    let res
    let retries = 0
    while (retries < 3) {
      try {
        res = await pb.send('/backend/v1/datajud/search', {
          method: 'POST',
          body: { alias, payload },
        })
        break
      } catch (e: any) {
        const status = e.status || 500
        if (status === 400 || status === 401 || status === 403 || status === 404) {
          throw e
        }
        retries++
        if (retries === 3) throw e
        await sleep(Math.pow(2, retries) * 1000)
      }
    }

    const hits = res?.hits?.hits || []
    if (hits.length === 0) {
      hasMore = false
      break
    }

    onProgress(`Salvando ${hits.length} itens da pág ${page}...`)

    for (const hit of hits) {
      const data = hit._source
      const movimentos = data.movimentos || []

      for (const mov of movimentos) {
        const hashRaw = `${lawsuit.id}-${mov.codigo || mov.id || mov.descricao}-${mov.dataHora}`
        const hash = await sha256(hashRaw)

        try {
          await pb.collection('lawsuit_movements').create({
            lawsuit: lawsuit.id,
            event_date: mov.dataHora || new Date().toISOString(),
            description: mov.nome || mov.descricao || 'Movimento Atualizado',
            source: 'DataJud',
            hash: hash,
            metadata: mov,
          })
          totalSynced++
        } catch (e: any) {
          if (e?.response?.data?.hash?.code !== 'validation_not_unique' && e.status !== 400) {
            console.warn('Failed to create movement:', e)
          }
        }
      }

      // Update metadata
      try {
        const updateData: any = {
          datajudStatus: 'Sincronizado',
          last_sync: new Date().toISOString(),
          sync_message: `Sincronizado com sucesso (${totalSynced} movimentos)`,
        }
        if (data.classe?.nome) updateData.class = data.classe.nome
        if (data.assuntos && data.assuntos.length > 0) updateData.subject = data.assuntos[0].nome
        if (data.dataAjuizamento) updateData.distributionDate = data.dataAjuizamento

        await pb.collection('lawsuits').update(lawsuit.id, updateData)
      } catch (e) {
        console.warn('Failed to update lawsuit metadata:', e)
      }
    }

    const lastHit = hits[hits.length - 1]
    if (lastHit.sort) {
      searchAfter = lastHit.sort
      page++
      await sleep(1500) // Rate limit pause
    } else {
      hasMore = false
    }

    if (page > 15) break // Safety Limit
  }

  return totalSynced
}

export function categorizeError(error: any) {
  let category = 'unknown'
  let message = 'Ocorreu um erro inesperado.'
  let status = 500

  if (error instanceof ClientResponseError) {
    status = error.status
    const rawMessage = error.response?.message || error.message || ''
    const lowerMsg = rawMessage.toLowerCase()

    if (status === 0) {
      category = 'network'
      message = 'Falha de rede. Verifique sua conexão.'
    } else if (status === 404) {
      category = 'not_found'
      message = 'Registro não encontrado no DataJud.'
    } else if (status === 401 || status === 403) {
      category = 'permission'
      message = 'Permissão negada. Chave de API inválida.'
    } else if (status === 400) {
      if (lowerMsg.includes('something went wrong while processing your request')) {
        category = 'backend_hook'
        message = 'Erro interno no DataJud ou Hook (Backend Hook).'
      } else {
        category = 'validation'
        message = 'Falha de validação nos dados enviados.'
      }
    } else {
      message = rawMessage || 'Erro desconhecido do servidor.'
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  return { category, message, status }
}
