import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type {
  Aba,
  AppVtex,
  CacheInfo,
  DeployInfo,
  Esforco,
  Explicacao,
  Painel,
  Plataforma,
  Preferencias,
} from '../types'
import { alterarSettingsClaude, pastaHome, pintarWindowsTerminal } from './lib/configuracoes'
import type { ResultadoTerminal } from './lib/configuracoes'
import { NOME_TEMA, TEMAS, paraEsquemaWindowsTerminal, paraTemaClaude } from './lib/temas'
import type { Paleta } from './lib/temas'

const PANE = 'painel-dev'
const TITULO = 'Painel dev'
const COR_DESTAQUE = '#A78BFA'
const COR_TEXTO_ATIVO = '#16131F'
const ICONE_DEV = '\u{F0322}'
const SECOES_RESUMO = /\*\*(O que foi feito|Decisões|Pra aprender):\*\*/
const TTL_PADRAO_MIN = 60
const ESPERA_DEPLOY_MS = 7 * 60000
const INTERVALO_RELOGIO_MS = 15000
const LARGURA_ROTULO = 11
const LARGURA_BARRA = 16

const ABAS: readonly { id: Aba; nome: string }[] = [
  { id: 'painel', nome: 'Painel' },
  { id: 'explicacao', nome: 'Explicação' },
  { id: 'deploy', nome: 'Deploy' },
  { id: 'tema', nome: 'Tema' },
  { id: 'modo', nome: 'Modo' },
]

const TEMA_PERSONALIZADO = `custom:${NOME_TEMA}`

const TEMAS_NATIVOS: Record<string, string> = {
  dark: 'Escuro',
  light: 'Claro',
  'dark-daltonized': 'Escuro daltônico',
  'light-daltonized': 'Claro daltônico',
  'dark-ansi': 'Escuro ANSI',
  'light-ansi': 'Claro ANSI',
}

const MODELOS: readonly { alias: string; nome: string }[] = [
  { alias: 'opus', nome: 'Opus' },
  { alias: 'sonnet', nome: 'Sonnet' },
  { alias: 'haiku', nome: 'Haiku' },
  { alias: 'fable', nome: 'Fable' },
]

const ESFORCOS: readonly { id: Esforco; nome: string }[] = [
  { id: 'low', nome: 'Baixo' },
  { id: 'medium', nome: 'Médio' },
  { id: 'high', nome: 'Alto' },
  { id: 'xhigh', nome: 'Muito alto' },
  { id: 'max', nome: 'Máximo' },
]

const MODOS: readonly { id: string; nome: string; descricao: string }[] = [
  { id: 'default', nome: 'Perguntar', descricao: 'pede permissão antes de cada ação' },
  { id: 'plan', nome: 'Planejar', descricao: 'só lê o código e propõe um plano' },
  { id: 'acceptEdits', nome: 'Aceitar edições', descricao: 'edita arquivos sem perguntar' },
  { id: 'auto', nome: 'Automático', descricao: 'um verificador decide o que é seguro' },
]

const DEPLOY_OUTRAS_PLATAFORMAS: Record<Plataforma, string[]> = {
  'VTEX IO': [],
  FastStore: [
    'O deploy é feito pela integração da loja com o GitHub.',
    'Cada PR gera um preview; a produção atualiza no merge da branch principal.',
  ],
  Deco: [
    'A PR gera um preview pelo bot deco-hosting, com o código e os blocos da branch.',
    'A produção atualiza no merge da main.',
    'Use /deco-meta <url> para conferir as sections de um deploy.',
  ],
  Wake: ['Ainda não há um roteiro de deploy guiado para a Wake neste painel.'],
}

const DOC_PUBLICAR = 'developers.vtex.com/docs/guides/vtex-io-documentation-10-making-your-app-publicly-available'

const painel = atom({ plugin: 'painel-dev', key: 'painel' } as const, null, {
  shape: 'painel-7',
})
const cache = atom(
  { plugin: 'painel-dev', key: 'cache' } as const,
  { ultimaRespostaEm: null, aproveitamento: null, ttlMin: TTL_PADRAO_MIN } as CacheInfo,
  { shape: 'cache-1' },
)
const agora = atom({ plugin: 'painel-dev', key: 'agora' } as const, 0)
const explicacao = atom({ plugin: 'painel-dev', key: 'explicacao' } as const, null, {
  shape: 'explicacao-1',
})
const arquivosTurno = atom({ plugin: 'painel-dev', key: 'arquivosTurno' } as const, [] as string[])
const aba = atom({ plugin: 'painel-dev', key: 'aba' } as const, 'painel' as Aba)
const deploy = atom(
  { plugin: 'painel-dev', key: 'deploy' } as const,
  { app: null, publicadoEm: {} } as DeployInfo,
  { shape: 'deploy-1' },
)
const preferencias = atom(
  { plugin: 'painel-dev', key: 'preferencias' } as const,
  { tema: null, temasNativos: [], modelo: null, esforco: null, modoPadrao: null, aviso: null } as Preferencias,
  { shape: 'preferencias-1' },
)

let esforcoEscolhido: Esforco | null = null

async function tentar<T>(acao: () => Promise<T>, padrao: T): Promise<T> {
  try {
    return await acao()
  } catch {
    return padrao
  }
}

function ehEsforco(valor: unknown): valor is Esforco {
  return ESFORCOS.some(item => item.id === valor)
}

function familiaDoModelo(id: string | null): string | null {
  return id?.match(/^claude-([a-z]+)-/i)?.[1]?.toLowerCase() ?? null
}

function nomeDoModelo(id: string | null): string {
  const partes = id?.match(/^claude-([a-z]+)-(\d+)-(\d+)/i)

  if (!partes) return id ?? '—'

  const familia = partes[1] ?? ''

  return `${familia.charAt(0).toUpperCase()}${familia.slice(1)} ${partes[2]}.${partes[3]}`
}

function nomeDoTemaNativo(valor: string): string {
  return TEMAS_NATIVOS[valor] ?? valor.replace(/^custom:/, '')
}

function montarAviso(precisaReiniciar: boolean, terminal: ResultadoTerminal): string | null {
  const avisos: string[] = []

  if (precisaReiniciar) avisos.push('Reinicie o Claude Code uma vez para ativar; depois disso o tema troca na hora.')
  if (terminal === 'fora-do-windows-terminal') avisos.push('O fundo só acompanha o tema dentro do Windows Terminal.')

  return avisos.length > 0 ? avisos.join(' ') : null
}

