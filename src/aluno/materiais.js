/**
 * Materiais da área comum. Para incluir um novo PDF:
 *  1. coloque o arquivo em public/materiais/
 *  2. (opcional) capa em public/materiais/capas/<id>.webp
 *  3. acrescente um item aqui. `sumario` é [título, página].
 * A busca usa public/materiais/indice.json (texto de cada página), gerado a
 * partir do PDF; documentos escaneados ficam fora dela (`pesquisavel: false`).
 */
export const MATERIAIS = [
  {
    id: 'apostila-teorica',
    titulo: 'Apostila teórica',
    prova: 'Prova teórica',
    codigo: 'Questões + gabarito',
    resumo: 'Apostila de questões atualizada para a prova teórica, organizada por capítulo, com o gabarito no final.',
    arquivo: 'materiais/apostila-teorica.pdf',
    capa: 'materiais/capas/apostila-teorica.webp',
    paginas: 168,
    tamanho: '5,4 MB',
    pesquisavel: true,
    atalho: { rotulo: 'Ir para o gabarito', pagina: 165 },
    sumario: [
      ['Índice', 1],
      ['Introdução', 2],
      ['Terminologia', 5],
      ['Simbologia', 19],
      ['Processos', 61],
      ['Consumíveis', 83],
      ['Metalurgia', 95],
      ['Controle de deformações', 104],
      ['Metais de base', 117],
      ['Ensaios mecânicos', 120],
      ['Ensaios não destrutivos', 124],
      ['Qualificações', 131],
      ['Instrumental e técnicas de medidas', 139],
      ['Documentos técnicos', 153],
      ['Proteção', 161],
      ['Gabarito', 165],
    ],
  },
  {
    id: 'procedimento-recertificacao',
    titulo: 'Procedimento de recertificação',
    prova: 'Recertificação',
    codigo: 'IB-024 · FBTS',
    resumo: 'Exame de recertificação Nível 1: instruções aos candidatos, etapas da prova, critério de aprovação e anexos.',
    arquivo: 'materiais/procedimento-recertificacao.pdf',
    capa: 'materiais/capas/procedimento-recertificacao.webp',
    paginas: 39,
    tamanho: '7,5 MB',
    pesquisavel: false,
    atalho: { rotulo: 'Ir para o critério de aprovação', pagina: 8 },
    sumario: [
      ['Revisões', 1],
      ['Objetivo, documentos e definições', 2],
      ['Metodologia e condições gerais', 3],
      ['Sequência das atividades', 6],
      ['Critério de aprovação', 8],
      ['Anexo 1 · Lista de verificação', 9],
      ['Anexo 2 · Relatório de não conformidade', 10],
      ['Anexo 3 · Fabricação e montagem', 11],
      ['Anexo 4 · Execução de soldagem', 18],
      ['Formulário de acompanhamento de soldagem', 21],
      ['Posições de soldagem', 22],
      ['Anexo 5 · Ensaio visual de solda', 24],
      ['Critérios de aceitação (API, ASME, AWS)', 27],
      ['Avaliação de descontinuidades', 38],
      ['Segurança, saúde e meio ambiente', 39],
    ],
  },
  {
    id: 'procedimentos-provas-praticas',
    titulo: 'Procedimentos de provas práticas',
    prova: 'Prova prática',
    codigo: 'Consumíveis e estufas',
    resumo: 'Inspeção de recebimento, armazenagem, secagem e manutenção da secagem de consumíveis nos exames de qualificação.',
    arquivo: 'materiais/procedimentos-provas-praticas.pdf',
    capa: 'materiais/capas/procedimentos-provas-praticas.webp',
    paginas: 5,
    tamanho: '0,6 MB',
    pesquisavel: true,
    sumario: [
      ['1 Objetivo', 1],
      ['2 Documentos complementares', 1],
      ['3 Definições e abreviações', 1],
      ['4 Metodologia', 1],
      ['4.1 Inspeção de recebimento', 1],
      ['4.2 Armazenamento', 2],
      ['4.3 Estufa de armazenamento', 3],
      ['4.4 Secagem e manutenção da secagem', 3],
      ['4.5 Estufas de secagem e manutenção', 4],
    ],
  },
]

// Vídeos da área comum. Formato: { id, titulo, descricao, youtube: 'ID' } ou { arquivo: 'videos/x.mp4' }
export const VIDEOS = []

export const KIWIFY_LOGIN = 'https://dashboard.kiwify.com.br/login'
