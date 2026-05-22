migrate(
  (app) => {
    var orgColId = ''
    try {
      var orgCol = app.findCollectionByNameOrId('organizations')
      orgColId = orgCol.id
    } catch (e) {
      // Organizations collection might not exist yet
    }

    function ensureFields(colName, fieldsData) {
      try {
        var col = app.findCollectionByNameOrId(colName)
        var changed = false
        for (var i = 0; i < fieldsData.length; i++) {
          var fData = fieldsData[i]
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
      } catch (e) {
        // Collection hasn't been created yet, safely ignore
      }
    }

    var commonFields = [
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

    var occFields = [
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

    var movFields = [
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
    // Graceful degradation structural migrations generally don't need revert unless strictly required
  },
)
