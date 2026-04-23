onRecordAfterCreateSuccess((e) => {
  const movement = e.record
  const caseId = movement.get('case')
  if (!caseId) return e.next()

  try {
    const legalCase = $app.findRecordById('legal_cases', caseId)
    if (legalCase.get('notify_client') === true) {
      const clientId = legalCase.get('client')
      if (clientId) {
        const client = $app.findRecordById('clients', clientId)
        const clientEmail = client.get('email')

        if (clientEmail) {
          console.log(
            `[CRM] Automated notification: Sending movement update to ${clientEmail} for case ${legalCase.get('case_number') || caseId}`,
          )

          let subject = `Atualização no Processo ${legalCase.get('case_number') || ''}`
          let html = `<p>Olá ${client.get('name')},</p><p>Nova movimentação: ${movement.get('description')}</p>`

          try {
            const tmpl = $app.findFirstRecordByFilter(
              'communication_templates',
              "name = 'Notificação de Movimentação (Padrão)'",
            )
            if (tmpl) {
              subject = tmpl
                .get('subject')
                .replace('{{case_number}}', legalCase.get('case_number') || '')
              html = tmpl
                .get('body_html')
                .replace('{{client_name}}', client.get('name') || '')
                .replace('{{case_number}}', legalCase.get('case_number') || '')
                .replace('{{movement_description}}', movement.get('description') || '')
            }
          } catch (err) {
            // Template not found, fallback used
          }

          try {
            const message = new mailer.Message({
              from: {
                address: $app.settings().meta.senderAddress || 'no-reply@example.com',
                name: $app.settings().meta.senderName || 'Sistema',
              },
              to: [{ address: clientEmail }],
              subject: subject,
              html: html,
            })
            $app.newMailClient().send(message)
            console.log(`[CRM] Email sent to ${clientEmail}`)
          } catch (mailErr) {
            console.log(`[CRM] Mail client not configured or error: ${mailErr}`)
          }

          movement.set('notified_client', true)
          $app.saveNoValidate(movement)

          // Also notify responsible user
          try {
            const respCollabId = legalCase.get('responsible_collaborator')
            if (respCollabId) {
              const collab = $app.findRecordById('collaborators', respCollabId)
              const userId = collab.get('user')
              if (userId) {
                const user = $app.findRecordById('users', userId)
                const userEmail = user.get('email')
                if (userEmail) {
                  const alertMsg = new mailer.Message({
                    from: {
                      address: $app.settings().meta.senderAddress || 'no-reply@example.com',
                      name: 'Central de Alertas',
                    },
                    to: [{ address: userEmail }],
                    subject: `Alerta Processual: ${legalCase.get('case_number') || ''}`,
                    html: `<p>Olá ${user.get('name')},</p><p>Nova movimentação no processo: ${movement.get('description')}</p>`,
                  })
                  $app.newMailClient().send(alertMsg)
                }
              }
            }
          } catch (uErr) {
            console.error('Failed to notify responsible user:', uErr)
          }

          // Log interaction automatically
          try {
            const interaction = new Record($app.findCollectionByNameOrId('crm_interactions'))
            interaction.set('client', clientId)
            interaction.set('type', 'Email')
            interaction.set(
              'description',
              `Notificação automática enviada: ${movement.get('description')}`,
            )
            interaction.set('date', new Date().toISOString())
            interaction.set('linked_case', caseId)
            interaction.set('status', 'Completed')
            $app.save(interaction)
          } catch (intErr) {
            console.error('Failed to log interaction:', intErr)
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to process automated client notification:', err)
  }

  e.next()
}, 'case_movements')
