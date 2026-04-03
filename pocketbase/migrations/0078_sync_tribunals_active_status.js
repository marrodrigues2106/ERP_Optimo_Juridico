migrate(
  (app) => {
    try {
      const configs = app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      let activeAliases = []

      if (configs.length > 0) {
        const cfg = configs[0]
        const tribunais = cfg.get('tribunais') || []
        activeAliases = tribunais.map((t) => String(t).toLowerCase())

        if (JSON.stringify(tribunais) !== JSON.stringify(activeAliases)) {
          cfg.set('tribunais', activeAliases)
          app.saveNoValidate(cfg)
        }
      }

      const tribunals = app.findRecordsByFilter('tribunals', '1=1', '', 1000, 0)
      for (let t of tribunals) {
        let updated = false
        const alias = t.get('alias')
        const aliasLower = alias ? String(alias).toLowerCase() : ''

        if (alias !== aliasLower) {
          t.set('alias', aliasLower)
          updated = true
        }

        const isActive = activeAliases.includes(aliasLower)
        if (t.get('active') !== isActive) {
          t.set('active', isActive)
          updated = true
        }

        if (updated) {
          app.saveNoValidate(t)
        }
      }
    } catch (err) {
      console.log('Error migrating tribunals active status:', err)
    }
  },
  (app) => {
    // Irreversible operation. Down migration is a no-op.
  },
)
