routerAdd(
  'GET',
  '/backend/v1/sync/all',
  (e) => {
    const orgId =
      e.auth?.getString('active_organization') || e.auth?.getString('organizations') || ''

    const caseIdsStr = e.request.url.query().get('caseIds') || ''
    const caseIds = caseIdsStr ? caseIdsStr.split(',') : []

    let filter = "lifecycle_status = 'Ativo' && case_number != ''"
    if (orgId) {
      filter += ` && organization = '${orgId}'`
    }

    let cases = $app.findRecordsByFilter('legal_cases', filter, '-updated', 1000, 0)

    if (caseIds.length > 0) {
      cases = cases.filter((c) => caseIds.includes(c.id))
    }

    let newCount = 0
    let errors = []

    for (const c of cases) {
      let caseNumberStr = c.getString('case_number')
      let caseNumberDigits = caseNumberStr.replace(/\D/g, '')
      if (caseNumberDigits.length !== 20) {
        errors.push({
          case: caseNumberStr,
          error: 'Número de processo inválido (requer 20 dígitos).',
        })
        continue
      }

      try {
        const res = $http.send({
          url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${caseNumberDigits}`,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 15,
        })

        if (res.statusCode !== 200) {
          let apiMessage =
            'A consulta foi rejeitada pelo PJe. Verifique se o número do processo é válido e tente novamente.'
          if (res.json && res.json.message) apiMessage = res.json.message
          errors.push({ case: caseNumberStr, error: apiMessage })
          continue
        }

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
                `${caseNumberStr}-${item.dataDisponibilizacao}`,
            )
            if (!numeroCom || numeroCom === 'undefined') continue

            const numProc =
              item.numeroProcesso || item.numeroprocesso || item.numero_processo || caseNumberStr
            const dataDisp = item.dataDisponibilizacao || item.data_disponibilizacao || ''

            let pjeRec
            try {
              pjeRec = $app.findFirstRecordByData(
                'pje_communications',
                'numeroComunicacao',
                numeroCom,
              )
            } catch (_) {
              const pjeCol = $app.findCollectionByNameOrId('pje_communications')
              pjeRec = new Record(pjeCol)
            }

            pjeRec.set('numeroProcesso', numProc)
            if (dataDisp) {
              pjeRec.set('dataDisponibilizacao', dataDisp)
            }
            pjeRec.set('texto', item.texto || item.conteudo || '')
            pjeRec.set('tipoComunicacao', item.tipoComunicacao || '')
            pjeRec.set('siglaTribunal', item.siglaTribunal || '')
            pjeRec.set('meio', item.meio || '')
            pjeRec.set('numeroComunicacao', numeroCom)

            if (item.destinatarios) pjeRec.set('destinatarios', item.destinatarios)
            if (item.advogados) pjeRec.set('advogados', item.advogados)

            pjeRec.set('linked_case', c.id)
            pjeRec.set('organization', c.getString('organization'))

            try {
              const isNewPje = !pjeRec.id
              $app.save(pjeRec)
              if (isNewPje) newCount++

              let movRec
              try {
                movRec = $app.findFirstRecordByData('case_movements', 'external_id', numeroCom)
              } catch (_) {
                const movCol = $app.findCollectionByNameOrId('case_movements')
                movRec = new Record(movCol)
                movRec.set('case', c.id)
              }

              let evtDate = dataDisp
              if (!evtDate || evtDate.length < 10) evtDate = new Date().toISOString()
              movRec.set('event_date', evtDate)

              movRec.set('description', `Comunicação PJe: ${item.tipoComunicacao || 'Atualização'}`)
              movRec.set('source', 'PJe')
              movRec.set('details', item.texto || item.conteudo || '')
              movRec.set('external_id', numeroCom)
              movRec.set('movement_details', item)
              movRec.set('organization', c.getString('organization'))

              $app.save(movRec)
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
      } catch (err) {
        $app.logger().error('Error syncing case', 'case', caseNumberDigits, 'error', String(err))
        errors.push({ case: caseNumberStr, error: String(err) })
      }
    }

    return e.json(200, { success: true, new_communications: newCount, errors })
  },
  $apis.requireAuth(),
)
