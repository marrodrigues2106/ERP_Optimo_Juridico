import pb from '@/lib/pocketbase/client'

export const searchDouInit = async (
  q: string,
  publishFrom?: string,
  publishTo?: string,
  orgPrin?: string,
  secao?: string,
) => {
  return pb.send('/backend/v1/dou/search', {
    method: 'POST',
    body: JSON.stringify({ q, publishFrom, publishTo, orgPrin, secao }),
  })
}

export const searchDouRun = async (
  jobId: string,
  q: string,
  publishFrom?: string,
  publishTo?: string,
  orgPrin?: string,
  secao?: string,
) => {
  return pb.send('/backend/v1/dou/search/run', {
    method: 'POST',
    body: JSON.stringify({ jobId, q, publishFrom, publishTo, orgPrin, secao }),
  })
}
