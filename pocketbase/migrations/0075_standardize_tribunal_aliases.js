migrate(
  (app) => {
    // 1. Update tribunals
    const tribunals = app.findRecordsByFilter('tribunals', '1=1', '', 1000, 0)
    for (let t of tribunals) {
      let alias = t.get('alias') || ''
      if (alias.startsWith('api_publica_')) {
        t.set('alias', alias.replace('api_publica_', ''))
        app.saveNoValidate(t)
      }
    }

    // 2. Update monitoring_configs
    const configs = app.findRecordsByFilter('monitoring_configs', '1=1', '', 100, 0)
    for (let c of configs) {
      let tribunais = c.get('tribunais') || []
      let updated = false

      if (Array.isArray(tribunais)) {
        let newTribunais = tribunais.map((alias) => {
          if (typeof alias === 'string' && alias.startsWith('api_publica_')) {
            updated = true
            return alias.replace('api_publica_', '')
          }
          return alias
        })

        // Deduplicate
        newTribunais = [...new Set(newTribunais)]

        if (updated || newTribunais.length !== tribunais.length) {
          c.set('tribunais', newTribunais)
          app.saveNoValidate(c)
        }
      }
    }

    // 3. Update legal_cases
    const cases = app.findRecordsByFilter('legal_cases', '1=1', '', 10000, 0)
    for (let c of cases) {
      let alias = c.get('court_alias') || ''
      let updated = false

      if (alias.startsWith('api_publica_')) {
        alias = alias.replace('api_publica_', '')
        updated = true
      }

      // Also if alias is empty but court is filled, try to guess
      if (!alias && c.get('court')) {
        let court = String(c.get('court'))
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
        if (court.startsWith('tjrj')) alias = 'tjrj'
        else if (court.startsWith('trf1')) alias = 'trf1'
        else if (court.startsWith('trf')) alias = court.substring(0, 4)
        else if (court.startsWith('tj')) alias = court.substring(0, 4)
        else alias = 'tjrj'
        updated = true
      }

      if (updated && alias) {
        c.set('court_alias', alias)
        app.saveNoValidate(c)
      }
    }
  },
  (app) => {
    // Revert not strictly necessary, but we can re-add prefix to tribunals
    const tribunals = app.findRecordsByFilter('tribunals', '1=1', '', 1000, 0)
    for (let t of tribunals) {
      let alias = t.get('alias') || ''
      if (!alias.startsWith('api_publica_') && alias) {
        t.set('alias', 'api_publica_' + alias)
        app.saveNoValidate(t)
      }
    }
  },
)
