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

  const user = pb.authStore.record
  const organizationId = user?.active_organization || ''

  let responseData
  let businessStatus = 'sucesso'
  let requestError: any = null
  let customErrorMessage = ''

  try {
    responseData = await pb.send(`/backend/v1/pje-comunica?${query.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer COMUNICA_PJE_KEY',
      },
    })

    const items = responseData?.items || []
    if (items.length === 0) {
      businessStatus = 'sem_resultados'
    }
  } catch (error: any) {
    requestError = error
    if (error?.status === 400) {
      businessStatus = 'erro_validacao'
    } else if (error?.status === 403) {
      businessStatus = 'acesso_proibido'
    } else {
      businessStatus = 'erro_rede'
    }
    customErrorMessage = error?.response?.message || error.message || 'Erro na requisição'
  }

  let historyId = ''
  try {
    const history = await pb.collection('pje_search_history').create({
      consulta: params,
      business_status: businessStatus,
      organization: organizationId,
      termo: params.nomeAdvogado || params.numeroProcesso || params.numeroOab || '',
      tipo_busca: 'manual',
      data_inicio: params.dataDisponibilizacaoInicio
        ? String(params.dataDisponibilizacaoInicio)
        : '',
      data_fim: params.dataDisponibilizacaoFim ? String(params.dataDisponibilizacaoFim) : '',
      status: requestError ? 'erro' : 'concluido',
      mensagem: customErrorMessage,
      quantidade_resultados: responseData?.items?.length || 0,
      response_data: requestError ? JSON.stringify(requestError) : '',
    })
    historyId = history.id
  } catch (err) {
    console.error('Failed to create history record', err)
  }

  if (!requestError && historyId && responseData?.items?.length > 0) {
    const resultPromises = responseData.items.map((item: any) => {
      return pb
        .collection('pje_search_results')
        .create({
          search_history: historyId,
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
          hash_comunicacao: item.hash || '',
          status_comunicacao: 'novo',
          advogado_nome: item.destinatarios?.[0]?.nome || params.nomeAdvogado || '',
          raw_json: item,
          organization: organizationId,
        })
        .catch((e) => console.error('Error saving result', e))
    })
    await Promise.allSettled(resultPromises)
  }

  if (requestError) {
    if (customErrorMessage) {
      throw new Error(customErrorMessage)
    }
    throw requestError
  }

  return responseData
}
