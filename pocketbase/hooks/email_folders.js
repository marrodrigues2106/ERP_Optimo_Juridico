// @deps imapflow@1.0.161
routerAdd(
  'GET',
  '/backend/v1/email/folders',
  async (e) => {
    const { ImapFlow } = require('imapflow')

    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const imapHost = user.getString('imap_host')
    const imapPort = user.getInt('imap_port') || 993
    const emailUser = user.getString('email_user')
    const encryptedPass = user.getString('email_encrypted_password')
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    if (!imapHost || !emailUser || !encryptedPass) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    let key = $secrets.get('EMAIL_ENC_KEY') || ''
    if (key.length < 32) {
      key = (key + '00000000000000000000000000000000').substring(0, 32)
    }

    let password = ''
    try {
      password = $security.decrypt(encryptedPass, key)
      if (!password) throw new Error('Invalid password')
    } catch (err) {
      return e.badRequestError(
        'Erro ao descriptografar a senha do e-mail. Verifique suas credenciais.',
      )
    }

    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: encryption === 'ssl_tls',
      auth: { user: emailUser, pass: password },
      logger: false,
    })

    try {
      await client.connect()
      const list = await client.list()
      await client.logout()

      const folders = list.map((f) => ({
        id: f.path,
        name: f.name || f.path,
        unread: 0,
      }))

      return e.json(200, folders)
    } catch (err) {
      console.error('IMAP Error:', err)
      return e.badRequestError('Erro ao conectar no servidor IMAP: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
