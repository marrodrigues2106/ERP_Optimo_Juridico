import { Landmark, Briefcase, Building2, FileSignature, Coins } from 'lucide-react'

export const specialtiesData = [
  {
    id: 'direito-tributario',
    title: 'Direito Tributário',
    shortDesc: 'Estratégias avançadas para otimização e defesa fiscal.',
    icon: Landmark,
    description:
      'Atuamos com precisão na estruturação fiscal e defesa em litígios tributários, visando a preservação do seu patrimônio e a eficiência do seu negócio.',
    services: [
      'Consultoria e Planejamento Tributário Nacional e Internacional',
      'Contencioso Administrativo e Judicial Tributário',
      'Recuperação de Créditos Fiscais',
      'Due Diligence Tributária em Fusões e Aquisições',
    ],
    faqs: [
      {
        question: 'Como a consultoria tributária pode ajudar minha empresa?',
        answer:
          'Através da análise detalhada das operações, identificamos oportunidades legais para reduzir a carga tributária e melhorar o fluxo de caixa.',
      },
      {
        question: 'É possível recuperar impostos pagos indevidamente?',
        answer:
          'Sim, realizamos uma auditoria minuciosa e estruturamos as medidas legais cabíveis para identificar e recuperar valores recolhidos a maior nos últimos anos.',
      },
    ],
  },
  {
    id: 'planejamento-patrimonial',
    title: 'Planejamento Patrimonial e Sucessório',
    shortDesc: 'Proteção de ativos e sucessão familiar estruturada.',
    icon: Briefcase,
    description:
      'Desenvolvemos estruturas jurídicas sofisticadas e seguras para proteger o patrimônio familiar e garantir uma sucessão tranquila, eficiente e com menor impacto tributário.',
    services: [
      'Constituição de Holdings Familiares e Patrimoniais',
      'Elaboração de Testamentos e Planejamento Sucessório',
      'Acordos de Sócios e Protocolos de Governança Familiar',
      'Proteção e Blindagem Patrimonial Lícita',
    ],
    faqs: [
      {
        question: 'O que é uma Holding Familiar?',
        answer:
          'É uma empresa constituída especificamente para administrar o patrimônio de uma família, facilitando a sucessão, evitando inventários morosos e oferecendo diversos benefícios fiscais.',
      },
      {
        question: 'Quando devo começar a pensar em planejamento sucessório?',
        answer:
          'O quanto antes. O planejamento preventivo evita conflitos familiares, reduz custos exorbitantes no processo de inventário e assegura que suas vontades sejam respeitadas.',
      },
    ],
  },
  {
    id: 'direito-imobiliario',
    title: 'Direito Imobiliário',
    shortDesc: 'Segurança jurídica em transações e negócios imobiliários.',
    icon: Building2,
    description:
      'Assessoria completa em negócios imobiliários, garantindo total segurança desde a aquisição de bens até a estruturação de grandes empreendimentos imobiliários e fundos.',
    services: [
      'Due Diligence Imobiliária e Análise de Riscos',
      'Contratos de Compra, Venda, Locação e Built to Suit',
      'Regularização de Imóveis (Usucapião, Adjudicação)',
      'Estruturação de Empreendimentos e Incorporações',
    ],
    faqs: [
      {
        question: 'Por que realizar uma Due Diligence Imobiliária antes de comprar?',
        answer:
          'A due diligence analisa todas as certidões e histórico do imóvel e vendedores para identificar passivos trabalhistas, fiscais ou ambientais que podem anular o negócio no futuro.',
      },
      {
        question: 'Como posso regularizar um imóvel do qual não tenho a escritura?',
        answer:
          'Existem diversos caminhos legais, como a Ação de Usucapião ou a Adjudicação Compulsória, a depender das provas de posse e contratos existentes.',
      },
    ],
  },
  {
    id: 'contratos-responsabilidade',
    title: 'Contratos e Resp. Civil',
    shortDesc: 'Mitigação de riscos e defesa de interesses contratuais.',
    icon: FileSignature,
    description:
      'Elaboração, revisão e negociação de contratos complexos, além de atuação assertiva em litígios envolvendo responsabilidade civil corporativa e profissional.',
    services: [
      'Elaboração e Revisão de Contratos Complexos',
      'Resolução Estratégica de Conflitos Contratuais',
      'Ações de Indenização e Reparação de Danos',
      'Gestão Preventiva de Risco Contratual',
    ],
    faqs: [
      {
        question: 'Qual a real importância de um contrato bem redigido?',
        answer:
          'Um contrato sob medida previne litígios, estabelece regras claras para os cenários adversos e protege fortemente os interesses jurídicos e financeiros da sua empresa.',
      },
      {
        question: 'O que caracteriza a responsabilidade civil?',
        answer:
          'É o dever legal de reparar um dano causado a terceiros, seja de natureza material ou moral, originado por ação, omissão, negligência ou imperícia.',
      },
    ],
  },
  {
    id: 'direito-financeiro',
    title: 'Direito Financeiro',
    shortDesc: 'Assessoria jurídica em operações financeiras e bancárias.',
    icon: Coins,
    description:
      'Suporte altamente especializado em transações financeiras corporativas, regulação bancária, fintechs e operações no mercado de capitais.',
    services: [
      'Estruturação de Operações de Crédito e Financiamento',
      'Reestruturação de Dívidas Corporativas',
      'Assessoria Regulatória (Bacen e CVM)',
      'Compliance Financeiro e Prevenção à Lavagem de Dinheiro',
    ],
    faqs: [
      {
        question: 'Como o escritório atua na renegociação de dívidas corporativas?',
        answer:
          'Realizamos análises contratuais aprofundadas para expurgar encargos abusivos e estruturamos negociações estratégicas diretas com os credores.',
      },
      {
        question: 'Quais os cuidados em operações de crédito estruturadas?',
        answer:
          'É essencial avaliar profundamente o pacote de garantias, os covenants financeiros estabelecidos e o impacto regulatório para mitigar o risco de default cruzado.',
      },
    ],
  },
]

