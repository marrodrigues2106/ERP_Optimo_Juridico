import pb from '@/lib/pocketbase/client'

export const getLawsuitMovements = (lawsuitId: string) => {
  return pb.collection('lawsuit_movements').getFullList({
    filter: `lawsuit = '${lawsuitId}'`,
    sort: '-event_date',
  })
}

export const createLawsuitMovement = (data: any) => {
  return pb.collection('lawsuit_movements').create(data)
}
