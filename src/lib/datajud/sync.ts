import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

export async function resolveCourtAlias(courtName: string): Promise<string> {
  if (!courtName) return 'api_publica_tjrj'
  const normalized = courtName.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalized.startsWith('tjrj')) return 'api_publica_tjrj'
  if (normalized.startsWith('trf1')) return 'api_publica_trf1'
  if (normalized.startsWith('trf')) return `api_publica_${normalized.substring(0, 4)}`
  if (normalized.startsWith('tj')) return `api_publica_${normalized.substring(0, 4)}`
  return 'api_publica_tjrj'
}

export async function runDatajudSync(caseRecord: any, onProgress: (msg: string) => void) {
  if (!caseRecord.case_number) throw new Error('Número do processo ausente.')
  onProgress('Iniciando sincronização com DataJud...')

  let alias = caseRecord.court_alias
  if (!alias) {
    alias = await resolveCourtAlias(caseRecord.court || '')
  }

  const num = String(caseRecord.case_number).replace(/\D/g, '')

  onProgress(`Buscando dados no tribunal (${alias})...`)

  const payload = {
    size: 1,
    query: { term: { 'numeroProcesso.keyword': num } },
  }

  const res = await pb.send('/backend/v1/datajud/search', {
    method: 'POST',
    body: JSON.stringify({ alias, payload }),
  })

  if (!res.hits?.hits || res.hits.hits.length === 0) {
    throw new Error(`Processo não encontrado no DataJud (alias: ${alias})`)
  }

  const source = res.hits.hits[0]._source
  const movements = source.movimentos || []

  onProgress(`Encontrados ${movements.length} movimentos. Sincronizando...`)

  let syncCount = 0
  for (let i = 0; i < movements.length; i++) {
    const mov = movements[i]
    const extId = `datajud_${caseRecord.id}_${mov.identificadorMovimento || i}`

    try {
      await pb.collection('case_movements').create({
        case: caseRecord.id,
        event_date: mov.dataHora || new Date().toISOString(),
        description: mov.nome || 'Movimentação registrada',
        source: 'DataJud',
        external_id: extId,
      })
      syncCount++
    } catch (e: any) {
      if (e instanceof ClientResponseError && e.status === 400) {
        continue
      }
    }
  }

  await pb.collection('legal_cases').update(caseRecord.id, {
    datajud_sync_status: 'Synced',
    datajud_last_sync: new Date().toISOString(),
    court_alias: alias,
  })

  onProgress(`Sincronização concluída com sucesso. ${syncCount} novos andamentos adicionados.`)
  return syncCount
}

export function categorizeError(error: any) {
  let category = 'Unknown'
  let message = 'Ocorreu um erro inesperado.'
  let status = 500

  if (error instanceof ClientResponseError) {
    status = error.status
    if (status === 0) {
      category = 'Network Error'
      message = 'Falha de rede. Verifique sua conexão.'
    } else if (status === 404) {
      category = 'Not Found'
      message = 'Registro não encontrado.'
    } else if (status === 401 || status === 403) {
      category = 'Permission Denied'
      message = 'Permissão negada. Operação restrita.'
    } else if (status === 400) {
      category = 'Integrity Error'
      message = 'Falha de validação ou integridade na operação.'
    } else {
      message = error.message
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  return { category, message, status }
}
