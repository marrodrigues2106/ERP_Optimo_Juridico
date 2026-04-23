onRecordValidate((e) => {
  const newVal = e.record.getString('email_encrypted_password')
  const oldVal = e.record.original()
    ? e.record.original().getString('email_encrypted_password')
    : ''

  if (newVal && newVal !== oldVal) {
    let key = $secrets.get('EMAIL_ENC_KEY') || ''
    if (key.length < 32) {
      key = (key + '00000000000000000000000000000000').substring(0, 32)
    }
    const encrypted = $security.encrypt(newVal, key)
    e.record.set('email_encrypted_password', encrypted)
  }
  e.next()
}, 'users')
