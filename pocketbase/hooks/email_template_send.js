routerAdd(
  'POST',
  '/backend/v1/email/send-template',
  (e) => {
    const body = e.requestInfo().body
    if (!body.to || !body.subject || !body.html) {
      throw new BadRequestError("Missing 'to', 'subject', or 'html' in request body")
    }

    const message = new mailer.Message({
      from: {
        address: $app.settings().meta.senderAddress || 'no-reply@moraesrodriguesadvocacia.com.br',
        name: $app.settings().meta.senderName || 'Moraes Rodrigues Advocacia',
      },
      to: [{ address: body.to }],
      subject: body.subject,
      html: body.html,
    })

    $app.newMailClient().send(message)

    return e.json(200, { success: true, message: 'Email sent successfully' })
  },
  $apis.requireAuth(),
)
