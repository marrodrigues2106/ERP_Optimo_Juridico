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
  try {
    await instance.collection('lawsuits').delete(id)
    return { success: true, message: 'Processo excluído com sucesso.' }
  } catch (error: any) {
    console.error('deleteLawsuit error details:', error, error?.response)

    let category:
      | 'validation'
      | 'permission'
      | 'not_found'
      | 'backend_hook'
      | 'network'
      | 'unknown' = 'unknown'
    let status = 500
    let message = 'Ocorreu um erro inesperado.'
    let details = null

    if (error instanceof ClientResponseError) {
      status = error.status
      details = error.response

      if (status === 0) {
        category = 'network'
        message = 'Falha de rede. Verifique sua conexão.'
      } else if (status === 403 || status === 401) {
        category = 'permission'
        message = 'Você não tem permissão para excluir este registro.'
      } else if (status === 404) {
        category = 'not_found'
        message = 'Registro não encontrado.'
      } else if (status === 400) {
        if (details?.data && Object.keys(details.data).length > 0) {
          category = 'validation'
          message = 'Falha de validação.'
        } else {
          category = 'backend_hook'
          message =
            details?.message ||
            'Ocorreu um erro interno ao processar a exclusão (conflito de dependências).'
        }
      } else {
        message = error.message || 'Erro desconhecido do servidor.'
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
      details,
    }
  }
}

export const autofillLawsuit = (number: string) =>
  pb.send('/backend/v1/datajud/autofill', { method: 'POST', body: { number } })
