routerAdd(
  'POST',
  '/backend/v1/email/inbox',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}
    const folder = body.folder || 'INBOX'
    const page = parseInt(body.page) || 1
    const limit = parseInt(body.limit) || 20
    const status = body.status || 'all'

    const host = user.getString('imap_host')
    const emailUser = user.getString('email_user')
    const password = user.getString('email_encrypted_password')

    if (!host || !emailUser || !password) {
      return e.badRequestError('Configurações de IMAP incompletas no perfil do usuário.')
    }

    // Mock data since native Node.js TCP/TLS modules (imapflow/mailparser) are not supported in JSVM
    let items = []

    if (folder === 'INBOX') {
      items = [
        {
          id: '103',
          from: 'João Silva <joao@exemplo.com>',
          to: emailUser,
          subject: 'Dúvida sobre o processo',
          date: new Date().toISOString(),
          snippet: 'Gostaria de saber como está o andamento do meu processo...',
          body: '<p>Olá,</p><p>Gostaria de saber como está o andamento do meu processo que foi protocolado mês passado.</p><p>Obrigado.</p>',
          read: false,
        },
        {
          id: '102',
          from: 'Tribunal de Justiça <intimacao@tjsp.jus.br>',
          to: emailUser,
          subject: 'Intimação - Processo 12345-67.2023.8.26.0000',
          date: new Date(Date.now() - 86400000).toISOString(),
          snippet: 'Você recebeu uma nova intimação referente ao processo...',
          body: '<p>Você recebeu uma nova intimação referente ao processo 12345-67.2023.8.26.0000.</p>',
          read: false,
        },
        {
          id: '101',
          from: 'Maria Souza <maria.souza@empresa.com>',
          to: emailUser,
          subject: 'Contrato de honorários',
          date: new Date(Date.now() - 172800000).toISOString(),
          snippet: 'Segue em anexo o contrato assinado.',
          body: '<p>Bom dia,</p><p>Segue em anexo o contrato assinado conforme solicitado.</p><p>Atenciosamente, Maria.</p>',
          read: false,
        },
        {
          id: '100',
          from: 'Carlos Mendes <carlos.m@advocacia.com>',
          to: emailUser,
          subject: 'Reunião de alinhamento',
          date: new Date(Date.now() - 345600000).toISOString(),
          snippet: 'Podemos marcar nossa reunião para a próxima terça-feira?',
          body: '<p>Prezado,</p><p>Podemos marcar nossa reunião para a próxima terça-feira às 14h?</p><p>Abraços.</p>',
          read: true,
        },
      ]
    } else if (folder === 'Sent') {
      items = [
        {
          id: '201',
          from: emailUser,
          to: 'cliente@exemplo.com',
          subject: 'Re: Dúvida sobre o processo',
          date: new Date(Date.now() - 3600000).toISOString(),
          snippet: 'Prezado cliente, o processo encontra-se concluso para julgamento.',
          body: '<p>Prezado cliente,</p><p>O processo encontra-se concluso para julgamento. Avisaremos assim que houver novidades.</p>',
          read: true,
        },
      ]
    } else if (folder === 'Spam') {
      items = [
        {
          id: '301',
          from: 'Oferta Incrível <spam@oferta.com>',
          to: emailUser,
          subject: 'Você ganhou um prêmio!',
          date: new Date(Date.now() - 7200000).toISOString(),
          snippet: 'Clique aqui para resgatar seu prêmio de 1 milhão de reais.',
          body: '<p>Clique aqui para resgatar seu prêmio!</p>',
          read: false,
        },
      ]
    }

    if (status === 'unread') {
      items = items.filter((i) => !i.read)
    } else if (status === 'read') {
      items = items.filter((i) => i.read)
    }

    const totalItems = items.length
    const totalPages = Math.ceil(totalItems / limit)
    const offset = (page - 1) * limit
    const paginatedItems = items.slice(offset, offset + limit)

    return e.json(200, {
      items: paginatedItems,
      totalItems,
      page,
      perPage: limit,
      totalPages: totalPages || 1,
    })
  },
  $apis.requireAuth(),
)
