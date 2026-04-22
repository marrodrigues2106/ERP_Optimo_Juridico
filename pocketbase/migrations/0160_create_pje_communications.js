migrate(
  (app) => {
    const col = new Collection({
      name: 'pje_communications',
      type: 'base',
      listRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      viewRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      createRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      updateRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      deleteRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      fields: [
        { name: 'numeroProcesso', type: 'text', required: true },
        { name: 'dataDisponibilizacao', type: 'date' },
        { name: 'texto', type: 'text' },
        { name: 'tipoComunicacao', type: 'text' },
        { name: 'siglaTribunal', type: 'text' },
        { name: 'meio', type: 'text' },
        { name: 'numeroComunicacao', type: 'text' },
        { name: 'destinatarios', type: 'json' },
        { name: 'advogados', type: 'json' },
        { name: 'is_read', type: 'bool' },
        {
          name: 'linked_case',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('legal_cases').id,
        },
        {
          name: 'organization',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('organizations').id,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_pje_com_numero ON pje_communications (numeroComunicacao) WHERE numeroComunicacao != ''",
        'CREATE INDEX idx_pje_com_processo ON pje_communications (numeroProcesso)',
        'CREATE INDEX idx_pje_com_data ON pje_communications (dataDisponibilizacao)',
      ],
    })
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pje_communications')
    app.delete(col)
  },
)
