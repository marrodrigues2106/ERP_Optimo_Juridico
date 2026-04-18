import pb from '@/lib/pocketbase/client'

export interface PjeSearchParams {
  numeroOab?: string
  ufOab?: string
  nomeParte?: string
  numeroProcesso?: string
  dataDisponibilizacaoInicio?: string
  dataDisponibilizacaoFim?: string
  siglaTribunal?: string
  nomeAdvogado?: string
  meio?: string
  cpfCnpj?: string
}

export const searchPjeComunica = async (params: PjeSearchParams) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      let formattedValue = String(value).trim()

      if (key === 'dataDisponibilizacaoInicio' || key === 'dataDisponibilizacaoFim') {
        if (value instanceof Date) {
          const year = value.getFullYear()
          const month = String(value.getMonth() + 1).padStart(2, '0')
          const day = String(value.getDate()).padStart(2, '0')
          formattedValue = `${year}-${month}-${day}`
        } else if (typeof value === 'string' && value.includes('T')) {
          formattedValue = value.split('T')[0]
        }
      }

      if (key === 'numeroProcesso') {
        formattedValue = formattedValue.replace(/[^\d.-]/g, '')
      }

      if (key === 'cpfCnpj') {
        formattedValue = formattedValue.replace(/[^\d]/g, '')
      }

      query.append(key, formattedValue)
    }
  })

  return pb.send(`/backend/v1/pje-comunica?${query.toString()}`, {
    method: 'GET',
  })
}
