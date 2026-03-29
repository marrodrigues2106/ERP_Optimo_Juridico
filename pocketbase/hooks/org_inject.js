// Injects the current user's active organization into records being created
onRecordCreateRequest(
  (e) => {
    const auth = e.auth
    if (auth) {
      const orgId = auth.get('active_organization')
      if (orgId && !e.record.get('organization')) {
        e.record.set('organization', orgId)
      }
    }
    e.next()
  },
  'clients',
  'collaborators',
  'legal_cases',
  'case_movements',
  'agenda_events',
  'tasks',
  'finances',
  'gazette_publications',
  'crm_interactions',
  'case_estimates',
)
