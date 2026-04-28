import pb from '@/lib/pocketbase/client'

export const searchDou = async (
  q: string,
  publishFrom?: string,
  publishTo?: string,
  searchType: string = 'palavras_chave',
  orgPrin?: string,
) => {
  return pb.send('/backend/v1/dou/search', {
    method: 'POST',
    body: JSON.stringify({ q, publishFrom, publishTo, searchType, orgPrin }),
  })
}
