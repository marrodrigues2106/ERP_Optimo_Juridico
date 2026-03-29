migrate(
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    clients.fields.add(
      new SelectField({
        name: 'funnel_stage',
        maxSelect: 1,
        values: ['Contact', 'Proposal', 'Negotiation', 'Closed'],
      }),
    )
    app.save(clients)

    const templates = new Collection({
      name: 'communication_templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'subject', type: 'text', required: true },
        { name: 'body_html', type: 'editor' },
        { name: 'type', type: 'select', values: ['Email', 'WhatsApp'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(templates)

    // Seed default template
    const tmpl = new Record(templates)
    tmpl.set('name', 'Notificação de Movimentação (Padrão)')
    tmpl.set('subject', 'Atualização em seu processo: {{case_number}}')
    tmpl.set(
      'body_html',
      '<p>Olá {{client_name}},</p><p>Houve uma nova movimentação em seu processo ({{case_number}}).</p><p><strong>Detalhes:</strong> {{movement_description}}</p><p>Atenciosamente,<br>Equipe Jurídica</p>',
    )
    tmpl.set('type', 'Email')
    app.save(tmpl)
  },
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    clients.fields.removeByName('funnel_stage')
    app.save(clients)

    const templates = app.findCollectionByNameOrId('communication_templates')
    app.delete(templates)
  },
)
