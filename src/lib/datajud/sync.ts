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
  if (!caseRecord.id) throw new Error('ID do processo ausente.')

  if (!caseRecord.court_alias && caseRecord.case_number) {
    onProgress(
      'Aviso: Tribunal não especificado no processo. Tentando deduzir a partir do número...',
    )
  } else if (!caseRecord.court_alias) {
    throw new Error(
      'Tribunal não especificado no processo. Edite o processo e selecione um tribunal válido para sincronização.',
    )
  }

  onProgress('Verificando configurações de monitoramento...')
  try {
    const configs = await pb.collection('monitoring_configs').getFullList()
    if (configs.length > 0) {
      const config = configs[0]
      const tribunais = config.tribunais || []
      if (caseRecord.court_alias && !tribunais.includes(caseRecord.court_alias)) {
        throw new Error(
          `O tribunal '${caseRecord.court_alias}' não está habilitado nas configurações de monitoramento. Acesse a Intranet > Monitoramento e adicione-o.`,
        )
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('O tribunal')) throw err
    // ignore se configs não puderem ser acessadas
  }

  onProgress('Iniciando sincronização com DataJud...')

  try {
    const res = await pb.send(`/backend/v1/datajud/background-sync/${caseRecord.id}`, {
      method: 'POST',
    })
    if (res.status === 'ok') {
      onProgress('Sincronização concluída com sucesso.')
      return true
    } else if (res.status === 'not_found') {
      throw new Error('Processo não encontrado no tribunal.')
    } else {
      throw new Error(res.detail || 'Erro na sincronização.')
    }
  } catch (err: any) {
    let msg = err.message || 'Erro desconhecido'
    if (err.response && err.response.detail) {
      msg = err.response.detail
    }
    throw new Error(msg)
  }
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
