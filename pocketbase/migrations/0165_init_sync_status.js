migrate(
  (app) => {
    app
      .db()
      .newQuery(
        "UPDATE legal_cases SET sync_status = 'pending' WHERE sync_status IS NULL OR sync_status = ''",
      )
      .execute()
  },
  (app) => {},
)
