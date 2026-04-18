import pb from '@/lib/pocketbase/client'
import { ComunicaHistoryEntry } from '@/hooks/use-comunica-store'

export interface ComunicaSearchParams {
  numeroProcesso?: string
  nomeParte?: string
  nomeAdvogado?: string
  oab?: string
  ufOab?: string
  siglaTribunal?: string
  meio?: string
  dataDisponibilizacaoInicio?: string
  dataDisponibilizacaoFim?: string
}

export const searchComunicaPJe = async (
  params: ComunicaSearchParams,
  baseUrl: string,
  apiKey: string,
  addHistory: (entry: ComunicaHistoryEntry) => void,
) => {
  const url = new URL(`${baseUrl}/comunicacao`)

  if (params.numeroProcesso)
    url.searchParams.append('numeroProcesso', params.numeroProcesso.replace(/\D/g, ''))
  if (params.nomeParte) url.searchParams.append('nomeParte', params.nomeParte)
  if (params.nomeAdvogado) url.searchParams.append('nomeAdvogado', params.nomeAdvogado)
  if (params.oab) url.searchParams.append('oabAdvogado', params.oab)
  if (params.ufOab) url.searchParams.append('siglaUfOab', params.ufOab)
  if (params.siglaTribunal) url.searchParams.append('siglaTribunal', params.siglaTribunal)
  if (params.meio && params.meio !== 'ALL') url.searchParams.append('meio', params.meio)
  if (params.dataDisponibilizacaoInicio)
    url.searchParams.append('dataDisponibilizacaoInicio', params.dataDisponibilizacaoInicio)
  if (params.dataDisponibilizacaoFim)
    url.searchParams.append('dataDisponibilizacaoFim', params.dataDisponibilizacaoFim)

  const termString =
    Object.entries(params)
      .filter(([_, v]) => v && v !== 'ALL')
      .map(([k, v]) => `${k}:${v}`)
      .join(', ') || 'Todos'

  const historyEntry: ComunicaHistoryEntry = {
    term: termString,
    timestamp: new Date().toISOString(),
    status: 'pending',
    resultsCount: 0,
    message: '',
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey ? `Bearer ${apiKey}` : '',
        Accept: 'application/json',
      },
    })

    if (response.status === 429) throw new Error('Rate limit excedido (429)')
    if (response.status === 422) throw new Error('Parâmetros inválidos ou não encontrado (422)')
    if (!response.ok) throw new Error(`Erro na requisição: ${response.status}`)

    const data = await response.json()
    const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []

    const searchRecord = await pb.collection('searches').create({
      term: historyEntry.term,
      search_type: 'comunica_pje',
      status: 'success',
      business_status: 'completed',
      results_count: items.length,
      message: data.message || 'Success',
      start_date: params.dataDisponibilizacaoInicio || '',
      end_date: params.dataDisponibilizacaoFim || '',
    })

    const resultsToSave = items.slice(0, 50)
    for (const item of resultsToSave) {
      await pb.collection('results').create({
        search_id: searchRecord.id,
        sigla_tribunal: item.siglaTribunal,
        tipo_comunicacao: item.tipoComunicacao,
        nome_orgao: item.nomeOrgao,
        texto: item.texto,
        numero_processo: item.numeroProcesso,
        meio: item.meio,
        tipo_documento: item.tipoDocumento,
        nome_classe: item.nomeClasse,
        data_disponibilizacao: item.dataDisponibilizacao,
        numero_comunicacao: item.numeroComunicacao,
        link: item.link,
        hash_comunicacao: item.hash,
        status_comunicacao: item.status,
        raw_json: item,
      })
    }

    historyEntry.status = 'success'
    historyEntry.resultsCount = items.length
    addHistory(historyEntry)

    return items
  } catch (error: any) {
    historyEntry.status = 'error'
    historyEntry.message = error.message
    addHistory(historyEntry)

    await pb.collection('searches').create({
      term: historyEntry.term,
      search_type: 'comunica_pje',
      status: 'error',
      business_status: 'failed',
      results_count: 0,
      message: error.message,
    })

    throw error
  }
}
