migrate(
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')
    if (!lawsuits.fields.getByName('entryType')) {
      lawsuits.fields.add(
        new SelectField({
          name: 'entryType',
          values: ['Processo', 'Serviço Jurídico'],
          maxSelect: 1,
        }),
      )
    }
    if (!lawsuits.fields.getByName('trackingLogs')) {
      lawsuits.fields.add(new JSONField({ name: 'trackingLogs' }))
    }
    if (!lawsuits.fields.getByName('datajudStatus')) {
      lawsuits.fields.add(new TextField({ name: 'datajudStatus' }))
    }
    if (!lawsuits.fields.getByName('gazetteTerms')) {
      lawsuits.fields.add(new TextField({ name: 'gazetteTerms' }))
    }
    const numberField = lawsuits.fields.getByName('number')
    if (numberField) {
      numberField.required = false
    }
    app.save(lawsuits)

    const collaborators = app.findCollectionByNameOrId('collaborators')
    if (!collaborators.fields.getByName('personalSearchTerms')) {
      collaborators.fields.add(new TextField({ name: 'personalSearchTerms' }))
    }
    app.save(collaborators)
  },
  (app) => {},
)
