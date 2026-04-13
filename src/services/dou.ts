import pb from '@/lib/pocketbase/client'

export interface DouSearchParams {
  q: string
  publishFrom?: string
  publishTo?: string
  orgPrin?: string
  artType?: string
}

export interface DouSearchResult {
  title: string
  content: string
  pubName: string
  artType: string
  urlTitle: string
  pubDate: string
  editionNumber?: string
  numberPage?: string
  hierarchyStr?: string
  orgao_principal?: string
  organizacao_subordinada?: string
  source: string
}

export interface DouSearchResponse {
  success: boolean
  source: string
  total: number
  data: DouSearchResult[]
  message?: string
}

export const searchDou = async (params: DouSearchParams): Promise<DouSearchResponse> => {
  return pb.send('/backend/v1/dou/search', {
    method: 'POST',
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const checkDouHealth = async (): Promise<{ status: string; message: string }> => {
  return pb.send('/backend/v1/dou/health', {
    method: 'GET',
  })
}

export const clearDouLogs = async (): Promise<{ success: boolean; deleted: number }> => {
  return pb.send('/backend/v1/dou/logs', {
    method: 'DELETE',
  })
}
