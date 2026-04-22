migrate(
  (app) => {
    app.db().newQuery("DELETE FROM case_movements WHERE source = 'DataJud'").execute()
  },
  (app) => {},
)
