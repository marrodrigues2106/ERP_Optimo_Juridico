import PocketBase from 'pocketbase'

import { toast } from '@/hooks/use-toast'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

pb.beforeSend = function (url, options) {
  return { url, options }
}

pb.afterSend = function (response, data) {
  if (response.status === 401) {
    toast({
      title: 'Sessão expirada',
      description: 'Por favor, faça login novamente.',
      variant: 'destructive',
    })
    pb.authStore.clear()
    window.location.href = '/login'
  } else if (response.status >= 500) {
    toast({
      title: 'Erro no servidor',
      description: 'Ocorreu um erro interno. Tente novamente mais tarde.',
      variant: 'destructive',
    })
  } else if (response.status >= 400 && response.status < 500 && response.status !== 401) {
    console.error(`[API Error] ${response.url}:`, data)
  }
  return data
}

export default pb
