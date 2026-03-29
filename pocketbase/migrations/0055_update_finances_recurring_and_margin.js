migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('finances')

    if (!col.fields.getByName('frequency')) {
      col.fields.add(
        new SelectField({
          name: 'frequency',
          maxSelect: 1,
          values: ['única', 'semanal', 'quinzenal', 'mensal'],
        }),
      )
    }

    if (!col.fields.getByName('recurrence_id')) {
      col.fields.add(new TextField({ name: 'recurrence_id' }))
    }

    if (!col.fields.getByName('margin_applied')) {
      col.fields.add(new NumberField({ name: 'margin_applied' }))
    }

    app.save(col)

    // Add index for recurrence_id to speed up bulk deletion
    col.addIndex('idx_finances_recurrence_id', false, 'recurrence_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('finances')

    col.removeIndex('idx_finances_recurrence_id')
    col.removeField('frequency')
    col.removeField('recurrence_id')
    col.removeField('margin_applied')

    app.save(col)
  },
)
