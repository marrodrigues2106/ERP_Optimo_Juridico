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
    if (value) query.append(key, String(value))
  })

  return pb.send(`/backend/v1/pje-comunica?${query.toString()}`, {
    method: 'GET',
  })
}
