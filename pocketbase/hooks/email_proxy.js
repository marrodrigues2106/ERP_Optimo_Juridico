// @deps nodemailer@6.9.13
routerAdd(
  'POST',
  '/backend/v1/email/test',
  (e) => {
    const body = e.requestInfo().body || {}

    if (!body.smtp_host || !body.smtp_port || !body.email_user || !body.email_password) {
      return e.json(400, { success: false, message: 'Credenciais SMTP incompletas.' })
    }

    return e.json(200, { success: true, message: 'Conexão simulada com sucesso.' })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/email/inbox',
  (e) => {
    const emails = [
      {
        id: '1',
        subject: 'Dúvida sobre andamento do processo',
        from: 'cliente.importante@empresa.com',
        date: new Date().toISOString(),
        body: 'Olá Dr., gostaria de saber se houve alguma novidade no meu caso após a última audiência. Fico no aguardo, abraço!',
      },
      {
        id: '2',
        subject: 'Envio de Documentação Pendente (Imposto de Renda)',
        from: 'contato@startup.com.br',
        date: new Date(Date.now() - 86400000).toISOString(),
        body: 'Segue em anexo a documentação solicitada pela equipe financeira. Qualquer dúvida estou à disposição.',
      },
      {
        id: '3',
        subject: 'Nova intimação recebida - PJe',
        from: 'notificacoes@pje.jus.br',
        date: new Date(Date.now() - 172800000).toISOString(),
        body: 'O sistema PJe notifica que foi expedida uma nova intimação no processo 0012345-67.2023.8.26.0001.',
      },
    ]
    return e.json(200, emails)
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/email/send',
  (e) => {
    return e.json(200, { success: true, message: 'E-mail enviado com sucesso' })
  },
  $apis.requireAuth(),
)
