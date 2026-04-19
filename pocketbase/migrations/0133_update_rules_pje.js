migrate(
  (app) => {
    const cases = app.findCollectionByNameOrId('legal_cases')
    cases.listRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || responsible_collaborator.user = @request.auth.id)"
    cases.viewRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || responsible_collaborator.user = @request.auth.id)"
    app.save(cases)

    const movements = app.findCollectionByNameOrId('case_movements')
    movements.listRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || case.responsible_collaborator.user = @request.auth.id)"
    movements.viewRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || case.responsible_collaborator.user = @request.auth.id)"
    app.save(movements)

    const tasks = app.findCollectionByNameOrId('tasks')
    tasks.listRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || collaborator.user = @request.auth.id || collaborator = '')"
    tasks.viewRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || collaborator.user = @request.auth.id || collaborator = '')"
    app.save(tasks)

    const agenda = app.findCollectionByNameOrId('agenda_events')
    agenda.listRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || collaborator.user = @request.auth.id || participants.user ?= @request.auth.id || collaborator = '')"
    agenda.viewRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || collaborator.user = @request.auth.id || participants.user ?= @request.auth.id || collaborator = '')"
    app.save(agenda)
  },
  (app) => {
    // Revert not required
  },
)
