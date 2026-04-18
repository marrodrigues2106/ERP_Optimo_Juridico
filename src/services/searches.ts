import pb from '@/lib/pocketbase/client'

export const getSearches = async (options: any = {}) => {
  return pb.collection('pje_search_history').getList(1, options.limit || 50, {
    sort: options.sort || '-created',
    ...options,
  })
}
