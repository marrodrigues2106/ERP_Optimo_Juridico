migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    if (!col.fields.getByName('email_destinatario')) {
      col.fields.add(new EmailField({ name: 'email_destinatario' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    col.fields.removeByName('email_destinatario')
    app.save(col)
  },
)