async function avisar($: EngineInterface, aviso: string | null): Promise<void> {
  await update($, preferencias, atual => ({ ...atual, aviso }))
}

function acao($: EngineInterface, trabalho: () => Promise<unknown>): () => void {
  return () => {
    void trabalho().catch((erro: unknown) => avisar($, `Não deu certo: ${erro instanceof Error ? erro.message : String(erro)}`))
  }
}

async function carregarPreferencias($: EngineInterface): Promise<void> {
  const [linhas, modelo, settingsUsuario, temaSalvo, esforcoSalvo] = await Promise.all([
    tentar(() => $.config.list(), []),
    tentar<string | null>(() => $.session.model(), null),
    tentar<unknown>(() => $.settings.read({ source: 'user' }), {}),
    $.store.get('tema'),
    $.store.get('esforco'),
  ])

  const linhaTema = linhas.find(linha => linha.key === 'theme')
  const temasNativos = (linhaTema?.options ?? Object.keys(TEMAS_NATIVOS)).filter(opcao => !opcao.startsWith('custom:'))
  const salvo = temaSalvo as { valor?: unknown; nome?: unknown } | undefined
  const tema =
    typeof salvo?.valor === 'string' && typeof salvo.nome === 'string'
      ? { valor: salvo.valor, nome: salvo.nome }
      : linhaTema
        ? { valor: String(linhaTema.value), nome: nomeDoTemaNativo(String(linhaTema.value)) }
        : null
  const permissoes = (settingsUsuario as { permissions?: { defaultMode?: unknown } }).permissions
  const modoPadrao = typeof permissoes?.defaultMode === 'string' ? permissoes.defaultMode : 'default'

  esforcoEscolhido = ehEsforco(esforcoSalvo) ? esforcoSalvo : null

  await update($, preferencias, atual => ({
    ...atual,
    tema,
    temasNativos,
    modelo,
    esforco: esforcoEscolhido,
    modoPadrao,
  }))
}

async function selecionarTemaClaude($: EngineInterface, valor: string): Promise<boolean> {
  const linha = (await tentar(() => $.config.list(), [])).find(item => item.key === 'theme')
  const valorAtual = linha ? String(linha.value) : null

  if (valorAtual === valor) return false

  const isTemaDeMod = valorAtual === TEMA_PERSONALIZADO || valorAtual === 'custom:extra-mods'

  if (valorAtual && !isTemaDeMod && (await $.store.get('temaAntes')) === undefined) {
    await $.store.set('temaAntes', valorAtual)
  }

  if (linha && (!valor.startsWith('custom:') || linha.options?.includes(valor))) {
    const resultado = await $.config.set({ key: 'theme', value: valor })

    if (resultado.deny === undefined) return false
  }

  await alterarSettingsClaude($, settings => {
    settings.theme = valor
  })

  return true
}

async function escolherPaleta($: EngineInterface, paleta: Paleta): Promise<void> {
  await $.fs.write(
    `${await pastaHome($)}/.claude/themes/${NOME_TEMA}.json`,
    `${JSON.stringify(paraTemaClaude(paleta), null, 2)}\n`,
  )

  const precisaReiniciar = await selecionarTemaClaude($, TEMA_PERSONALIZADO)
  const terminal = await pintarWindowsTerminal($, paraEsquemaWindowsTerminal(paleta))
  const tema = { valor: TEMA_PERSONALIZADO, nome: paleta.nome }

  await $.store.set('tema', tema)
  await update($, preferencias, atual => ({ ...atual, tema, aviso: montarAviso(precisaReiniciar, terminal) }))
}

async function escolherTemaNativo($: EngineInterface, valor: string): Promise<void> {
  const precisaReiniciar = await selecionarTemaClaude($, valor)
  const terminal = await pintarWindowsTerminal($, null)
  const tema = { valor, nome: nomeDoTemaNativo(valor) }

  await $.store.set('tema', tema)
  await update($, preferencias, atual => ({
    ...atual,
    tema,
    aviso: montarAviso(precisaReiniciar, terminal === 'fora-do-windows-terminal' ? 'restaurado' : terminal),
  }))
}

async function voltarTemaOriginal($: EngineInterface): Promise<void> {
  const anterior = ((await $.store.get('temaAntes')) as string | undefined) ?? 'dark'
  const precisaReiniciar = await selecionarTemaClaude($, anterior)

  await pintarWindowsTerminal($, null)
  await $.store.delete('tema')
  await $.store.delete('temaAntes')
  await update($, preferencias, atual => ({
    ...atual,
    tema: { valor: anterior, nome: nomeDoTemaNativo(anterior) },
    aviso: precisaReiniciar
      ? 'Tema original de volta. Reinicie o Claude Code para ele valer.'
      : 'Tema original e fundo do terminal de volta.',
  }))
}

async function escolherModelo($: EngineInterface, alias: string): Promise<void> {
  const antes = await tentar<string | null>(() => $.session.model(), null)

  await $.command.run({ command: 'model', args: alias })

  const depois = await tentar<string | null>(() => $.session.model(), null)
  const isIgual = depois === antes && familiaDoModelo(depois) !== alias

  await update($, preferencias, atual => ({
    ...atual,
    modelo: depois,
    aviso: isIgual ? `O modelo continuou ${nomeDoModelo(depois)}: ${alias} pode não estar disponível na sua conta.` : null,
  }))
}

async function escolherEsforco($: EngineInterface, nivel: Esforco | null): Promise<void> {
  esforcoEscolhido = nivel

  if (nivel === null) {
    await $.store.delete('esforco')
  } else {
    await $.store.set('esforco', nivel)

    const linha = (await tentar(() => $.config.list(), [])).find(
      item => /effort/i.test(item.key) && item.options?.includes(nivel),
    )

    if (linha) await $.config.set({ key: linha.key, value: nivel }).catch(() => undefined)
  }

  await update($, preferencias, atual => ({ ...atual, esforco: nivel, aviso: null }))
}

async function escolherModoPadrao($: EngineInterface, modo: string): Promise<void> {
  await alterarSettingsClaude($, settings => {
    const permissoes =
      typeof settings.permissions === 'object' && settings.permissions !== null
        ? (settings.permissions as Record<string, unknown>)
        : {}

    settings.permissions = { ...permissoes, defaultMode: modo }
  })

  await update($, preferencias, atual => ({
    ...atual,
    modoPadrao: modo,
    aviso: 'Vale para as próximas sessões. Nesta, use Shift+Tab.',
  }))
}

