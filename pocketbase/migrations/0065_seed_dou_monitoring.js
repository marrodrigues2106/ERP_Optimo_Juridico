migrate(
  (app) => {
    let admin
    try {
      admin = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
    } catch (_) {
      return // No admin found to link
    }

    const pubDouCol = app.findCollectionByNameOrId('publicacoes_dou')
    const termosCol = app.findCollectionByNameOrId('termos_monitorados')
    const ocorrenciasCol = app.findCollectionByNameOrId('ocorrencias_dou')

    try {
      app.findFirstRecordByData('termos_monitorados', 'termo', 'Moraes Rodrigues')
    } catch (_) {
      const term = new Record(termosCol)
      term.set('termo', 'Moraes Rodrigues')
      term.set('tipo_termo', 'palavra-chave')
      term.set('usuario_id', admin.id)
      term.set('ativo', true)
      term.set('data_cadastro', new Date().toISOString().replace('T', ' ').substring(0, 19))
      app.save(term)

      const pub = new Record(pubDouCol)
      pub.set('titulo', 'Decisão Normativa Nº 42/2026')
      pub.set('secao', 'Seção 1')
      pub.set('orgao', 'Tribunal de Justiça')
      pub.set(
        'texto_bruto',
        'Fica julgado procedente o pedido da parte Moraes Rodrigues acerca dos honorários referentes ao caso de planejamento patrimonial na região sul.',
      )
      pub.set(
        'texto_normalizado',
        'fica julgado procedente o pedido da parte moraes rodrigues acerca dos honorarios referentes ao caso de planejamento patrimonial na regiao sul.',
      )
      pub.set('url_origem', 'https://www.in.gov.br/web/dou/-/decisao-42')
      pub.set('hash_conteudo', $security.md5('Decisão Normativa Nº 42/2026'))
      pub.set('fonte_coleta', 'DOU-Seed')
      pub.set('data_publicacao', new Date().toISOString().replace('T', ' ').substring(0, 19))
      pub.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
      pub.set('status_processamento', 'indexado')
      app.save(pub)

      const occ = new Record(ocorrenciasCol)
      occ.set('publicacao_id', pub.id)
      occ.set('termo_id', term.id)
      occ.set('trecho_encontrado', '...pedido da parte Moraes Rodrigues acerca...')
      occ.set('contexto_completo', pub.get('texto_bruto'))
      occ.set('data_deteccao', new Date().toISOString().replace('T', ' ').substring(0, 19))
      occ.set('status_alerta', 'visualizado')
      occ.set('score_relevancia', 95)
      app.save(occ)
    }
  },
  (app) => {
    // Empty down migration
  },
)
