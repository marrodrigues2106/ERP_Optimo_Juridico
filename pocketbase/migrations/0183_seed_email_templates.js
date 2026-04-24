migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('communication_templates')

    const templates = [
      {
        name: 'Atualização Processual (Email)',
        subject: 'Atualização no Processo {{case_number}}',
        body_html:
          '<p>Olá {{client_name}},</p><p>Informamos que houve uma atualização processual no seu caso {{case_number}}.</p><p>Atenciosamente,<br>{{org_name}}</p>',
        type: 'Email',
      },
      {
        name: 'Lembrete Financeiro (Email)',
        subject: 'Aviso Financeiro',
        body_html:
          '<p>Olá {{client_name}},</p><p>Este é um lembrete amigável sobre uma movimentação financeira relacionada aos seus processos.</p><p>Atenciosamente,<br>{{org_name}}</p>',
        type: 'Email',
      },
      {
        name: 'Parabéns Aniversário (Email)',
        subject: 'Feliz Aniversário!',
        body_html:
          '<p>Olá {{client_name}},</p><p>A nossa equipe gostaria de parabenizá-lo e lhe desejar muita saúde e anos de vida nesta data especial!</p><p>Atenciosamente,<br>{{org_name}}</p>',
        type: 'Email',
      },
    ]

    for (const t of templates) {
      try {
        app.findFirstRecordByData('communication_templates', 'name', t.name)
      } catch (_) {
        const record = new Record(col)
        record.set('name', t.name)
        record.set('subject', t.subject)
        record.set('body_html', t.body_html)
        record.set('type', t.type)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM communication_templates WHERE name IN ('Atualização Processual (Email)', 'Lembrete Financeiro (Email)', 'Parabéns Aniversário (Email)')",
        )
        .execute()
    } catch (_) {}
  },
)
