routerAdd(
  'POST',
  '/backend/v1/sync/all',
  (e) => {
    const orgId =
      e.auth?.getString('active_organization') || e.auth?.getString('organizations') || ''

    let filter = "lifecycle_status = 'Ativo' && case_number != ''"
    if (orgId) {
      filter += ` && organization = '${orgId}'`
    }

    const cases = $app.findRecordsByFilter('legal_cases', filter, '-updated', 100, 0)

    let newCount = 0

    for (const c of cases) {
      let caseNumberStr = c.getString('case_number')
      let caseNumber = caseNumberStr.replace(/\D/g, '')
      if (caseNumber.length < 10) continue

      try {
        const res = $http.send({
          url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${caseNumber}`,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 15,
        })

        if (res.statusCode === 200 && res.json) {
          let items = []
          if (Array.isArray(res.json)) items = res.json
          else if (res.json.items && Array.isArray(res.json.items)) items = res.json.items
          else if (res.json.data && Array.isArray(res.json.data)) items = res.json.data

          let updatedCase = false
          let currentParties = c.getString('parties')
          let currentCourt = c.getString('court')

          if (items.length > 0) {
            if (!currentCourt || currentCourt.toLowerCase() === 'none' || currentCourt === '') {
              const court = items[0].siglaTribunal
              if (court) {
                c.set('court', court.toLowerCase())
                c.set('court_alias', court.toLowerCase())
                updatedCase = true
              }
            }
            if (!currentParties || currentParties.length < 5) {
              const allParties = new Set()
              items.forEach((item) => {
                if (item.destinatarios && Array.isArray(item.destinatarios)) {
                  item.destinatarios.forEach((d) => {
                    if (d.nome) allParties.add(d.nome)
                  })
                }
              })
              if (allParties.size > 0) {
                c.set('parties', Array.from(allParties).join(' x '))
                updatedCase = true
              }
            }
            if (updatedCase) {
              try {
                $app.save(c)
              } catch (err) {}
            }
          }

          for (const item of items) {
            const numeroCom = String(
              item.id ||
                item.numeroComunicacao ||
                item.hash ||
                `${caseNumber}-${item.dataDisponibilizacao}`,
            )
            if (!numeroCom || numeroCom === 'undefined') continue

            try {
              $app.findFirstRecordByData('pje_communications', 'numeroComunicacao', numeroCom)
              continue // already exists
            } catch (_) {
              const pjeCol = $app.findCollectionByNameOrId('pje_communications')
              const record = new Record(pjeCol)

              const numProc =
                item.numeroProcesso || item.numeroprocesso || item.numero_processo || caseNumberStr
              const dataDisp = item.dataDisponibilizacao || item.data_disponibilizacao || ''

              record.set('numeroProcesso', numProc)
              if (dataDisp) {
                record.set('dataDisponibilizacao', dataDisp)
              }
              record.set('texto', item.texto || item.conteudo || '')
              record.set('tipoComunicacao', item.tipoComunicacao || '')
              record.set('siglaTribunal', item.siglaTribunal || '')
              record.set('meio', item.meio || '')
              record.set('numeroComunicacao', numeroCom)

              if (item.destinatarios) record.set('destinatarios', item.destinatarios)
              if (item.advogados) record.set('advogados', item.advogados)

              record.set('linked_case', c.id)
              record.set('organization', c.getString('organization'))

              try {
                $app.save(record)
                newCount++

                try {
                  const movCol = $app.findCollectionByNameOrId('case_movements')
                  const mov = new Record(movCol)
                  mov.set('case', c.id)

                  let evtDate = dataDisp
                  if (!evtDate || evtDate.length < 10) evtDate = new Date().toISOString()
                  mov.set('event_date', evtDate)

                  mov.set(
                    'description',
                    `Comunicação PJe: ${item.tipoComunicacao || 'Atualização'}`,
                  )
                  mov.set('source', 'PJe')
                  mov.set('details', item.texto || item.conteudo || '')
                  mov.set('external_id', numeroCom)
                  mov.set('movement_details', item)
                  mov.set('organization', c.getString('organization'))

                  $app.save(mov)
                } catch (movErr) {
                  $app
                    .logger()
                    .error(
                      'Error saving case movement for pje communication',
                      'error',
                      String(movErr),
                    )
                }
              } catch (saveErr) {
                $app
                  .logger()
                  .error(
                    'Error saving pje communication',
                    'numeroCom',
                    numeroCom,
                    'error',
                    String(saveErr),
                  )
              }
            }
          }
        }
      } catch (err) {
        $app.logger().error('Error syncing case', 'case', caseNumber, 'error', String(err))
      }
    }

    return e.json(200, { success: true, new_communications: newCount })
  },
  $apis.requireAuth(),
)