export const teamMembers = [
  {
    id: '1',
    name: 'Dr. Arthur Moraes',
    role: 'Sócio Fundador | Tributário',
    image: 'https://img.usecurling.com/ppl/large?gender=male&seed=15',
    bio: 'Especialista em Direito Tributário com mais de 15 anos de experiência no contencioso estratégico de altíssima complexidade. É amplamente reconhecido no mercado por sua atuação na defesa de grandes corporações nacionais e multinacionais perante os Tribunais Superiores.',
    education:
      'Mestrado em Direito Econômico e Tributário (USP)\nLL.M. em Corporate Law (New York University)\nGraduação em Direito (Mackenzie)',
    expertise: ['Tributário', 'Contencioso Estratégico', 'Consultoria'],
  },
  {
    id: '2',
    name: 'Dra. Helena Rodrigues',
    role: 'Sócia | Planejamento Patrimonial',
    image: 'https://img.usecurling.com/ppl/large?gender=female&seed=22',
    bio: 'Advogada sênior com vasta experiência na estruturação de holdings e processos complexos de sucessão familiar. Dedica-se de forma diligente à preservação e continuidade do patrimônio de famílias empresárias em todo o país.',
    education:
      'Especialização em Direito Societário (FGV)\nPós-graduação em Direito de Família e Sucessões (PUC-SP)\nGraduação em Direito (USP)',
    expertise: ['Sucessório', 'Societário', 'Holdings Familiares'],
  },
  {
    id: '3',
    name: 'Dr. Carlos Mendes',
    role: 'Advogado Sênior | Imobiliário',
    image: 'https://img.usecurling.com/ppl/large?gender=male&seed=34',
    bio: 'Atua na vanguarda do Direito Imobiliário, focando na estruturação de fundos imobiliários e transações complexas de compra e venda corporativa. Especialista nato em mitigação de riscos através de Due Diligences profundas.',
    education: 'Pós-graduação em Direito Imobiliário (Insper)\nGraduação em Direito (PUC-Campinas)',
    expertise: ['Imobiliário', 'Due Diligence', 'Contratos Imobiliários'],
  },
  {
    id: '4',
    name: 'Dra. Sofia Alencar',
    role: 'Advogada Sênior | Contratos',
    image: 'https://img.usecurling.com/ppl/large?gender=female&seed=41',
    bio: 'Com foco apurado na elaboração, revisão e negociação de contratos empresariais e internacionais complexos. Lidera a frente de contencioso cível do escritório com grande assertividade em litígios envolvendo responsabilidade civil corporativa.',
    education: 'Mestrado em Direito Civil (PUC-SP)\nEspecialização em Contratos Empresariais (FGV)',
    expertise: ['Contratos Complexos', 'Responsabilidade Civil', 'Negociação'],
  },
]
