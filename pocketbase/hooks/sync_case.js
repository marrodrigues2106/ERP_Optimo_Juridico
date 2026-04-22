routerAdd(
  'GET',
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
    let caseNumberDigits = caseNumberStr.replace(/\D/g, '')
    if (caseNumberDigits.length !== 20) {
      return e.badRequestError(
        'Número de processo inválido. O número deve conter exatamente 20 dígitos (Padrão CNJ).',
      )
    }

    let newCount = 0

    try {
      const res = $http.send({
        url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${caseNumberDigits}`,
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 15,
      })

      if (res.statusCode !== 200) {
        let responseBody = ''
        let apiMessage = ''
        try {
          if (res.json) {
            responseBody = JSON.stringify(res.json)
            if (res.json.message) apiMessage = res.json.message
          } else if (res.body) {
            responseBody = new TextDecoder().decode(res.body)
            const parsed = JSON.parse(responseBody)
            if (parsed.message) apiMessage = parsed.message
          }
        } catch (decErr) {}

        try {
          const logCol = $app.findCollectionByNameOrId('system_logs')
          const logRec = new Record(logCol)
          logRec.set('level', 'error')
          logRec.set('module', 'pje_sync')
          logRec.set('message', `Falha ao consultar API PJe para o processo ${caseNumberDigits}`)
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
          apiMessage ||
            'A consulta foi rejeitada pelo PJe. Verifique se o número do processo é válido e tente novamente.',
        )
      }

      let items = []
      if (res.json && Array.isArray(res.json)) items = res.json
      else if (res.json && res.json.items && Array.isArray(res.json.items)) items = res.json.items
      else if (res.json && res.json.data && Array.isArray(res.json.data)) items = res.json.data

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
          pjeRec = $app.findFirstRecordByData('pje_communications', 'numeroComunicacao', numeroCom)
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
    } catch (err) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(logCol)
        logRec.set('level', 'error')
        logRec.set('module', 'pje_sync')
        logRec.set('message', `Exceção ao sincronizar processo ${caseNumberDigits}`)
        logRec.set('details', { error: String(err) })
        logRec.set('organization', c.getString('organization'))
        if (e.auth) logRec.set('user', e.auth.id)
        $app.save(logRec)
      } catch (logErr) {}

      $app.logger().error('Error syncing case', 'case', caseNumberDigits, 'error', String(err))
      return e.internalServerError(
        'Ocorreu um erro interno de rede ao sincronizar o processo. Tente novamente mais tarde.',
      )
    }

    return e.json(200, { success: true, new_communications: newCount })
  },
  $apis.requireAuth(),
)
