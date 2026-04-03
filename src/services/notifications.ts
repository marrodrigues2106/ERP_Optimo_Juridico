import pb from '@/lib/pocketbase/client'

export const getNotifications = () => pb.collection('lawsuit_notifications').getFullList()

export const markLogAsRead = async (
  lawsuitId: string,
  content: string,
  userId: string,
  isRead: boolean,
  notifId?: string,
) => {
  if (notifId) {
    return pb.collection('lawsuit_notifications').update(notifId, { is_read: isRead })
  } else {
    return pb.collection('lawsuit_notifications').create({
      lawsuit: lawsuitId,
      update_content: content,
      user: userId,
      is_read: isRead,
    })
  }
}

export const markAllAsRead = async (userId: string) => {
  const records = await pb.collection('lawsuit_notifications').getFullList({
    filter: `user = "${userId}" && is_read = false`,
  })
  const promises = records.map((r) =>
    pb.collection('lawsuit_notifications').update(r.id, { is_read: true }),
  )
  return Promise.all(promises)
}

export const markMultipleAsRead = async (notificationIds: string[], isRead: boolean) => {
  const promises = notificationIds.map((id) =>
    pb.collection('lawsuit_notifications').update(id, { is_read: isRead }),
  )
  return Promise.all(promises)
}
