migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('imap_host')
    users.fields.removeByName('imap_port')
    users.fields.removeByName('smtp_host')
    users.fields.removeByName('smtp_port')
    users.fields.removeByName('email_user')
    users.fields.removeByName('email_password')
    users.fields.removeByName('email_encryption')
    users.fields.removeByName('email_encrypted_password')
    users.fields.removeByName('is_system_dispatcher')
    app.save(users)

    const settings = app.findCollectionByNameOrId('settings')
    try {
      app.findFirstRecordByData('settings', 'key', 'resend_api_key')
    } catch (_) {
      const record = new Record(settings)
      record.set('key', 'resend_api_key')
      record.set('value', 'pending')
      app.save(record)
    }

    try {
      app.findFirstRecordByData('settings', 'key', 'resend_from_email')
    } catch (_) {
      const record = new Record(settings)
      record.set('key', 'resend_from_email')
      record.set('value', 'onboarding@resend.dev')
      app.save(record)
    }
  },
  (app) => {
    // Revert not strictly necessary for this migration as we are cleaning up obsolete fields
  },
)