function limparMarkdown(texto: string): string {
  return texto
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

function extrairResumo(resposta: string): Pick<Explicacao, 'feito' | 'decisoes' | 'aprender'> | null {
  const partes = resposta.split(SECOES_RESUMO)

  if (partes.length < 3) return null

  const resumo: Pick<Explicacao, 'feito' | 'decisoes' | 'aprender'> = { feito: [], decisoes: [], aprender: [] }

  for (let i = 1; i < partes.length; i += 2) {
    const itens = (partes[i + 1] ?? '')
      .split(/\r?\n/)
      .map(linha => linha.trim())
      .filter(linha => /^[-*] /.test(linha))
      .map(linha => limparMarkdown(linha.slice(2)))

    if (partes[i] === 'O que foi feito') resumo.feito = itens
    if (partes[i] === 'Decisões') resumo.decisoes = itens
    if (partes[i] === 'Pra aprender') resumo.aprender = itens
  }

  return resumo
}

function encurtarCaminho(caminho: string): string {
  return caminho.replace(/\\/g, '/').split('/').filter(Boolean).slice(-3).join('/')
}

function formatarHa(ms: number): string {
  const min = Math.floor(ms / 60000)

  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`

  const horas = Math.floor(min / 60)

  if (horas < 24) return `há ${horas} h`

  const dias = Math.floor(horas / 24)

  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}


function formatarMinutos(ms: number): string {
  const min = Math.ceil(ms / 60000)

  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`
}

function barra(fracao: number): { cheios: string; vazios: string } {
  const cheios = Math.round(Math.max(0, Math.min(1, fracao)) * LARGURA_BARRA)

  return { cheios: '█'.repeat(cheios), vazios: '░'.repeat(LARGURA_BARRA - cheios) }
}

function descreverApp(app: AppVtex): { tipo: string; dica: string } {
  const tem = (builder: string) => app.builders.includes(builder)

  if (tem('checkout-ui-custom')) {
    return {
      tipo: 'CSS/JS do checkout legado',
      dica: 'O HTML do CMS do checkout é global: só cole HTML novo no CMS depois que este app estiver instalado no master.',
    }
  }

  if (tem('pixel')) {
    return {
      tipo: 'Pixel',
      dica: 'O pixel roda em todas as páginas: depois do install, confira o console do navegador em produção.',
    }
  }

  if (tem('react')) {
    return {
      tipo: 'Componentes React',
      dica: 'Se o tema usa este app, publique e instale este primeiro e confira se o tema aceita a versão nova.',
    }
  }

  if (tem('store') || tem('styles')) {
    return {
      tipo: 'Tema (blocos, estilos e assets)',
      dica: 'Os apps custom que o tema usa precisam estar instalados antes dele.',
    }
  }

  if (tem('node') || tem('graphql')) {
    return {
      tipo: 'Backend',
      dica: 'Depois do install, teste as rotas e queries que o app expõe.',
    }
  }

  return { tipo: app.builders.join(', ') || 'Sem builders', dica: 'Confira no README do app se há algum passo extra.' }
}

function aceitaVersao(faixa: string, versao: string): boolean | null {
  const major = faixa.match(/^(\d+)\.x$/)?.[1]

  return major === undefined ? null : versao.split('.')[0] === major
}

async function registrarArquivo($: EngineInterface, caminho: string): Promise<void> {
  await update($, arquivosTurno, lista => (lista.includes(caminho) ? lista : [...lista, caminho]))
}

async function rodarGit($: EngineInterface, args: string[]): Promise<string | null> {
  try {
    const { exitCode, stdout } = await $.process.run(['git', ...args], { timeoutMs: 5000 })

    return exitCode === 0 ? stdout.replace(/\s+$/, '') : null
  } catch {
    return null
  }
}

async function lerTexto($: EngineInterface, caminho: string): Promise<string | null> {
  try {
    return await $.fs.read(caminho)
  } catch {
    return null
  }
}

async function lerCampoJson($: EngineInterface, caminho: string, campo: string): Promise<string | null> {
  const texto = await lerTexto($, caminho)

  if (texto === null) return null

  try {
    const valor = (JSON.parse(texto) as Record<string, unknown>)[campo]

    return typeof valor === 'string' && valor !== '' ? valor : null
  } catch {
    return null
  }
}

function lerVariavelEnv(texto: string | null, nome: string): string | null {
  const linha = texto?.split(/\r?\n/).find(l => l.trim().startsWith(`${nome}=`))

  if (!linha) return null

  const valor = linha.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')

  return valor || null
}

async function appVtex($: EngineInterface, raiz: string, pasta: string): Promise<AppVtex | null> {
  const caminho = pasta === '.' ? raiz : `${raiz}/${pasta}`
  const texto = await lerTexto($, `${caminho}/manifest.json`)

  if (texto === null) return null

  try {
    const manifest = JSON.parse(texto) as {
      vendor?: unknown
      name?: unknown
      version?: unknown
      builders?: unknown
      dependencies?: unknown
    }

    if (
      !manifest.builders ||
      typeof manifest.vendor !== 'string' ||
      typeof manifest.name !== 'string' ||
      typeof manifest.version !== 'string'
    ) {
      return null
    }

    const dependencias: Record<string, string> = {}

    if (manifest.dependencies && typeof manifest.dependencies === 'object') {
      for (const [chave, faixa] of Object.entries(manifest.dependencies)) {
        if (typeof faixa === 'string') dependencias[chave] = faixa
      }
    }

    const builders = typeof manifest.builders === 'object' ? Object.keys(manifest.builders) : []

    return { pasta, vendor: manifest.vendor, nome: manifest.name, versao: manifest.version, builders, dependencias }
  } catch {
    return null
  }
}

async function appsVtex($: EngineInterface, raiz: string): Promise<AppVtex[]> {
  const naRaiz = await appVtex($, raiz, '.')

  if (naRaiz) return [naRaiz]

  try {
    const pastas = (await $.fs.list(raiz)).filter(
      item => item.kind === 'dir' && !item.name.startsWith('.') && item.name !== 'node_modules',
    )
    const apps = await Promise.all(pastas.map(item => appVtex($, raiz, item.name)))

    return apps.filter((app): app is AppVtex => app !== null)
  } catch {
    return []
  }
}

async function detectarPlataforma($: EngineInterface, raiz: string, temAppsVtex: boolean): Promise<Plataforma | null> {
  if (temAppsVtex) return 'VTEX IO'

  const pacote = await lerTexto($, `${raiz}/package.json`)
  if (pacote?.includes('@faststore/') || (await $.fs.exists(`${raiz}/discovery.config.js`))) return 'FastStore'

  if ((await $.fs.exists(`${raiz}/deno.json`)) || (await $.fs.exists(`${raiz}/.deco`))) return 'Deco'

  if (await $.fs.exists(`${raiz}/Configs/pages.json`)) return 'Wake'

  return null
}

async function coletar($: EngineInterface): Promise<Painel> {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  const pastaVtex = home ? `${home.replace(/\\/g, '/')}/.vtex/session` : null

  const [nome, topo, branch, status, ultimoCommit] = await Promise.all([
    rodarGit($, ['config', 'user.name']),
    rodarGit($, ['rev-parse', '--show-toplevel']),
    rodarGit($, ['rev-parse', '--abbrev-ref', 'HEAD']),
    rodarGit($, ['status', '--porcelain']),
    rodarGit($, ['diff', '--name-only', 'HEAD~1', 'HEAD']),
  ])

  const raiz = (topo || (await $.session.cwd())).replace(/\\/g, '/')
  const apps = await appsVtex($, raiz)
  const plataforma = await detectarPlataforma($, raiz, apps.length > 0)
  const vazio = { conta: null, workspace: null, storeId: null, decoSite: null, decoEnv: null }
  let extras: Pick<Painel, keyof typeof vazio> = vazio

  if (plataforma === 'VTEX IO' && pastaVtex) {
    const [conta, workspace] = await Promise.all([
      lerCampoJson($, `${pastaVtex}/session.json`, 'account'),
      lerCampoJson($, `${pastaVtex}/workspace.json`, 'currentWorkspace'),
    ])
    extras = { ...vazio, conta, workspace }
  }

  if (plataforma === 'FastStore') {
    const discovery = await lerTexto($, `${raiz}/discovery.config.js`)
    extras = { ...vazio, storeId: discovery?.match(/storeId:\s*['"`]([^'"`]+)/)?.[1] ?? null }
  }

  if (plataforma === 'Deco') {
    const env = await lerTexto($, `${raiz}/.env`)
    extras = {
      ...vazio,
      decoSite: lerVariavelEnv(env, 'DECO_SITE_NAME'),
      decoEnv: lerVariavelEnv(env, 'DECO_ENV_NAME'),
    }
  }

  return {
    nome: nome || null,
    projeto: raiz.split('/').filter(Boolean).pop() ?? null,
    plataforma,
    apps,
    branch: branch || null,
    tarefa: branch?.match(/\d{4,}/)?.[0] ?? null,
    modificados: status ? status.split('\n').filter(Boolean).map(linha => linha.slice(3).trim()) : [],
    alteradosUltimoCommit: ultimoCommit ? ultimoCommit.split('\n').filter(Boolean) : [],
    ...extras,
  }
}

async function atualizar($: EngineInterface): Promise<void> {
  const dados = await coletar($)
  await update($, painel, () => dados)
}

async function abrir($: EngineInterface, destino: Aba): Promise<void> {
  await update($, aba, () => destino)
  await $.ui.open({ id: PANE, title: TITULO })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'painel',
      description: 'Abre o Painel dev na tab Painel (projeto, git, plataforma e cache)',
    })
    await $.command.register({
      name: 'explicacao',
      description: 'Abre o Painel dev na tab Explicacao (resumo da ultima alteracao)',
    })
    await $.command.register({
      name: 'deploy',
      description: 'Abre o Painel dev na tab Deploy (roteiro de publish dos apps VTEX IO)',
    })
    await $.command.register({
      name: 'tema',
      description: 'Abre o Painel dev na tab Tema (cores do Claude Code e do Windows Terminal)',
    })
    await $.command.register({
      name: 'modo',
      description: 'Abre o Painel dev na tab Modo (modelo, esforco e modo de permissao)',
    })
    await $.command.register({
      name: 'cache-ttl',
      description: 'Define a duracao do cache do prompt no painel (5 ou 60 minutos)',
      argumentHint: '5 | 60',
    })

    const ttlSalvo = await $.store.get('ttlMin')
    if (ttlSalvo === 5 || ttlSalvo === 60) {
      await update($, cache, atual => ({ ...atual, ttlMin: ttlSalvo }))
    }

    await update($, agora, () => Date.now())
    $.clock.every(INTERVALO_RELOGIO_MS, () => {
      void update($, agora, () => Date.now())
    })

    void $.ui.open({ id: PANE, title: TITULO })
    void atualizar($)
    void carregarPreferencias($)

    return next(e)
  })

  on('command.run', { command: 'tema' }, async $ => {
    await carregarPreferencias($)
    await abrir($, 'tema')

    return { text: 'Painel dev aberto na tab Tema.' }
  })

  on('command.run', { command: 'modo' }, async $ => {
    await carregarPreferencias($)
    await abrir($, 'modo')

    return { text: 'Painel dev aberto na tab Modo.' }
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && (await read($, preferencias)).modelo !== e.model) {
      await update($, preferencias, atual => ({ ...atual, modelo: e.model }))
    }

    const resposta = yield* next(
      esforcoEscolhido !== null && e.effort !== undefined ? { ...e, effort: esforcoEscolhido } : e,
    )

    return resposta
  })

  on('command.run', { command: 'painel' }, async $ => {
    await atualizar($)
    await abrir($, 'painel')

    return { text: 'Painel dev aberto na tab Painel.' }
  })

  on('command.run', { command: 'explicacao' }, async $ => {
    await abrir($, 'explicacao')

    return { text: 'Painel dev aberto na tab Explicação.' }
  })

  on('command.run', { command: 'deploy' }, async $ => {
    await atualizar($)
    await abrir($, 'deploy')

    return { text: 'Painel dev aberto na tab Deploy.' }
  })

  on('command.run', { command: 'cache-ttl' }, async ($, e) => {
    const minutos = Number(e.args.trim())

    if (minutos !== 5 && minutos !== 60) {
      return { text: 'Use /cache-ttl 5 (chave de API) ou /cache-ttl 60 (assinatura Claude).' }
    }

    await $.store.set('ttlMin', minutos)
    await update($, cache, atual => ({ ...atual, ttlMin: minutos }))

    return { text: `Cache do prompt no painel agora conta ${minutos} minutos.` }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, arquivosTurno, () => [])

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const resultado = await next(e)
    if (resultado.deny === undefined && resultado.isError !== true) await registrarArquivo($, e.file_path)

    return resultado
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const resultado = await next(e)
    if (resultado.deny === undefined && resultado.isError !== true) await registrarArquivo($, e.file_path)

    return resultado
  })

  on('turn.complete', async ($, e, next) => {
    const resultado = await next(e)
    const uso = resultado.usage
    const total = uso ? uso.input_tokens + uso.cache_read_input_tokens + uso.cache_creation_input_tokens : 0
    const momento = Date.now()

    await update($, cache, atual => ({
      ...atual,
      ultimaRespostaEm: momento,
      aproveitamento: uso && total > 0 ? Math.round((uso.cache_read_input_tokens / total) * 100) : atual.aproveitamento,
    }))
    await update($, agora, () => momento)

    const arquivos = await read($, arquivosTurno)
    const resumo = extrairResumo(e.answer)

    if (resumo || arquivos.length > 0) {
      await update($, explicacao, () => ({
        em: momento,
        arquivos,
        ...(resumo ?? { feito: [], decisoes: [], aprender: [] }),
      }))
    }

    void atualizar($)

    return resultado
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const [dados, infoCache, instante, abaAtual, infoExplicacao, infoDeploy, infoPref] = await Promise.all([
      read($, painel),
      read($, cache),
      read($, agora),
      read($, aba),
      read($, explicacao),
      read($, deploy),
      read($, preferencias),
    ])

    const titulo = (texto: string) => (
      <Text color={COR_DESTAQUE} bold>
        {texto.toUpperCase()}
      </Text>
    )

    const secao = (texto: string, conteudo: unknown) => (
      <Box flexDirection="column" marginBottom={1}>
        {titulo(texto)}
        {conteudo}
      </Box>
    )

    const linha = (rotulo: string, valor: string, cor?: 'error' | 'warning' | 'success') => (
      <Box flexDirection="row">
        <Box width={LARGURA_ROTULO}>
          <Text dimColor>{rotulo}</Text>
        </Box>
        <Text color={cor}>{valor}</Text>
      </Box>
    )

    const checagem = (isOk: boolean, texto: string) => (
      <Text color={isOk ? 'success' : 'warning'}>
        {isOk ? '✓' : '!'} {texto}
      </Text>
    )

    const comando = (id: string, texto: string) => (
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        <Text color="suggestion">{texto}</Text>
        <Button
          key={`copiar-${id}`}
          label="Copiar"
          onPress={press => {
            void $.ui
              .copy({ text: texto, surface: press.surface })
              .then(copia => $.ui.toast(copia.isCopied ? 'Comando copiado' : 'Não deu para copiar'))
          }}
        />
      </Box>
    )

    const largura = Math.max(10, e.props.bodyColumns - 4)

    const tabs = (
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" columnGap={2}>
          {ABAS.map(item => (
            <Button
              key={`aba-${item.id}`}
              plain
              label={item.nome}
              onPress={() => {
                void update($, aba, () => item.id)
              }}
            >
              {item.id === abaAtual ? (
                <Text color={COR_DESTAQUE} bold>
                  ◆ <Text underline>{item.nome}</Text>
                </Text>
              ) : (
                <Text dimColor>{item.nome}</Text>
              )}
            </Button>
          ))}
        </Box>
        <Text dimColor>{'─'.repeat(largura)}</Text>
      </Box>
    )

    const abaPainel = (dadosPainel: Painel) => {
      const isMaster = dadosPainel.workspace === 'master'
      const ttlMs = infoCache.ttlMin * 60000
      const restanteMs =
        infoCache.ultimaRespostaEm === null ? null : ttlMs - (instante - infoCache.ultimaRespostaEm)
      const fracao = restanteMs === null ? 0 : restanteMs / ttlMs
      const corCache = fracao > 0.5 ? 'success' : fracao > 0.2 ? 'warning' : 'error'
      const barraCache = barra(fracao)
      const mudancas = dadosPainel.modificados.length

      return (
        <Box flexDirection="column">
          {secao(
            'Git',
            dadosPainel.branch === null ? (
              <Text dimColor>Pasta fora de um repositório git</Text>
            ) : (
              <Box flexDirection="column">
                {linha('Branch', dadosPainel.branch)}
                {linha('Tarefa', dadosPainel.tarefa ? `#${dadosPainel.tarefa}` : 'sem número na branch')}
                {linha(
                  'Mudanças',
                  mudancas ? `${mudancas} arquivo${mudancas > 1 ? 's' : ''}` : 'nada pendente',
                  mudancas ? 'warning' : undefined,
                )}
              </Box>
            ),
          )}

          {dadosPainel.plataforma === 'VTEX IO' &&
            secao(
              'VTEX IO',
              <Box flexDirection="column">
                {linha('Conta', dadosPainel.conta ?? 'não logado')}
                <Box flexDirection="column" marginTop={1}>
                  <Text dimColor>Apps</Text>
                  {dadosPainel.apps.map(app => (
                    <Text>
                      • {app.nome} <Text dimColor>{app.versao}</Text>
                    </Text>
                  ))}
                </Box>
                <Box
                  flexDirection="column"
                  borderStyle="round"
                  borderColor={isMaster ? 'error' : 'success'}
                  paddingX={1}
                  marginTop={1}
                >
                  <Text dimColor>Workspace</Text>
                  <Text color={isMaster ? 'error' : 'success'} bold>
                    {dadosPainel.workspace ?? '—'}
                  </Text>
                  {isMaster && <Text color="error">⚠ Produção: cuidado com link e install</Text>}
                </Box>
              </Box>,
            )}

          {dadosPainel.plataforma === 'FastStore' &&
            secao('FastStore', linha('Store ID', dadosPainel.storeId ?? 'não encontrado'))}

          {dadosPainel.plataforma === 'Deco' &&
            secao(
              'Deco',
              <Box flexDirection="column">
                {linha('Site', dadosPainel.decoSite ?? 'sem .env')}
                {linha(
                  'Ambiente',
                  dadosPainel.decoEnv ?? 'sem DECO_ENV_NAME',
                  dadosPainel.decoEnv ? undefined : 'warning',
                )}
              </Box>,
            )}

          {secao(
            'Cache do prompt',
            <Box flexDirection="column">
              {restanteMs === null ? (
                <Text dimColor>Aguardando a primeira resposta</Text>
              ) : restanteMs <= 0 ? (
                <Box flexDirection="column">
                  <Text color="error">Expirado</Text>
                  <Text dimColor>A próxima mensagem relê a conversa inteira</Text>
                </Box>
              ) : (
                <Box flexDirection="column">
                  <Box flexDirection="row">
                    <Text color={COR_DESTAQUE}>{barraCache.cheios}</Text>
                    <Text dimColor>{barraCache.vazios}</Text>
                  </Box>
                  {linha('Expira em', formatarMinutos(restanteMs), corCache)}
                </Box>
              )}
              {infoCache.aproveitamento !== null && linha('Reuso', `${infoCache.aproveitamento}% na última`)}
              <Text dimColor>TTL {infoCache.ttlMin} min · /cache-ttl muda</Text>
            </Box>,
          )}
        </Box>
      )
    }

    const abaExplicacao = () => {
      if (infoExplicacao === null) {
        return (
          <Box flexDirection="column">
            <Text dimColor>Nenhuma alteração nesta sessão ainda.</Text>
            <Text dimColor>Quando o Claude terminar uma task, o resumo aparece aqui.</Text>
          </Box>
        )
      }

      const lista = (texto: string, itens: string[], marcador = '•') =>
        itens.length > 0 &&
        secao(
          texto,
          <Box flexDirection="column">
            {itens.map(item => (
              <Text>
                {marcador} {item}
              </Text>
            ))}
          </Box>,
        )

      const semResumo =
        infoExplicacao.feito.length === 0 &&
        infoExplicacao.decisoes.length === 0 &&
        infoExplicacao.aprender.length === 0

      return (
        <Box flexDirection="column">
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Última alteração</Text>
            <Text dimColor>{formatarHa(Math.max(0, instante - infoExplicacao.em))}</Text>
          </Box>
          {lista('O que foi feito', infoExplicacao.feito)}
          {lista('Arquivos alterados', infoExplicacao.arquivos.map(encurtarCaminho), '›')}
          {lista('Decisões', infoExplicacao.decisoes)}
          {lista('Pra aprender', infoExplicacao.aprender)}
          {semResumo && <Text dimColor>A resposta não trouxe o resumo de decisões; só os arquivos foram registrados.</Text>}
        </Box>
      )
    }

    const abaDeploy = (dadosPainel: Painel) => {
      if (dadosPainel.plataforma !== 'VTEX IO') {
        const textos = dadosPainel.plataforma
          ? DEPLOY_OUTRAS_PLATAFORMAS[dadosPainel.plataforma]
          : ['Abra o Claude Code dentro de um projeto para ver o roteiro de deploy.']

        return secao(
          dadosPainel.plataforma ? `Deploy · ${dadosPainel.plataforma}` : 'Deploy',
          <Box flexDirection="column">
            {textos.map(texto => (
              <Text>• {texto}</Text>
            ))}
          </Box>,
        )
      }

      const prefixoDe = (item: AppVtex) => (item.pasta === '.' ? '' : `${item.pasta}/`)
      const foiAlterado = (item: AppVtex) =>
        dadosPainel.alteradosUltimoCommit.some(caminho => caminho.startsWith(prefixoDe(item)))
      const appsOrdenados = [...dadosPainel.apps].sort((a, b) => Number(foiAlterado(b)) - Number(foiAlterado(a)))
      const app =
        dadosPainel.apps.find(item => item.pasta === infoDeploy.app) ??
        (dadosPainel.apps.length === 1 ? dadosPainel.apps[0] : undefined)

      const escolha = secao(
        'Qual app você vai publicar?',
        <Box flexDirection="column">
          <Text dimColor>Cada pasta com manifest.json é um app, publicado separadamente.</Text>
          <Text dimColor>● = mudou no último commit (o merge da PR).</Text>
          <Box flexDirection="column" marginTop={1}>
            {appsOrdenados.map(item => (
              <Button
                key={`app-${item.pasta}`}
                plain
                label={item.nome}
                onPress={() => {
                  void update($, deploy, atual => ({ ...atual, app: item.pasta }))
                }}
              >
                <Text
                  color={item === app ? COR_DESTAQUE : undefined}
                  bold={item === app}
                  dimColor={item !== app && !foiAlterado(item)}
                >
                  {item === app ? '◆' : foiAlterado(item) ? '●' : ' '} {item.nome} {item.versao}
                </Text>
              </Button>
            ))}
          </Box>
        </Box>,
      )

      if (dadosPainel.apps.length === 0) return <Text dimColor>Nenhum app VTEX IO encontrado.</Text>

      if (!app) {
        return (
          <Box flexDirection="column">
            {escolha}
            <Text dimColor>Escolha o app para ver o passo a passo dele.</Text>
          </Box>
        )
      }

      const idApp = `${app.vendor}.${app.nome}@${app.versao}`
      const chaveApp = `${app.vendor}.${app.nome}`
      const descricao = descreverApp(app)
      const sujos = dadosPainel.modificados.filter(
        caminho => caminho === `${prefixoDe(app)}react/package.json` || caminho === `${prefixoDe(app)}react/yarn.lock`,
      )
      const publicarAntes = dadosPainel.apps.filter(
        outro => outro !== app && `${outro.vendor}.${outro.nome}` in app.dependencias,
      )
      const dependentes = dadosPainel.apps.filter(outro => outro !== app && chaveApp in outro.dependencias)
      const isBranchPrincipal = dadosPainel.branch === 'master' || dadosPainel.branch === 'main'
      const isContaDoVendor = dadosPainel.conta === app.vendor
      const publicadoEm = infoDeploy.publicadoEm[idApp]
      const restanteMs = publicadoEm === undefined ? null : ESPERA_DEPLOY_MS - (instante - publicadoEm)
      const isLiberado = restanteMs !== null && restanteMs <= 0
      const barraEspera = barra(restanteMs === null ? 0 : 1 - restanteMs / ESPERA_DEPLOY_MS)

      const marcarPublish = (momento: number | null) => {
        void update($, deploy, atual => {
          const publicados = { ...atual.publicadoEm }

          if (momento === null) delete publicados[idApp]
          else publicados[idApp] = momento

          return { ...atual, publicadoEm: publicados }
        })
        void update($, agora, () => Date.now())
      }

      const marcadorPublish =
        publicadoEm === undefined ? (
          <Box marginTop={1}>
            <Button key="publish-feito" label="Publish feito" onPress={() => marcarPublish(Date.now())} />
          </Box>
        ) : (
          <Box flexDirection="row" columnGap={1} marginTop={1}>
            <Text color="success">✓ marcado {formatarHa(Math.max(0, instante - publicadoEm))}</Text>
            <Button key="publish-desfazer" plain dimColor label="desfazer" onPress={() => marcarPublish(null)} />
          </Box>
        )

      const espera =
        restanteMs === null ? (
          <Text dimColor>O contador começa quando você clicar em Publish feito.</Text>
        ) : (
          <Box flexDirection="column">
            <Box flexDirection="row">
              <Text color={COR_DESTAQUE}>{barraEspera.cheios}</Text>
              <Text dimColor>{barraEspera.vazios}</Text>
            </Box>
            {isLiberado ? (
              <Text color="success">✓ Liberado para o deploy</Text>
            ) : (
              <Text color="warning">Faltam {formatarMinutos(restanteMs)}</Text>
            )}
          </Box>
        )

      const etapas: { titulo: string; textos: string[]; conteudo?: unknown }[] = []

      if (sujos.length > 0) {
        etapas.push({
          titulo: 'Guardar os arquivos do yarn setup',
          textos: [
            'O vtex publish envia a pasta local inteira, não o que está no Git.',
            'Guarde os arquivos mexidos pelo yarn setup para eles não irem junto.',
          ],
          conteudo: comando('stash', `git stash push -- ${sujos.join(' ')}`),
        })
      }

      etapas.push({
        titulo: 'Publicar',
        textos: [
          'Gera a versão release candidate (RC) do app.',
          'O publish lê o manifest.json da pasta atual: rode de dentro da pasta do app.',
          'Confira nome e versão no prompt antes de responder y.',
        ],
        conteudo: (
          <Box flexDirection="column">
            {comando('publish', app.pasta === '.' ? 'vtex publish' : `cd ${app.pasta} && vtex publish`)}
            {marcadorPublish}
          </Box>
        ),
      })

      if (sujos.length > 0) {
        etapas.push({
          titulo: 'Devolver os arquivos guardados',
          textos: ['Pode fazer durante a espera.'],
          conteudo: comando('stash-pop', app.pasta === '.' ? 'git stash pop' : 'cd .. && git stash pop'),
        })
      }

      etapas.push(
        {
          titulo: 'Esperar 7 minutos',
          textos: [
            'É o período de teste obrigatório depois do publish.',
            'O vtex deploy -f é recusado pelo servidor. Se o deploy der erro de tempo, espere o que falta e rode de novo.',
          ],
          conteudo: espera,
        },
        {
          titulo: 'Deploy',
          textos: ['Promove o release candidate a versão estável.', 'Pode rodar de qualquer pasta.'],
          conteudo: comando('deploy', `vtex deploy ${idApp}`),
        },
        {
          titulo: 'Install no master',
          textos: [
            'Depois do deploy, o master não atualiza sozinho: instale explicitamente.',
            'Responda y na confirmação do workspace master (é produção).',
          ],
          conteudo: comando('install', `vtex install ${idApp}`),
        },
        {
          titulo: 'Conferir',
          textos: ['A versão nova deve aparecer em Installed Apps, e Linked Apps deve estar vazio.'],
          conteudo: comando('ls', 'vtex ls'),
        },
        {
          titulo: 'Testar em produção',
          textos: [
            'Use aba anônima ou ?v=1 na URL por causa do cache.',
            'Teste no desktop e no mobile/iOS e guarde os prints para a PR.',
          ],
        },
      )

      return (
        <Box flexDirection="column">
          {escolha}

          {secao(
            'Sobre este app',
            <Box flexDirection="column">
              <Text>{idApp}</Text>
              {linha('Tipo', descricao.tipo)}
              <Text dimColor>› {descricao.dica}</Text>
              {dependentes.map(outro => {
                const faixa = outro.dependencias[chaveApp] ?? '?'
                const aceita = aceitaVersao(faixa, app.versao)

                return checagem(
                  aceita !== false,
                  `${outro.nome} pede ${faixa}${aceita === false ? `: ajuste para aceitar ${app.versao}` : ''}`,
                )
              })}
            </Box>,
          )}

          {secao(
            'Antes de começar',
            <Box flexDirection="column">
              <Text dimColor>Esteja na master atualizada, com a PR já mergeada.</Text>
              {checagem(isBranchPrincipal, `Branch ${dadosPainel.branch ?? '—'}`)}
              {!isBranchPrincipal && comando('master', 'git checkout master && git pull')}
              {checagem(
                isContaDoVendor,
                isContaDoVendor
                  ? `Conta ${dadosPainel.conta} = vendor do app`
                  : `Conta ${dadosPainel.conta ?? '—'} ≠ vendor ${app.vendor}: rode vtex login ${app.vendor}`,
              )}
              {checagem(
                dadosPainel.workspace === 'master',
                dadosPainel.workspace === 'master'
                  ? 'Workspace master'
                  : `Workspace ${dadosPainel.workspace ?? '—'}: rode vtex use master`,
              )}
              {publicarAntes.length > 0 &&
                checagem(false, `Publique e instale antes: ${publicarAntes.map(outro => outro.nome).join(', ')}`)}
            </Box>,
          )}

          {etapas.map((etapa, indice) => (
            <Box flexDirection="column" marginBottom={1}>
              <Text color={COR_DESTAQUE} bold>
                {`${indice + 1} · ${etapa.titulo.toUpperCase()}`}
              </Text>
              {etapa.textos.map(texto => (
                <Text dimColor>{texto}</Text>
              ))}
              {etapa.conteudo !== undefined && (
                <Box flexDirection="column" marginTop={1}>
                  {etapa.conteudo}
                </Box>
              )}
            </Box>
          ))}

          {secao(
            'Conceitos',
            <Box flexDirection="column">
              <Text>
                <Text bold>publish</Text> gera o release candidate, lendo a pasta atual
              </Text>
              <Text>
                <Text bold>deploy</Text> torna essa versão estável
              </Text>
              <Text>
                <Text bold>install</Text> coloca a versão no workspace
              </Text>
              <Text dimColor>
                Alternativa da doc: instalar o RC num workspace de produção, testar e rodar vtex workspace promote.
              </Text>
              <Text dimColor>{DOC_PUBLICAR}</Text>
            </Box>,
          )}
        </Box>
      )
    }

    const opcao = (chave: string, texto: string, isAtivo: boolean, aoEscolher: () => void) => (
      <Button key={chave} plain label={texto} onPress={aoEscolher}>
        <Text color={isAtivo ? COR_DESTAQUE : undefined} bold={isAtivo} dimColor={!isAtivo}>
          {isAtivo ? '◆ ' : ''}
          {texto}
        </Text>
      </Button>
    )

    const botao = (chave: string, texto: string, isAtivo: boolean, aoEscolher: () => void) => (
      <Box
        borderStyle="round"
        borderColor={COR_DESTAQUE}
        backgroundColor={isAtivo ? COR_DESTAQUE : undefined}
        paddingX={1}
      >
        <Button key={chave} plain label={texto} onPress={aoEscolher}>
          <Text
            color={isAtivo ? COR_TEXTO_ATIVO : COR_DESTAQUE}
            backgroundColor={isAtivo ? COR_DESTAQUE : undefined}
            bold={isAtivo}
          >
            {texto}
          </Text>
        </Button>
      </Box>
    )

    const aviso = infoPref.aviso !== null && (
      <Box marginTop={1}>
        <Text color="warning">› {infoPref.aviso}</Text>
      </Box>
    )

    const abaTema = () => {
      const temaAtual = infoPref.tema

      return (
        <Box flexDirection="column">
          {secao(
            'Tema atual',
            <Box flexDirection="column">
              <Text bold>{temaAtual?.nome ?? 'Padrão do Claude Code'}</Text>
              <Text dimColor>Os temas da lista também pintam o fundo do Windows Terminal.</Text>
            </Box>,
          )}

          {secao(
            'Temas',
            <Box flexDirection="column">
              {TEMAS.map(paleta => {
                const isAtivo = temaAtual?.valor === TEMA_PERSONALIZADO && temaAtual.nome === paleta.nome
                const amostra = [1, 2, 3, 4, 5, 6].map(indice => paleta.normal[indice] ?? paleta.texto)

                return (
                  <Button key={`tema-${paleta.slug}`} plain label={paleta.nome} onPress={acao($, () => escolherPaleta($, paleta))}>
                    <Text>
                      <Text color={isAtivo ? COR_DESTAQUE : undefined} bold={isAtivo}>
                        {isAtivo ? '◆ ' : '  '}
                        {paleta.nome.padEnd(18)}
                      </Text>
                      <Text backgroundColor={paleta.fundo}>
                        {' '}
                        {amostra.map(cor => (
                          <Text color={cor}>●</Text>
                        ))}{' '}
                      </Text>
                    </Text>
                  </Button>
                )
              })}
            </Box>,
          )}

          {secao(
            'Nativos do Claude Code',
            <Box flexDirection="column">
              <Text dimColor>Usam o fundo original do terminal.</Text>
              <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
                {infoPref.temasNativos.map(valor =>
                  opcao(`nativo-${valor}`, nomeDoTemaNativo(valor), temaAtual?.valor === valor, acao($, () => escolherTemaNativo($, valor))),
                )}
              </Box>
            </Box>,
          )}

          <Button key="tema-original" label="Voltar ao tema original" onPress={acao($, () => voltarTemaOriginal($))} />
          {aviso}
        </Box>
      )
    }

    const abaModo = () => {
      const familia = familiaDoModelo(infoPref.modelo)

      return (
        <Box flexDirection="column">
          {secao(
            'Modelo',
            <Box flexDirection="column">
              <Text>
                Atual: <Text bold>{nomeDoModelo(infoPref.modelo)}</Text>
              </Text>
              <Box flexDirection="row" flexWrap="wrap" columnGap={2} marginTop={1}>
                {MODELOS.map(modelo =>
                  botao(`modelo-${modelo.alias}`, modelo.nome, familia === modelo.alias, acao($, () => escolherModelo($, modelo.alias))),
                )}
              </Box>
              <Text dimColor>Troca pelo /model nativo: vale agora e nas próximas sessões.</Text>
            </Box>,
          )}

          {secao(
            'Esforço',
            <Box flexDirection="column">
              <Text dimColor>Quanto o modelo pensa antes de responder.</Text>
              <Text dimColor>Mais esforço: respostas mais cuidadosas, porém mais lentas e caras.</Text>
              <Box flexDirection="row" flexWrap="wrap" columnGap={2} marginTop={1}>
                {botao('esforco-padrao', 'Padrão', infoPref.esforco === null, acao($, () => escolherEsforco($, null)))}
                {ESFORCOS.map(nivel =>
                  botao(`esforco-${nivel.id}`, nivel.nome, infoPref.esforco === nivel.id, acao($, () => escolherEsforco($, nivel.id))),
                )}
              </Box>
            </Box>,
          )}

          {secao(
            'Modo de permissão',
            <Box flexDirection="column">
              <Text dimColor>Nesta sessão, o Shift+Tab alterna entre os modos.</Text>
              <Text dimColor>Novas sessões começam em:</Text>
              <Box flexDirection="row" flexWrap="wrap" columnGap={2} marginTop={1}>
                {MODOS.map(modo =>
                  botao(`modo-${modo.id}`, modo.nome, infoPref.modoPadrao === modo.id, acao($, () => escolherModoPadrao($, modo.id))),
                )}
              </Box>
              {MODOS.filter(modo => modo.id === infoPref.modoPadrao).map(modo => (
                <Text color={COR_DESTAQUE}>
                  › {modo.nome}: {modo.descricao}
                </Text>
              ))}
            </Box>,
          )}

          {aviso}
        </Box>
      )
    }

    const conteudo =
      abaAtual === 'tema' ? (
        abaTema()
      ) : abaAtual === 'modo' ? (
        abaModo()
      ) : abaAtual === 'explicacao' ? (
        abaExplicacao()
      ) : dados === null ? (
        <Text dimColor>Carregando...</Text>
      ) : abaAtual === 'deploy' ? (
        abaDeploy(dados)
      ) : (
        abaPainel(dados)
      )

    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            <Text color={COR_DESTAQUE} bold>
              {ICONE_DEV}
            </Text>{' '}
            <Text bold>{dados?.nome ?? 'Sem nome no git config'}</Text>
          </Text>
          <Text dimColor>
            {dados?.projeto ?? '—'}
            {dados?.plataforma ? ` · ${dados.plataforma}` : ''}
          </Text>
        </Box>
        {tabs}
        {conteudo}
      </Box>
    )
  })
}
