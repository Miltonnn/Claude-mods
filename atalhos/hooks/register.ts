import type { EngineInterface, Register } from 'claude-code'

const CORES_ANSI = /\x1b\[[0-9;]*m/g
const LIMITE_SECTIONS = 80

async function pastaVtex($: EngineInterface): Promise<string | null> {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))

  return home ? `${home.replace(/\\/g, '/')}/.vtex/session` : null
}

async function lerCampoJson($: EngineInterface, caminho: string, campo: string): Promise<string | null> {
  try {
    const valor = (JSON.parse(await $.fs.read(caminho)) as Record<string, unknown>)[campo]

    return typeof valor === 'string' && valor !== '' ? valor : null
  } catch {
    return null
  }
}

async function vtexWhoami($: EngineInterface): Promise<string> {
  const pasta = await pastaVtex($)

  if (!pasta) return 'Não encontrei a pasta do usuário para ler a sessão da VTEX.'

  const [conta, login, workspace] = await Promise.all([
    lerCampoJson($, `${pasta}/session.json`, 'account'),
    lerCampoJson($, `${pasta}/session.json`, 'login'),
    lerCampoJson($, `${pasta}/workspace.json`, 'currentWorkspace'),
  ])

  if (!conta) return 'Nenhuma sessão VTEX encontrada. Rode vtex login <conta>.'

  const alerta = workspace === 'master' ? '\n⚠ Você está no master (produção).' : ''

  return `Conta: ${conta}\nLogin: ${login ?? '—'}\nWorkspace: ${workspace ?? '—'}${alerta}`
}

async function vtexLs($: EngineInterface): Promise<string> {
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const argv = isWindows ? ['cmd', '/c', 'vtex', 'ls'] : ['vtex', 'ls']

  try {
    const { exitCode, stdout, stderr } = await $.process.run(argv, { timeoutMs: 60000 })
    const saida = (stdout || stderr).replace(CORES_ANSI, '').trim()

    return exitCode === 0 ? saida : `vtex ls falhou (código ${exitCode}):\n${saida}`
  } catch {
    return 'Não consegui rodar o vtex ls. Confira se o VTEX CLI está instalado e no PATH.'
  }
}

function normalizarUrl(bruta: string): string {
  const comProtocolo = /^https?:\/\//.test(bruta) ? bruta : `https://${bruta}`

  return comProtocolo.replace(/\/+$/, '')
}

async function decoMeta($: EngineInterface, args: string): Promise<string> {
  const [urlBruta, ...resto] = args.trim().split(/\s+/)

  if (!urlBruta) return 'Uso: /deco-meta <url do site> [termo para filtrar]'

  const base = normalizarUrl(urlBruta)
  const termo = resto.join(' ').toLowerCase()

  try {
    const { ok, status, text } = await $.http.fetch(`${base}/live/_meta`)

    if (!ok) return `${base}/live/_meta respondeu ${status}.`

    const encontradas = new Set<string>()
    for (const match of text.matchAll(/"([^"]*\/sections\/[^"]+\.tsx)"/g)) {
      encontradas.add(match[1])
    }

    const lista = [...encontradas].filter(nome => !termo || nome.toLowerCase().includes(termo)).sort()

    if (lista.length === 0) {
      return termo ? `Nenhuma section com "${termo}" em ${base}.` : `Nenhuma section encontrada em ${base}.`
    }

    const cortadas = lista.length > LIMITE_SECTIONS ? `\n… e mais ${lista.length - LIMITE_SECTIONS}` : ''

    return `${lista.length} section(s) em ${base}:\n${lista.slice(0, LIMITE_SECTIONS).join('\n')}${cortadas}`
  } catch {
    return `Não consegui acessar ${base}/live/_meta.`
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'vtex-whoami',
      description: 'Mostra conta, login e workspace VTEX na hora (sem rodar a CLI)',
    })
    await $.command.register({
      name: 'vtex-ls',
      description: 'Roda vtex ls e mostra os apps instalados e linkados',
    })
    await $.command.register({
      name: 'deco-meta',
      description: 'Lista as sections que um deploy Deco tem (via /live/_meta)',
      argumentHint: '<url> [termo]',
    })

    return next(e)
  })

  on('command.run', { command: 'vtex-whoami' }, async $ => ({ text: await vtexWhoami($) }))
  on('command.run', { command: 'vtex-ls' }, async $ => ({ text: await vtexLs($) }))
  on('command.run', { command: 'deco-meta' }, async ($, e) => ({ text: await decoMeta($, e.args) }))
}
