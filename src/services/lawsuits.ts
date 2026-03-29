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

    const status = error instanceof ClientResponseError ? error.status : 500
    const message = normalizePocketBaseError(error)
    const details = error instanceof ClientResponseError ? error.response : null

    return {
      success: false,
      message,
      status,
      details,
    }
  }
}

export const autofillLawsuit = (number: string) =>
  pb.send('/backend/v1/datajud/autofill', { method: 'POST', body: { number } })
