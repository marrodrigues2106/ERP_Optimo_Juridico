migrate(
  (app) => {
    let orgColId = ''
    try {
      const orgCol = app.findCollectionByNameOrId('organizations')
      orgColId = orgCol.id
    } catch (e) {
      // Organizations collection might not exist yet
    }

    const ensureFields = (colName, fields) => {
      try {
        const col = app.findCollectionByNameOrId(colName)
        let changed = false
        for (const f of fields) {
          if (!col.fields.getByName(f.name)) {
            col.fields.add(f)
            changed = true
          }
        }
        if (changed) {
          app.save(col)
        }
      } catch (e) {
        // Collection hasn't been created yet, safely ignore
      }
    }

    const commonFields = [
      new BoolField({ name: 'is_archived' }),
      new BoolField({ name: 'is_read' }),
    ]
    if (orgColId) {
      commonFields.push(
        new RelationField({ name: 'organization', collectionId: orgColId, maxSelect: 1 }),
      )
    }

    ensureFields('pje_communications', commonFields)
    ensureFields('gazette_publications', commonFields)

    const occFields = [
      new BoolField({ name: 'is_archived' }),
      new SelectField({ name: 'status_alerta', values: ['pendente', 'visualizado'], maxSelect: 1 }),
    ]
    if (orgColId) {
      occFields.push(
        new RelationField({ name: 'organization', collectionId: orgColId, maxSelect: 1 }),
      )
    }
    ensureFields('ocorrencias_dou', occFields)

    const movFields = [
      new BoolField({ name: 'notified_client' }),
      new BoolField({ name: 'is_archived' }),
    ]
    if (orgColId) {
      movFields.push(
        new RelationField({ name: 'organization', collectionId: orgColId, maxSelect: 1 }),
      )
    }
    ensureFields('case_movements', movFields)
  },
  (app) => {
    // Graceful degradation structural migrations generally don't need revert unless strictly required
  },
)
