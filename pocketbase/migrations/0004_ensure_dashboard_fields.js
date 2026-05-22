migrate(
  (app) => {
    let orgColId = ''
    try {
      const orgCol = app.findCollectionByNameOrId('organizations')
      orgColId = orgCol.id
    } catch (err) {
      // Organizations collection might not exist yet
    }

    function ensureFields(colName, fieldsData) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        let changed = false
        for (let i = 0; i < fieldsData.length; i++) {
          const fData = fieldsData[i]
          if (!col.fields.getByName(fData.name)) {
            if (fData.type === 'bool') {
              col.fields.add(new BoolField(fData.props))
            } else if (fData.type === 'select') {
              col.fields.add(new SelectField(fData.props))
            } else if (fData.type === 'relation') {
              col.fields.add(new RelationField(fData.props))
            }
            changed = true
          }
        }
        if (changed) {
          app.save(col)
        }
      } catch (err) {
        // Collection hasn't been created yet, safely ignore
      }
    }

    const commonFields = [
      { type: 'bool', name: 'is_archived', props: { name: 'is_archived' } },
      { type: 'bool', name: 'is_read', props: { name: 'is_read' } },
    ]

    if (orgColId) {
      commonFields.push({
        type: 'relation',
        name: 'organization',
        props: { name: 'organization', collectionId: orgColId, maxSelect: 1 },
      })
    }

    ensureFields('pje_communications', commonFields)
    ensureFields('gazette_publications', commonFields)

    const occFields = [
      { type: 'bool', name: 'is_archived', props: { name: 'is_archived' } },
      {
        type: 'select',
        name: 'status_alerta',
        props: { name: 'status_alerta', values: ['pendente', 'visualizado'], maxSelect: 1 },
      },
    ]

    if (orgColId) {
      occFields.push({
        type: 'relation',
        name: 'organization',
        props: { name: 'organization', collectionId: orgColId, maxSelect: 1 },
      })
    }
    ensureFields('ocorrencias_dou', occFields)

    const movFields = [
      { type: 'bool', name: 'notified_client', props: { name: 'notified_client' } },
      { type: 'bool', name: 'is_archived', props: { name: 'is_archived' } },
    ]

    if (orgColId) {
      movFields.push({
        type: 'relation',
        name: 'organization',
        props: { name: 'organization', collectionId: orgColId, maxSelect: 1 },
      })
    }
    ensureFields('case_movements', movFields)
  },
  (app) => {
    // no revert needed
  },
)
