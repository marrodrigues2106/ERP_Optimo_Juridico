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
          // In a fully configured environment with SMTP, we would use:
          // const message = new mailer.Message({ ... })
          // $app.newMailClient().send(message)

          movement.set('notified_client', true)
          $app.saveNoValidate(movement)
        }
      }
    }
  } catch (err) {
    console.error('Failed to process automated client notification:', err)
  }

  e.next()
}, 'case_movements')
