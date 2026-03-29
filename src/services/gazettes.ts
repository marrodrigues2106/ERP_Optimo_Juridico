import pb from '@/lib/pocketbase/client'

export const getGazettes = () => pb.collection('gazettes').getFullList({ sort: '-created' })

export const searchGazettePublications = async (params: {
  q?: string
  processo?: string
  oab?: string
  parte?: string
  advogado?: string
  orgao?: string
  dataInicio?: string
  dataFim?: string
  page?: number
}) => {
  const filters: string[] = []

  if (params.q) filters.push(`texto_normalizado ~ "${params.q}"`)
  if (params.processo) filters.push(`numero_processo ~ "${params.processo}"`)
  if (params.oab) filters.push(`oabs ~ "${params.oab}"`)
  if (params.parte) filters.push(`partes ~ "${params.parte}"`)
  if (params.advogado) filters.push(`advogados ~ "${params.advogado}"`)
  if (params.orgao && params.orgao !== 'todos') filters.push(`orgao = "${params.orgao}"`)
  if (params.dataInicio) filters.push(`data_publicacao >= "${params.dataInicio} 00:00:00"`)
  if (params.dataFim) filters.push(`data_publicacao <= "${params.dataFim} 23:59:59"`)

  const filterString = filters.join(' && ')

  return pb.collection('gazette_publications').getList(params.page || 1, 30, {
    filter: filterString,
    sort: '-data_publicacao',
    expand: 'diario',
  })
}

export const triggerManualIngest = async (orgao: string) => {
  return pb.send('/backend/v1/gazettes/ingest', {
    method: 'POST',
    body: JSON.stringify({ orgao }),
    headers: { 'Content-Type': 'application/json' },
  })
}
