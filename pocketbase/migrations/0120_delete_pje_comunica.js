migrate(
  (app) => {
    try {
      const results = app.findCollectionByNameOrId('pje_search_results')
      app.delete(results)
    } catch (_) {}

    try {
      const history = app.findCollectionByNameOrId('pje_search_history')
      app.delete(history)
    } catch (_) {}

    try {
      const configs = app.findCollectionByNameOrId('monitoring_configs')
      configs.fields.removeByName('pje_waf_bypass_active')
      configs.fields.removeByName('pje_last_block')
      configs.fields.removeByName('pje_api_key')
      configs.fields.removeByName('pje_base_url')
      app.save(configs)
    } catch (_) {}
  },
  (app) => {
    try {
      const configs = app.findCollectionByNameOrId('monitoring_configs')
      let changed = false
      if (!configs.fields.getByName('pje_waf_bypass_active')) {
        configs.fields.add(new BoolField({ name: 'pje_waf_bypass_active' }))
        changed = true
      }
      if (!configs.fields.getByName('pje_last_block')) {
        configs.fields.add(new DateField({ name: 'pje_last_block' }))
        changed = true
      }
      if (!configs.fields.getByName('pje_api_key')) {
        configs.fields.add(new TextField({ name: 'pje_api_key' }))
        changed = true
      }
      if (!configs.fields.getByName('pje_base_url')) {
        configs.fields.add(new TextField({ name: 'pje_base_url' }))
        changed = true
      }
      if (changed) app.save(configs)
    } catch (_) {}

    let orgsId = ''
    try {
      orgsId = app.findCollectionByNameOrId('organizations').id
    } catch (_) {}

    let historyId = ''
    try {
      historyId = app.findCollectionByNameOrId('pje_search_history').id
    } catch (_) {
      if (orgsId) {
        const history = new Collection({
          name: 'pje_search_history',
          type: 'base',
          listRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
          viewRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
          createRule:
            "(@request.auth.id != '') && organization = @request.auth.active_organization",
          updateRule: null,
          deleteRule: null,
          fields: [
            { name: 'consulta', type: 'json' },
            {
              name: 'business_status',
              type: 'select',
              required: true,
              values: [
                'sucesso',
                'sem_resultados',
                'erro',
                'erro_validacao',
                'erro_rede',
                'bloqueio_geografico',
                'acesso_proibido',
              ],
            },
            { name: 'debug_url', type: 'text' },
            { name: 'response_data', type: 'text' },
            {
              name: 'organization',
              type: 'relation',
              required: true,
              collectionId: orgsId,
              maxSelect: 1,
            },
            { name: 'termo', type: 'text' },
            { name: 'tipo_busca', type: 'text' },
            { name: 'status', type: 'text' },
            { name: 'quantidade_resultados', type: 'number' },
            { name: 'mensagem', type: 'text' },
            { name: 'data_inicio', type: 'text' },
            { name: 'data_fim', type: 'text' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        })
        app.save(history)
        historyId = history.id
      }
    }

    try {
      app.findCollectionByNameOrId('pje_search_results')
    } catch (_) {
      if (historyId && orgsId) {
        const results = new Collection({
          name: 'pje_search_results',
          type: 'base',
          listRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
          viewRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
          createRule:
            "(@request.auth.id != '') && organization = @request.auth.active_organization",
          updateRule: null,
          deleteRule: null,
          fields: [
            {
              name: 'search_history',
              type: 'relation',
              required: true,
              collectionId: historyId,
              maxSelect: 1,
            },
            { name: 'sigla_tribunal', type: 'text' },
            { name: 'tipo_comunicacao', type: 'text' },
            { name: 'nome_orgao', type: 'text' },
            { name: 'texto', type: 'text' },
            { name: 'numero_processo', type: 'text' },
            { name: 'meio', type: 'text' },
            { name: 'tipo_documento', type: 'text' },
            { name: 'nome_classe', type: 'text' },
            { name: 'data_disponibilizacao', type: 'text' },
            { name: 'numero_comunicacao', type: 'text' },
            { name: 'link', type: 'text' },
            { name: 'hash_comunicacao', type: 'text' },
            { name: 'status_comunicacao', type: 'text' },
            { name: 'advogado_nome', type: 'text' },
            { name: 'advogado_numero_oab', type: 'text' },
            { name: 'advogado_uf_oab', type: 'text' },
            { name: 'raw_json', type: 'json' },
            {
              name: 'organization',
              type: 'relation',
              required: true,
              collectionId: orgsId,
              maxSelect: 1,
            },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_pje_results_history ON pje_search_results (search_history)',
            'CREATE INDEX idx_pje_results_processo ON pje_search_results (numero_processo)',
          ],
        })
        app.save(results)
      }
    }
  },
)
