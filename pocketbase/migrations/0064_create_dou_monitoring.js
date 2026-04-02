migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('users').id

    const pubDou = new Collection({
      name: 'publicacoes_dou',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data_publicacao', type: 'date' },
        { name: 'secao', type: 'text' },
        { name: 'orgao', type: 'text' },
        { name: 'titulo', type: 'text' },
        { name: 'texto_bruto', type: 'text' },
        { name: 'texto_normalizado', type: 'text' },
        { name: 'url_origem', type: 'url' },
        { name: 'hash_conteudo', type: 'text', required: true },
        { name: 'fonte_coleta', type: 'text' },
        { name: 'data_coleta', type: 'date' },
        {
          name: 'status_processamento',
          type: 'select',
          values: ['bruto', 'normalizado', 'indexado', 'erro'],
        },
        { name: 'metadados_adicionais', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_pub_dou_hash ON publicacoes_dou (hash_conteudo)'],
    })
    app.save(pubDou)

    const termos = new Collection({
      name: 'termos_monitorados',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'termo', type: 'text', required: true },
        { name: 'tipo_termo', type: 'select', values: ['palavra-chave', 'frase', 'regex'] },
        { name: 'usuario_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'ativo', type: 'bool' },
        { name: 'data_cadastro', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(termos)

    const ocorrencias = new Collection({
      name: 'ocorrencias_dou',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'publicacao_id', type: 'relation', collectionId: pubDou.id, maxSelect: 1 },
        { name: 'termo_id', type: 'relation', collectionId: termos.id, maxSelect: 1 },
        { name: 'trecho_encontrado', type: 'text' },
        { name: 'contexto_completo', type: 'text' },
        { name: 'data_deteccao', type: 'date' },
        { name: 'status_alerta', type: 'select', values: ['pendente', 'enviado', 'visualizado'] },
        { name: 'score_relevancia', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(ocorrencias)

    const logs = new Collection({
      name: 'logs_processamento',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'publicacao_id', type: 'relation', collectionId: pubDou.id, maxSelect: 1 },
        { name: 'etapa', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'mensagem', type: 'text' },
        { name: 'data_hora', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(logs)

    const config = new Collection({
      name: 'configuracoes_alerta',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'usuario_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'tipo_notificacao', type: 'select', values: ['app', 'email'] },
        { name: 'frequencia', type: 'select', values: ['diario', 'imediato'] },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(config)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('configuracoes_alerta'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('logs_processamento'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('ocorrencias_dou'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('termos_monitorados'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('publicacoes_dou'))
    } catch (e) {}
  },
)
