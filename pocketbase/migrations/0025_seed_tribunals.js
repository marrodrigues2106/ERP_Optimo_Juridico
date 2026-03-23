migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('tribunals')
    const states = [
      'ac',
      'al',
      'ap',
      'am',
      'ba',
      'ce',
      'df',
      'es',
      'go',
      'ma',
      'mt',
      'ms',
      'mg',
      'pa',
      'pb',
      'pr',
      'pe',
      'pi',
      'rj',
      'rn',
      'rs',
      'ro',
      'rr',
      'sc',
      'sp',
      'se',
      'to',
    ]

    const insert = (name, alias) => {
      const r = new Record(collection)
      r.set('name', name)
      r.set('alias', alias)
      r.set('active', true)
      app.save(r)
    }

    insert('Supremo Tribunal Federal', 'stf')
    insert('Superior Tribunal de Justiça', 'stj')
    insert('Tribunal Superior do Trabalho', 'tst')
    insert('Tribunal Superior Eleitoral', 'tse')
    insert('Superior Tribunal Militar', 'stm')
    insert('Conselho Nacional de Justiça', 'cnj')

    for (let i = 1; i <= 6; i++) {
      insert(`Tribunal Regional Federal da ${i}ª Região`, `trf${i}`)
    }
    for (let i = 1; i <= 24; i++) {
      insert(`Tribunal Regional do Trabalho da ${i}ª Região`, `trt${i}`)
    }
    states.forEach((st) => {
      insert(`Tribunal de Justiça do Estado - ${st.toUpperCase()}`, `tj${st}`)
      insert(`Tribunal Regional Eleitoral - ${st.toUpperCase()}`, `tre${st}`)
    })

    insert('Tribunal de Justiça Militar - MG', 'tjmmg')
    insert('Tribunal de Justiça Militar - RS', 'tjmrs')
    insert('Tribunal de Justiça Militar - SP', 'tjmsp')
  },
  (app) => {
    app.db().newQuery('DELETE FROM tribunals').execute()
  },
)
