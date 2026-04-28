migrate(
  (app) => {
    const collectionsToDrop = [
      'publicacoes_dou',
      'ocorrencias_dou',
      'dou_reprocessing_queue',
      'logs_processamento',
    ]

    for (const name of collectionsToDrop) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) {
          app.delete(col)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Migration is irreversible, schemas not recreated
  },
)
