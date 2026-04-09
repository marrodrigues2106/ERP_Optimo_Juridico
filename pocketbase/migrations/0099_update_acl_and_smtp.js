migrate(
  (app) => {
    // 1. Update ACL for legal_cases to explicitly allow admin users full visibility
    try {
      const cases = app.findCollectionByNameOrId('legal_cases')
      cases.listRule =
        "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || responsible_collaborator.user = @request.auth.id || responsible_collaborator = '')"
      cases.viewRule = cases.listRule
      app.save(cases)
    } catch (e) {
      console.log('Error updating legal_cases ACL:', e)
    }

    // 2. Update ACL for agenda_events to explicitly allow admin users full visibility
    try {
      const events = app.findCollectionByNameOrId('agenda_events')
      events.listRule =
        "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || collaborator.user = @request.auth.id || participants.user ?= @request.auth.id || collaborator = '')"
      events.viewRule = events.listRule
      app.save(events)
    } catch (e) {
      console.log('Error updating agenda_events ACL:', e)
    }

    // 3. Update ACL for tasks to explicitly allow admin users full visibility
    try {
      const tasks = app.findCollectionByNameOrId('tasks')
      tasks.listRule =
        "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || collaborator.user = @request.auth.id || collaborator = '')"
      tasks.viewRule = tasks.listRule
      app.save(tasks)
    } catch (e) {
      console.log('Error updating tasks ACL:', e)
    }

    // 4. Update SMTP configuration to use Hostinger settings for password recovery
    try {
      app
        .db()
        .newQuery(`
      UPDATE _params
      SET value = json_patch(value, '{"meta":{"senderName":"Moraes Rodrigues Advocacia","senderAddress":"contato@moraesrodriguesadvocacia.com.br"},"smtp":{"enabled":true,"host":"smtp.hostinger.com.br","port":465,"username":"contato@moraesrodriguesadvocacia.com.br"}}')
      WHERE id = 'settings'
    `)
        .execute()
    } catch (e) {
      console.log('Error updating SMTP configuration:', e)
    }
  },
  (app) => {
    // Revert logic is not strictly needed for this controlled environment deployment
  },
)
