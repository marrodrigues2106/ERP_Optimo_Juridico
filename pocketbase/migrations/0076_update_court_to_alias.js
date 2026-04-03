migrate(
  (app) => {
    const cases = app.findRecordsByFilter('legal_cases', '1=1', '', 10000, 0)
    for (let c of cases) {
      let alias = c.get('court_alias') || ''
      let court = c.get('court') || ''

      if (alias) {
        if (court !== alias) {
          c.set('court', alias)
          app.saveNoValidate(c)
        }
      } else if (court) {
        let newAlias = String(court)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')

        if (newAlias.startsWith('tjrj')) newAlias = 'tjrj'
        else if (newAlias.startsWith('trf1')) newAlias = 'trf1'
        else if (newAlias.startsWith('trf')) newAlias = newAlias.substring(0, 4)
        else if (newAlias.startsWith('tj')) newAlias = newAlias.substring(0, 4)
        else if (newAlias.startsWith('stj')) newAlias = 'stj'
        else if (newAlias.startsWith('stf')) newAlias = 'stf'
        else if (newAlias.startsWith('tst')) newAlias = 'tst'
        else if (newAlias.startsWith('tse')) newAlias = 'tse'
        else newAlias = 'tjrj'

        c.set('court_alias', newAlias)
        c.set('court', newAlias)
        app.saveNoValidate(c)
      }
    }
  },
  (app) => {
    // Unidirectional
  },
)
