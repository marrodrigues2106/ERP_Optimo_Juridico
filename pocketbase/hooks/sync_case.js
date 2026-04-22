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

    let caseNumberStr = c.getString('case_number') || ''
    let caseNumber = caseNumberStr.replace(/\D/g, '')
    if (caseNumber.length < 10) {
      return e.badRequestError(
        'Número de processo inválido. Verifique o número informado no cadastro.',
      )
    }

    let newCount = 0

    try {
      const res = $http.send({
        url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${caseNumber}`,
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 15,
      })

      if (res.statusCode !== 200) {
        let responseBody = ''
        try {
          if (res.json) {
            responseBody = JSON.stringify(res.json)
          } else if (res.body) {
            responseBody = new TextDecoder().decode(res.body)
          }
        } catch (decErr) {}

        try {
          const logCol = $app.findCollectionByNameOrId('system_logs')
          const logRec = new Record(logCol)
          logRec.set('level', 'error')
          logRec.set('module', 'pje_sync')
          logRec.set('message', `Falha ao consultar API PJe para o processo ${caseNumber}`)
          logRec.set('details', {
            statusCode: res.statusCode,
            body: responseBody,
          })
          logRec.set('organization', c.getString('organization'))
          if (e.auth) logRec.set('user', e.auth.id)
          $app.save(logRec)
        } catch (logErr) {
          $app.logger().error('Error saving to system_logs', 'err', String(logErr))
        }

        if (res.statusCode >= 500) {
          return e.internalServerError(
            'O serviço do PJe está temporariamente indisponível. Tente novamente mais tarde.',
          )
        }
        return e.badRequestError(
          'A consulta foi rejeitada pelo PJe. Verifique se o número do processo é válido e tente novamente.',
        )
      }

      const items = res.json && res.json.items ? res.json.items : []

      // Metadata update
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
                .error('Error saving case movement for pje communication', 'error', String(movErr))
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
    } catch (err) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(logCol)
        logRec.set('level', 'error')
        logRec.set('module', 'pje_sync')
        logRec.set('message', `Exceção ao sincronizar processo ${caseNumber}`)
        logRec.set('details', { error: String(err) })
        logRec.set('organization', c.getString('organization'))
        if (e.auth) logRec.set('user', e.auth.id)
        $app.save(logRec)
      } catch (logErr) {}

      $app.logger().error('Error syncing case', 'case', caseNumber, 'error', String(err))
      return e.internalServerError(
        'Ocorreu um erro interno de rede ao sincronizar o processo. Tente novamente mais tarde.',
      )
    }

    return e.json(200, { success: true, new_communications: newCount })
  },
  $apis.requireAuth(),
)
