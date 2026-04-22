migrate(
  (app) => {
    const comms = app.findRecordsByFilter(
      'pje_communications',
      "numeroComunicacao != ''",
      '',
      10000,
      0,
    )
    const movCol = app.findCollectionByNameOrId('case_movements')

    let added = 0
    let updated = 0

    for (const comm of comms) {
      const caseId = comm.getString('linked_case')
      if (!caseId) continue

      const numCom = comm.getString('numeroComunicacao')

      try {
        app.findFirstRecordByData('case_movements', 'external_id', numCom)
        continue // Already exists with this external_id
      } catch (_) {}

      const text = comm.getString('texto') || ''
      let existingMov = null

      try {
        const existing = app.findRecordsByFilter(
          'case_movements',
          `case = "${caseId}" && source = 'PJe'`,
          '',
          100,
          0,
        )
        for (const m of existing) {
          if (
            (m.getString('details') || '') === text ||
            (text && m.getString('details').includes(text.substring(0, 50)))
          ) {
            existingMov = m
            break
          }
        }
      } catch (__) {}

      if (existingMov) {
        if (!existingMov.getString('external_id')) {
          try {
            existingMov.set('external_id', numCom)
            existingMov.set('movement_details', {
              tipoComunicacao: comm.getString('tipoComunicacao'),
              siglaTribunal: comm.getString('siglaTribunal'),
              meio: comm.getString('meio'),
              numeroComunicacao: numCom,
              texto: comm.getString('texto'),
            })

            let evtDateStr = comm.getString('dataDisponibilizacao')
            if (evtDateStr && evtDateStr.length >= 10) {
              existingMov.set('event_date', evtDateStr)
            }

            app.save(existingMov)
            updated++
          } catch (err) {
            console.log('Error updating existing movement', err)
          }
        }
        continue
      }

      try {
        const mov = new Record(movCol)
        mov.set('case', caseId)

        let evtDateStr = comm.getString('dataDisponibilizacao')
        if (!evtDateStr || evtDateStr.length < 10) evtDateStr = comm.getString('created')
        mov.set('event_date', evtDateStr)

        mov.set(
          'description',
          `Comunicação PJe: ${comm.getString('tipoComunicacao') || 'Atualização'}`,
        )
        mov.set('source', 'PJe')
        mov.set('details', text)
        mov.set('external_id', numCom)

        mov.set('movement_details', {
          tipoComunicacao: comm.getString('tipoComunicacao'),
          siglaTribunal: comm.getString('siglaTribunal'),
          meio: comm.getString('meio'),
          numeroComunicacao: numCom,
          texto: text,
        })

        mov.set('organization', comm.getString('organization'))
        app.save(mov)
        added++
      } catch (err) {
        console.log('Error syncing old pje communication to movement:', err)
      }
    }

    console.log(
      `Migrated ${added} missing case movements from PJe communications, updated ${updated} existing.`,
    )
  },
  (app) => {
    // Down migration not applicable
  },
)
