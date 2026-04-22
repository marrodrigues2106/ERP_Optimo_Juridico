routerAdd(
  'POST',
  '/backend/v1/sync/case/{caseId}',
  (e) => {
    const caseId = e.request.pathValue('caseId')

    let c
    try {
      c = $app.findRecordById('legal_cases', caseId)
    } catch (_) {
      return e.notFoundError('Processo não encontrado')
    }

    let caseNumberStr = c.getString('case_number')
    let caseNumber = caseNumberStr.replace(/\D/g, '')
    if (caseNumber.length < 10) {
      return e.badRequestError('Número de processo inválido')
    }

    let newCount = 0

    try {
      const res = $http.send({
        url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${caseNumber}`,
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 15,
      })

      if (res.statusCode === 200 && res.json && res.json.items) {
        const items = res.json.items
        for (const item of items) {
          const numeroCom = String(item.id || item.numeroComunicacao || '')
          if (!numeroCom) continue

          try {
            $app.findFirstRecordByData('pje_communications', 'numeroComunicacao', numeroCom)
            continue
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

                mov.set('description', `Comunicação PJe: ${item.tipoComunicacao || 'Atualização'}`)
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
      } else if (res.statusCode !== 200) {
        return e.badRequestError('Erro ao comunicar com a API do PJe.')
      }
    } catch (err) {
      $app.logger().error('Error syncing case', 'case', caseNumber, 'error', String(err))
      return e.internalServerError('Erro ao sincronizar processo.')
    }

    return e.json(200, { success: true, new_communications: newCount })
  },
  $apis.requireAuth(),
)
