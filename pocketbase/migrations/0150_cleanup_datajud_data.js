migrate(
  (app) => {
    // Delete all case movements where source is 'DataJud'
    app.db().newQuery("DELETE FROM case_movements WHERE source = 'DataJud'").execute()

    // Reset DataJud metadata in legal_cases
    app
      .db()
      .newQuery(
        "UPDATE legal_cases SET metadata = '', datajud_last_sync = '', datajud_sync_status = '', court_organ = ''",
      )
      .execute()
  },
  (app) => {
    // This migration is irreversible as it deletes data
  },
)
