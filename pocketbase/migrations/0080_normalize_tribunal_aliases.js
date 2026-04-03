migrate(
  (app) => {
    // Normalize tribunals
    try {
      const tribunals = app.findRecordsByFilter('tribunals', '1=1', '', 1000, 0)
      for (let t of tribunals) {
        const alias = t.get('alias')
        if (alias) {
          const lowerAlias = String(alias).toLowerCase().trim()
          if (alias !== lowerAlias) {
            t.set('alias', lowerAlias)
            app.saveNoValidate(t)
          }
        }
      }
    } catch (e) {
      console.log('Error normalizing tribunals:', e)
    }

    // Normalize monitoring_configs
    try {
      const configs = app.findRecordsByFilter('monitoring_configs', '1=1', '', 100, 0)
      for (let c of configs) {
        let tribunais = c.get('tribunais')
        if (Array.isArray(tribunais)) {
          const lowerTribunais = tribunais.map((t) => String(t).toLowerCase().trim())
          c.set('tribunais', lowerTribunais)
          app.saveNoValidate(c)
        }
      }
    } catch (e) {
      console.log('Error normalizing monitoring configs:', e)
    }
  },
  (app) => {
    // Downgrade not applicable, maintaining lowercase format is safe
  },
)
