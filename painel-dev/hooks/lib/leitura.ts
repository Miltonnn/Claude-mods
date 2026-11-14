import type { LeituraGuiada } from '../../types'

export const FERRAMENTA_LEITURA = 'leitura_guiada'
export const FERRAMENTA_LEITURA_COMPLETA = 'mcp__painel-dev__leitura_guiada' as const

export const ETAPAS_LEITURA = [
  'Responsabilidade do arquivo',
  'Funções, variáveis, hooks e dependências',
  'De onde vêm e para onde vão os dados',
  'Fluxo de execução passo a passo',
  'Por que cada parte existe',
  'Conceitos para estudar',
] as const

export function instrucaoLeitura(alvo: string): string {
  return [
    `A leitura guiada está ligada para: ${alvo}.`,
    'Atue como um Tech Lead experiente que desenvolve a capacidade do usuário de ler e interpretar código: ele quer entender o código, não receber uma explicação pronta.',
    `Conduza a leitura nesta ordem de etapas: ${ETAPAS_LEITURA.map((etapa, indice) => `${indice + 1}) ${etapa}`).join('; ')}.`,
    'Na etapa 5, inclua a consequência de remover cada parte.',
    'Leia o código antes de perguntar. Não explique tudo de uma vez: trabalhe uma etapa por vez, faça uma ou duas perguntas curtas para testar o entendimento e pare, aguardando a resposta.',
    'Não entregue a resposta antes de o usuário tentar raciocinar. Se ele errar, explique o equívoco e por que acontece; se acertar, confirme e aprofunde só o necessário. Se ele pedir a resposta, dê uma dica antes e a resposta só se ele insistir.',
    `Sempre que mudar de etapa, fizer uma pergunta, corrigir um equívoco ou identificar um conceito para estudar, chame a ferramenta ${FERRAMENTA_LEITURA} (${FERRAMENTA_LEITURA_COMPLETA}) com o estado inteiro, que aparece na aba Explicação do painel.`,
  ].join(' ')
}

export const DESCRICAO_LEITURA =
  'Atualiza a aba Explicação do painel com o andamento da leitura guiada de código. Envie o estado inteiro a cada chamada: ' +
  'a etapa atual (1 a 6), a pergunta em aberto, a lista completa de equívocos corrigidos e a de conceitos para estudar.'

export const ESQUEMA_LEITURA = {
  type: 'object',
  properties: {
    etapa: {
      type: 'integer',
      minimum: 1,
      maximum: ETAPAS_LEITURA.length,
      description: `Etapa atual: ${ETAPAS_LEITURA.map((etapa, indice) => `${indice + 1} = ${etapa}`).join(', ')}.`,
    },
    pergunta: { type: 'string', description: 'A pergunta que aguarda resposta, curta. Vazia quando não houver.' },
    equivocos: {
      type: 'array',
      items: { type: 'string' },
      description: 'Todos os equívocos já corrigidos, cada um em uma linha curta com o entendimento certo.',
    },
    conceitos: {
      type: 'array',
      items: { type: 'string' },
      description: 'Todos os conceitos identificados para estudar, cada um em poucas palavras.',
    },
    concluida: { type: 'boolean', description: 'true quando as 6 etapas terminaram.' },
  },
  required: ['etapa'],
}

function paraTextos(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map(item => item.trim())
    : []
}

export function novaLeitura(alvo: string): LeituraGuiada {
  return { alvo, inicio: Date.now(), etapa: 1, pergunta: null, equivocos: [], conceitos: [], concluida: false }
}

export function aplicarEntrada(atual: LeituraGuiada, entrada: unknown): LeituraGuiada {
  const dados = (entrada ?? {}) as Record<string, unknown>
  const etapa =
    typeof dados.etapa === 'number'
      ? Math.min(ETAPAS_LEITURA.length, Math.max(1, Math.round(dados.etapa)))
      : atual.etapa

  return {
    ...atual,
    etapa,
    pergunta: typeof dados.pergunta === 'string' && dados.pergunta.trim() !== '' ? dados.pergunta.trim() : null,
    equivocos: 'equivocos' in dados ? paraTextos(dados.equivocos) : atual.equivocos,
    conceitos: 'conceitos' in dados ? paraTextos(dados.conceitos) : atual.conceitos,
    concluida: dados.concluida === true,
  }
}
