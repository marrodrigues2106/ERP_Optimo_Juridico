import pb from '@/lib/pocketbase/client'

export const getLawsuits = () =>
  pb.collection('lawsuits').getFullList({ sort: '-deadline', expand: 'client,collaborator' })
export const getLawsuit = (id: string) =>
  pb.collection('lawsuits').getOne(id, { expand: 'client,collaborator' })
export const createLawsuit = (data: any) => pb.collection('lawsuits').create(data)
export const updateLawsuit = (id: string, data: any) => pb.collection('lawsuits').update(id, data)
import { ClientResponseError } from 'pocketbase'

export function normalizePocketBaseError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.response?.message) {
      return error.response.message
    }
    return error.message || 'Erro desconhecido do servidor.'
  }
  if (error instanceof Error) return error.message
  return 'Ocorreu um erro inesperado.'
}

export const deleteLawsuit = async (id: string, instance = pb) => {
  let checkedBeforeDelete = false
  try {
    // Pre-Deletion Verification Check
    await instance.collection('lawsuits').getOne(id)
    checkedBeforeDelete = true

    await instance.collection('lawsuits').delete(id)
    return { success: true, message: 'Registro deletado com sucesso.' }
  } catch (error: any) {
    let category:
      | 'validation'
      | 'permission'
      | 'not_found'
      | 'backend_hook'
      | 'conflict'
      | 'network'
      | 'unknown' = 'unknown'
    let status = 500
    let message = 'Ocorreu um erro inesperado.'
    let details = null
    let code = 'unknown'

    if (error instanceof ClientResponseError) {
      status = error.status
      details = error.response
      code = details?.code || `HTTP_${status}`
      const rawMessage = details?.message || error.message || ''

      if (status === 0) {
        category = 'network'
        message = 'Falha de rede. Verifique sua conexão.'
      } else if (status === 404) {
        category = 'not_found'
        message = 'Registro não encontrado.'
      } else if (status === 401 || status === 403) {
        category = 'permission'
        message = 'Você não tem permissão para excluir este registro.'
      } else if (status === 400) {
        const lowerMsg = rawMessage.toLowerCase()
        const hasConflictKeywords =
          lowerMsg.includes('vínculo') ||
          lowerMsg.includes('relacionamento') ||
          lowerMsg.includes('foreign key') ||
          lowerMsg.includes('referential') ||
          lowerMsg.includes('dependency')

        if (lowerMsg.includes('something went wrong while processing your request.')) {
          category = 'backend_hook'
          message = 'Ocorreu um erro interno ao processar a exclusão.'
        } else if (hasConflictKeywords) {
          category = 'conflict'
          message = 'Não é possível deletar devido a vínculos existentes.'
        } else {
          category = 'validation'
          message = 'Falha de validação.'
        }
      } else {
        message = rawMessage || 'Erro desconhecido do servidor.'
      }
    } else if (!error.response && !error.status) {
      category = 'network'
      message = 'Falha de rede ou servidor inacessível.'
    } else if (error instanceof Error) {
      message = error.message
    }

    return {
      success: false,
      message,
      category,
      status,
      code,
      details,
      checkedBeforeDelete,
      rawResponse: details || error,
    }
  }
}

export const autofillLawsuit = (number: string) =>
  pb.send('/backend/v1/datajud/autofill', { method: 'POST', body: { number } })
