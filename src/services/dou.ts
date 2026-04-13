import pb from '@/lib/pocketbase/client'

export interface DouSearchParams {
  q: string
  publishFrom?: string
  publishTo?: string
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
  source: string
}

export interface DouSearchResponse {
  success: boolean
  source: string
  total: number
  data: DouSearchResult[]
}

export const searchDou = async (params: DouSearchParams): Promise<DouSearchResponse> => {
  return pb.send('/backend/v1/dou/search', {
    method: 'POST',
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'application/json' },
  })
}
