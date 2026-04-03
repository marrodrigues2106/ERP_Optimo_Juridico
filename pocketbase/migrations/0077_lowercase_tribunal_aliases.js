migrate(
  (app) => {
    // 1. Tribunals
    try {
      const tribunals = app.findRecordsByFilter('tribunals', '1=1', '', 1000, 0)
      for (let t of tribunals) {
        const alias = t.get('alias')
        if (alias && alias !== alias.toLowerCase()) {
          t.set('alias', alias.toLowerCase())
          app.saveNoValidate(t)
        }
      }
    } catch (err) {
      console.log('Error migrating tribunals:', err)
    }

    // 2. Legal Cases
    try {
      const cases = app.findRecordsByFilter('legal_cases', '1=1', '', 10000, 0)
      for (let c of cases) {
        let updated = false
        const alias = c.get('court_alias')
        if (alias && alias !== alias.toLowerCase()) {
          c.set('court_alias', alias.toLowerCase())
          updated = true
        }

        const court = c.get('court')
        // If court is exactly the alias (alphanumeric only), lowercase it too
        if (court && court.match(/^[A-Za-z0-9]+$/) && court !== court.toLowerCase()) {
          c.set('court', court.toLowerCase())
          updated = true
        }

        if (updated) {
          app.saveNoValidate(c)
        }
      }
    } catch (err) {
      console.log('Error migrating legal_cases:', err)
    }

    // 3. Monitoring Configs
    try {
      const configs = app.findRecordsByFilter('monitoring_configs', '1=1', '', 100, 0)
      for (let cfg of configs) {
        let updated = false

        const tribunais = cfg.get('tribunais') || []
        if (Array.isArray(tribunais)) {
          const lowerTribunais = tribunais.map((t) => String(t).toLowerCase())
          if (JSON.stringify(tribunais) !== JSON.stringify(lowerTribunais)) {
            cfg.set('tribunais', lowerTribunais)
            updated = true
          }
        }

        const stats = cfg.get('datajud_tribunal_status') || {}
        if (typeof stats === 'object' && stats !== null && !Array.isArray(stats)) {
          const newStats = {}
          let statsUpdated = false
          for (const [key, val] of Object.entries(stats)) {
            const lowerKey = key.toLowerCase()
            newStats[lowerKey] = val
            if (key !== lowerKey) statsUpdated = true
          }
          if (statsUpdated) {
            cfg.set('datajud_tribunal_status', newStats)
            updated = true
          }
        }

        if (updated) {
          app.saveNoValidate(cfg)
        }
      }
    } catch (err) {
      console.log('Error migrating monitoring_configs:', err)
    }
  },
  (app) => {
    // Irreversible operation. Down migration is a no-op.
  },
)
