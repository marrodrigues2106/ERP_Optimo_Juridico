migrate(
  (app) => {
    const saveRecord = (colName, data) => {
      try {
        const col = app.findCollectionByNameOrId(colName)
        const record = new Record(col)
        for (const [k, v] of Object.entries(data)) {
          record.set(k, v)
        }
        app.save(record)
      } catch (err) {
        console.log('Error saving seed data:', err)
      }
    }

    saveRecord('posts', {
      title: 'A Importância do Planejamento Sucessório',
      category: 'Planejamento Patrimonial',
      content:
        'O planejamento sucessório é um conjunto de estratégias que visa organizar a transferência do patrimônio de uma pessoa para seus herdeiros de forma eficiente e segura.\n\nEvitando conflitos familiares e minimizando o impacto tributário, essa prática tem ganhado cada vez mais espaço entre famílias de diferentes tamanhos patrimoniais.',
      imageUrl: 'https://img.usecurling.com/p/800/400?q=law%20books&color=blue',
      published: true,
    })

    saveRecord('lawsuits', {
      number: '0012345-67.2023.8.19.0001',
      court: 'TJ-RJ',
      parties: 'João Silva x Empresa ABC',
      status: 'Aguardando Audiência',
      deadline: '2024-11-20 12:00:00.000Z',
    })

    saveRecord('finances', {
      description: 'Honorários - Cliente ABC',
      type: 'inflow',
      amount: 5000,
      date: '2024-10-10 12:00:00.000Z',
      status: 'Pago',
    })

    saveRecord('finances', {
      description: 'Aluguel Escritório',
      type: 'outflow',
      amount: 3500,
      date: '2024-10-05 12:00:00.000Z',
      status: 'Pago',
    })

    saveRecord('knowledge_items', {
      title: 'Manual de Procedimentos Fiscais',
      author: 'Equipe Tributária',
      category: 'Internal',
      type: 'PDF',
      link: 'https://example.com/manual.pdf',
    })

    saveRecord('clients', {
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '(21) 99999-9999',
      status: 'Ativo',
    })

    saveRecord('collaborators', {
      name: 'Dr. Marcelo Rodrigues',
      role: 'Advogado',
      email: 'marcelo@moraesrodriguesadvocacia.com.br',
      phone: '(21) 9999-9999',
    })
  },
  (app) => {},
)
