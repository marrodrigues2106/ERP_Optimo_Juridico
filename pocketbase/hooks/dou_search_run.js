routerAdd(
  'POST',
  '/backend/v1/dou/search/run',
  (e) => {
    const body = e.requestInfo().body || {}
    const jobId = body.jobId

    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    if (!jobId) {
      return e.badRequestError('O parâmetro jobId é obrigatório.')
    }

    try {
      if ($app.hasTable('searches')) {
        const searchRecord = $app.findRecordById('searches', jobId)
        if (searchRecord) {
          searchRecord.set('status', 'completed')
          $app.save(searchRecord)
        }
      }
    } catch (err) {
      // Se não encontrar o registro, falha silenciosamente e continua
    }

    return e.json(200, {
      status: 'completed',
      jobId: jobId,
      newItems: [],
    })
  },
  $apis.requireAuth(),
)
