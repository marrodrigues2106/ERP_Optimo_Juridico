import pb from '@/lib/pocketbase/client'

export const getSettingByKey = async (key: string) => {
  try {
    const record = await pb.collection('settings').getFirstListItem(`key="${key}"`)
    return record
  } catch (err) {
    return null
  }
}

export const setSettingByKey = async (key: string, value: string) => {
  const existing = await getSettingByKey(key)
  if (existing) {
    return await pb.collection('settings').update(existing.id, { value })
  } else {
    return await pb.collection('settings').create({ key, value })
  }
}
