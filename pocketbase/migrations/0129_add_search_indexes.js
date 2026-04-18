migrate(
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    clients.addIndex('idx_clients_name_search', false, 'name', '')
    clients.addIndex('idx_clients_fullName_search', false, 'fullName', '')
    clients.addIndex('idx_clients_email_search', false, 'email', '')
    clients.addIndex('idx_clients_cpf_search', false, 'cpf', '')
    app.save(clients)

    const legalCases = app.findCollectionByNameOrId('legal_cases')
    legalCases.addIndex('idx_legal_cases_parties_search', false, 'parties', '')
    legalCases.addIndex('idx_legal_cases_court_search', false, 'court', '')
    legalCases.addIndex('idx_legal_cases_description_search', false, 'description', '')
    app.save(legalCases)

    const tasks = app.findCollectionByNameOrId('tasks')
    tasks.addIndex('idx_tasks_title_search', false, 'title', '')
    tasks.addIndex('idx_tasks_description_search', false, 'description', '')
    app.save(tasks)

    const agenda = app.findCollectionByNameOrId('agenda_events')
    agenda.addIndex('idx_agenda_events_title_search', false, 'title', '')
    agenda.addIndex('idx_agenda_events_description_search', false, 'description', '')
    app.save(agenda)

    const collaborators = app.findCollectionByNameOrId('collaborators')
    collaborators.addIndex('idx_collaborators_name_search', false, 'name', '')
    collaborators.addIndex('idx_collaborators_email_search', false, 'email', '')
    app.save(collaborators)
  },
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    clients.removeIndex('idx_clients_name_search')
    clients.removeIndex('idx_clients_fullName_search')
    clients.removeIndex('idx_clients_email_search')
    clients.removeIndex('idx_clients_cpf_search')
    app.save(clients)

    const legalCases = app.findCollectionByNameOrId('legal_cases')
    legalCases.removeIndex('idx_legal_cases_parties_search')
    legalCases.removeIndex('idx_legal_cases_court_search')
    legalCases.removeIndex('idx_legal_cases_description_search')
    app.save(legalCases)

    const tasks = app.findCollectionByNameOrId('tasks')
    tasks.removeIndex('idx_tasks_title_search')
    tasks.removeIndex('idx_tasks_description_search')
    app.save(tasks)

    const agenda = app.findCollectionByNameOrId('agenda_events')
    agenda.removeIndex('idx_agenda_events_title_search')
    agenda.removeIndex('idx_agenda_events_description_search')
    app.save(agenda)

    const collaborators = app.findCollectionByNameOrId('collaborators')
    collaborators.removeIndex('idx_collaborators_name_search')
    collaborators.removeIndex('idx_collaborators_email_search')
    app.save(collaborators)
  },
)
