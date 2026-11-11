import type { EngineInterface, Register } from 'claude-code'

type Regra = { padrao: RegExp; motivo: string }

const BLOQUEADOS: Regra[] = [
  {
    padrao: /\bgit\s(?:[^|;&]*\s)?commit(?=$|[\s;&|])/,
    motivo: 'o commit é feito pelo Milton. Entregue o comando pronto para ele rodar.',
  },
  {
    padrao: /\bgit\s(?:[^|;&]*\s)?(?<!stash\s+)push(?=$|[\s;&|])/,
    motivo: 'o push é feito pelo Milton. Entregue o comando pronto para ele rodar.',
  },
  {
    padrao: /\bgit\s+add\s+(?:[^|;&]*\s)?(?:\.|-A|--all)(?=$|[\s;&|])/,
    motivo: 'use git add arquivo por arquivo, só com o que pertence à task.',
  },
  {
    padrao: /\bvtex\s+deploy\b[^|;&]*\s(?:-f|--force)(?=$|[\s;&|])/,
    motivo: 'o servidor recusa -f no período de teste de 7 minutos. Espere e rode sem -f.',
  },
]

const CONFIRMAR: Regra[] = [
  { padrao: /\bvtex\s+publish\b/, motivo: 'publica uma nova versão do app' },
  { padrao: /\bvtex\s+deploy\b/, motivo: 'promove a versão a estável' },
  { padrao: /\bvtex\s+install\b/, motivo: 'instala um app no workspace atual' },
  { padrao: /\bvtex\s+promote\b/, motivo: 'promove o workspace para produção' },
  { padrao: /\bvtex\s+use\s+master\b/, motivo: 'troca para o workspace de produção' },
]

async function avaliar($: EngineInterface, comando: string): Promise<{ deny: string } | null> {
  const bloqueio = BLOQUEADOS.find(regra => regra.padrao.test(comando))

  if (bloqueio) {
    return { deny: `guarda-comandos bloqueou: ${bloqueio.motivo}` }
  }

  const alerta = CONFIRMAR.find(regra => regra.padrao.test(comando))

  if (!alerta) return null

  try {
    const resposta = await $.ui.ask(
      `O Claude quer rodar "${comando.slice(0, 120)}" (${alerta.motivo}). Permitir?`,
      { header: 'Guarda', options: ['Permitir', 'Bloquear'] },
    )

    if (resposta === 'Permitir') return null
  } catch {
    return { deny: 'guarda-comandos: a confirmação foi fechada sem resposta, então o comando não rodou.' }
  }

  return { deny: 'guarda-comandos: o Milton não autorizou este comando. Pergunte antes de tentar de novo.' }
}

const falhaSegura = { deny: 'guarda-comandos: a verificação falhou, então o comando não rodou.' }

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => (await avaliar($, e.command)) ?? next(e)).catch(
    ($, e, next) => (next.called ? next(e) : falhaSegura),
  )

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => (await avaliar($, e.command)) ?? next(e)).catch(
    ($, e, next) => (next.called ? next(e) : falhaSegura),
  )
}
