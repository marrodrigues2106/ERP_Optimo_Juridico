routerAdd(
  'GET',
  '/backend/v1/email/inbox',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const folder = e.request.url.query().get('folder') || 'INBOX'

    const imapHost = user.getString('imap_host')
    const emailUser = user.getString('email_user')
    const encryptedPass = user.getString('email_encrypted_password')

    if (!imapHost || !emailUser || !encryptedPass) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    let key = $secrets.get('EMAIL_ENC_KEY') || ''
    if (key.length < 32) {
      key = (key + '00000000000000000000000000000000').substring(0, 32)
    }

    try {
      const dec = $security.decrypt(encryptedPass, key)
      if (!dec) throw new Error('Invalid password')
    } catch (err) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    let messages = []

    if (folder === 'INBOX') {
      messages = [
        {
          id: 'mock-1',
          subject: 'Atualização do Processo 0001234-56.2023.8.26.0000',
          from: 'Tribunal de Justiça <intimacoes@tjsp.jus.br>',
          date: new Date().toISOString(),
          body: '<p>Informamos que houve uma nova movimentação no processo vinculado ao seu e-mail. Acesse o portal do tribunal para mais detalhes.</p>',
          snippet: 'Informamos que houve uma nova movimentação no processo...',
          read: false,
        },
        {
          id: 'mock-2',
          subject: 'Dúvida sobre contrato de honorários',
          from: 'João Silva <joao.silva@example.com>',
          date: new Date(Date.now() - 3600000).toISOString(),
          body: '<p>Prezado advogado,<br><br>Gostaria de tirar uma dúvida sobre a cláusula 4 do nosso contrato de honorários. Podemos agendar uma reunião rápida amanhã?</p><p>Atenciosamente,<br>João</p>',
          snippet: 'Prezado advogado, gostaria de tirar uma dúvida sobre a cláusula 4...',
          read: true,
        },
      ]
    } else if (folder === 'Sent') {
      messages = [
        {
          id: 'mock-sent-1',
          subject: 'Re: Documentação pendente',
          from: emailUser,
          date: new Date(Date.now() - 1800000).toISOString(),
          body: '<p>Olá,<br><br>Os documentos foram enviados em anexo.</p>',
          snippet: 'Olá, Os documentos foram enviados em anexo.',
          read: true,
        },
      ]
    } else if (folder === 'Drafts') {
      messages = [
        {
          id: 'mock-draft-1',
          subject: 'Procuração - Maria Souza',
          from: emailUser,
          date: new Date(Date.now() - 86400000).toISOString(),
          body: '<p>Prezada Maria,<br><br>Segue em anexo a procuração para assinatura.</p>',
          snippet: 'Prezada Maria, Segue em anexo a procuração para assinatura.',
          read: true,
        },
      ]
    } else if (folder === 'Spam') {
      messages = [
        {
          id: 'mock-spam-1',
          subject: 'Você ganhou um prêmio!',
          from: 'Loteria <loteria@scam.com>',
          date: new Date(Date.now() - 172800000).toISOString(),
          body: '<p>Clique aqui para resgatar seu prêmio.</p>',
          snippet: 'Clique aqui para resgatar seu prêmio.',
          read: false,
        },
      ]
    } else if (folder === 'Trash') {
      messages = [
        {
          id: 'mock-trash-1',
          subject: 'Aviso de manutenção',
          from: 'Sistema <admin@sistema.com>',
          date: new Date(Date.now() - 500000000).toISOString(),
          body: '<p>Manutenção programada para o fim de semana.</p>',
          snippet: 'Manutenção programada para o fim de semana.',
          read: true,
        },
      ]
    }

    return e.json(200, messages)
  },
  $apis.requireAuth(),
)
