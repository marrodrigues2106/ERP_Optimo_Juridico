migrate(
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('publicacoes_dou')
      app.delete(collection)
    } catch (_) {
      // Collection might not exist or was already deleted
    }
  },
  (app) => {
    // Irreversible migration
  },
)
