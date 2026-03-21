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
