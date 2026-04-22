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
          timeout: 10,
        })

        if (res.statusCode === 200 && res.json && res.json.items) {
          const items = res.json.items
          for (const item of items) {
            const numeroCom = String(item.id || item.numeroComunicacao || '')
            if (!numeroCom) continue

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
