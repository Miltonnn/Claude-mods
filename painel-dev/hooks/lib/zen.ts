import type { StatusPasso, TarefaZen } from '../../types'

export const FERRAMENTA_ZEN = 'progresso_zen'
export const FERRAMENTA_ZEN_COMPLETA = 'mcp__painel-dev__progresso_zen' as const
export const PASSOS_VISIVEIS = 6
export const TEMPO_CONCLUIDO_MS = 8000

export const INSTRUCAO_ZEN = [
  'O modo Zen está ligado: o usuário vê só as suas mensagens de texto, não as chamadas de ferramenta nem as saídas delas.',
  `Ele acompanha o trabalho por uma faixa de progresso alimentada pela ferramenta ${FERRAMENTA_ZEN} (${FERRAMENTA_ZEN_COMPLETA}).`,
  'Antes de começar, chame essa ferramenta com o plano em passos curtos.',
  'Chame de novo com a lista inteira sempre que um passo começar ou terminar, mantendo exatamente um passo "fazendo" enquanto trabalha e todos "feito" ao terminar.',
  'Antes de agir, diga em uma frase o que vai fazer e por quê.',
].join(' ')

export const DESCRICAO_ZEN =
  'Atualiza a faixa de progresso do modo Zen que o usuário acompanha. Envie o plano inteiro a cada chamada: ' +
  'cada passo com o status (pendente, fazendo ou feito). Chame ao começar a tarefa e sempre que um passo começar ou terminar.'

export const ESQUEMA_ZEN = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Nome curto da tarefa inteira (opcional).' },
    passos: {
      type: 'array',
      description: 'O plano completo, em ordem.',
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'O passo, em poucas palavras.' },
          status: { type: 'string', enum: ['pendente', 'fazendo', 'feito'] },
        },
        required: ['texto', 'status'],
      },
    },
  },
  required: ['passos'],
}

const EQUIVALENTES: Record<string, StatusPasso> = {
  pendente: 'pendente',
  fazendo: 'fazendo',
  feito: 'feito',
  pending: 'pendente',
  in_progress: 'fazendo',
  completed: 'feito',
}

export function paraStatus(valor: unknown): StatusPasso {
  return typeof valor === 'string' ? (EQUIVALENTES[valor] ?? 'pendente') : 'pendente'
}

export function porcentagem(tarefa: TarefaZen): number {
  if (tarefa.fim !== null) return 100
  if (tarefa.passos.length === 0) return 0

  const feitos = tarefa.passos.filter(passo => passo.status === 'feito').length

  return Math.round((feitos / tarefa.passos.length) * 100)
}

export function rotuloDoPasso(tarefa: TarefaZen): string {
  if (tarefa.fim !== null) return 'Concluído'
  if (tarefa.passos.length === 0) return 'Planejando…'

  const atual = tarefa.passos.findIndex(passo => passo.status === 'fazendo')
  const feitos = tarefa.passos.filter(passo => passo.status === 'feito').length
  const numero = Math.min(tarefa.passos.length, (atual >= 0 ? atual : feitos) + 1)

  return `Passo ${numero} de ${tarefa.passos.length}`
}

export function passosVisiveis(tarefa: TarefaZen) {
  const atual = tarefa.passos.findIndex(passo => passo.status === 'fazendo')
  const primeiro = Math.max(0, Math.min(atual - 2, tarefa.passos.length - PASSOS_VISIVEIS))

  return tarefa.passos.slice(primeiro, primeiro + PASSOS_VISIVEIS)
}

export function formatarDecorrido(ms: number): string {
  const segundos = Math.max(0, Math.floor(ms / 1000))

  return segundos < 60 ? `${segundos}s` : `${Math.floor(segundos / 60)}m ${String(segundos % 60).padStart(2, '0')}s`
}
