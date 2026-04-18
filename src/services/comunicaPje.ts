import pb from '@/lib/pocketbase/client'
import { getMonitoringConfig } from '@/services/monitoring'

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
        } else if (typeof value === 'string') {
          formattedValue = value.includes('T') ? value.split('T')[0] : value.substring(0, 10)
        }
      }

      if (key === 'numeroProcesso') {
        formattedValue = formattedValue.replace(/[^\d]/g, '')
      }

      if (key === 'cpfCnpj') {
        formattedValue = formattedValue.replace(/[^\d]/g, '')
      }

      query.append(key, formattedValue)
    }
  })

  const config = await getMonitoringConfig()
  let baseUrl = config?.pje_base_url || 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
  if (!baseUrl.includes('/comunicacao')) {
    baseUrl = baseUrl.endsWith('/') ? `${baseUrl}comunicacao` : `${baseUrl}/comunicacao`
  }

  const apiKey = config?.pje_api_key || ''
  const encodedQueryString = query.toString().replace(/\+/g, '%20')
  const proxyUrl = `/backend/v1/pje_comunica_proxy?${encodedQueryString}`

  let responseData
  let requestError: any = null
  let customErrorMessage = ''

  try {
    responseData = await pb.send(proxyUrl, {
      method: 'POST',
      body: {
        baseUrl,
        apiKey,
        wafBypass: config?.pje_waf_bypass_active === true,
      },
    })
  } catch (error: any) {
    requestError = error
    if (error?.status === 403) {
      customErrorMessage =
        'Bloqueio Geográfico ou Acesso Negado pelo WAF (403). Verifique se o IP do servidor ou a sua API Key estão autorizados no portal do PJe.'
    } else if (error?.status === 401) {
      customErrorMessage = 'Token de acesso inválido ou expirado (401).'
    } else {
      customErrorMessage = error?.response?.message || error.message || 'Erro na requisição'
    }
  }

  // NOTE: The proxy hook (`pje_comunica_proxy.js`) handles securely saving the search
  // history and the results on the server-side within `pje_search_history`
  // and `pje_search_results` collections to ensure an auditable trace.

  if (requestError) {
    throw new Error(customErrorMessage || 'Erro de comunicação com o serviço PJe.')
  }

  return responseData
}
