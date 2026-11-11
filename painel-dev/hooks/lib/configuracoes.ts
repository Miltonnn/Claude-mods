import type { EngineInterface } from 'claude-code'

import { NOME_TEMA } from './temas'

type Objeto = Record<string, unknown>

type PerfilOriginal = { colorScheme?: unknown; background?: unknown }

const ESQUEMAS_DE_MODS = [NOME_TEMA, 'extra-mods']

export type ResultadoTerminal = 'pintado' | 'restaurado' | 'fora-do-windows-terminal'

export async function pastaHome($: EngineInterface): Promise<string> {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '.'

  return home.replace(/\\/g, '/')
}

export function lerJsonc(texto: string): unknown {
  let saida = ''
  let isEmTexto = false

  for (let i = 0; i < texto.length; i++) {
    const atual = texto.charAt(i)
    const proximo = texto.charAt(i + 1)

    if (isEmTexto) {
      saida += atual

      if (atual === '\\') {
        saida += proximo
        i++
      } else if (atual === '"') {
        isEmTexto = false
      }

      continue
    }

    if (atual === '"') {
      isEmTexto = true
      saida += atual
    } else if (atual === '/' && proximo === '/') {
      while (i < texto.length && texto.charAt(i) !== '\n') i++
      saida += '\n'
    } else if (atual === '/' && proximo === '*') {
      i += 2
      while (i < texto.length && !(texto.charAt(i) === '*' && texto.charAt(i + 1) === '/')) i++
      i++
    } else {
      saida += atual
    }
  }

  return JSON.parse(saida.replace(/,(\s*[}\]])/g, '$1'))
}

async function escreverComBackup($: EngineInterface, caminho: string, novo: string, original: string): Promise<void> {
  const backup = `${caminho}.painel-dev.bak`

  if (!(await $.fs.exists(backup))) await $.fs.write(backup, original)

  await $.fs.write(caminho, novo)
}

export async function alterarSettingsClaude($: EngineInterface, mudar: (settings: Objeto) => void): Promise<void> {
  const caminho = `${await pastaHome($)}/.claude/settings.json`
  const original = (await $.fs.exists(caminho)) ? await $.fs.read(caminho) : '{}'
  const settings = JSON.parse(original) as Objeto

  mudar(settings)

  const novo = `${JSON.stringify(settings, null, 2)}\n`

  if (novo !== original) await escreverComBackup($, caminho, novo, original)
}

async function caminhoWindowsTerminal($: EngineInterface, idPerfil: string): Promise<string | null> {
  const local = ((await $.env.get('LOCALAPPDATA')) ?? '').replace(/\\/g, '/')

  if (local === '') return null

  const candidatos = [
    `${local}/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json`,
    `${local}/Packages/Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe/LocalState/settings.json`,
    `${local}/Microsoft/Windows Terminal/settings.json`,
  ]

  for (const caminho of candidatos) {
    if (!(await $.fs.exists(caminho))) continue
    if ((await $.fs.read(caminho)).toLowerCase().includes(idPerfil.toLowerCase())) return caminho
  }

  return null
}

function acharPerfil(settings: Objeto, idPerfil: string): Objeto | undefined {
  const perfis = settings.profiles
  const lista = Array.isArray(perfis) ? perfis : ((perfis as { list?: unknown } | undefined)?.list ?? [])

  if (!Array.isArray(lista)) return undefined

  return lista.find(
    (perfil): perfil is Objeto =>
      typeof perfil === 'object' &&
      perfil !== null &&
      String((perfil as Objeto).guid ?? '').toLowerCase() === idPerfil.toLowerCase(),
  )
}

export async function pintarWindowsTerminal(
  $: EngineInterface,
  esquema: Record<string, string> | null,
): Promise<ResultadoTerminal> {
  const idPerfil = await $.env.get('WT_PROFILE_ID')

  if (!idPerfil) return 'fora-do-windows-terminal'

  const caminho = await caminhoWindowsTerminal($, idPerfil)

  if (caminho === null) return 'fora-do-windows-terminal'

  const original = await $.fs.read(caminho)
  const settings = lerJsonc(original) as Objeto
  const perfil = acharPerfil(settings, idPerfil)

  if (!perfil) return 'fora-do-windows-terminal'

  const chave = idPerfil.toLowerCase()
  const originais = ((await $.store.get('wtOriginal')) ?? {}) as Record<string, PerfilOriginal>
  const esquemas = (Array.isArray(settings.schemes) ? settings.schemes : []) as Objeto[]
  const outrosEsquemas = esquemas.filter(item => item.name !== NOME_TEMA)

  if (esquema) {
    if (!originais[chave]) {
      originais[chave] = {
        colorScheme: ESQUEMAS_DE_MODS.includes(String(perfil.colorScheme)) ? undefined : perfil.colorScheme,
        background: perfil.background,
      }
      await $.store.set('wtOriginal', originais)
    }

    settings.schemes = [...outrosEsquemas, esquema]
    perfil.colorScheme = NOME_TEMA
    delete perfil.background
  } else {
    const anterior = originais[chave]

    if (!anterior) return 'restaurado'

    if (anterior.colorScheme === undefined) delete perfil.colorScheme
    else perfil.colorScheme = anterior.colorScheme

    if (anterior.background !== undefined) perfil.background = anterior.background

    settings.schemes = outrosEsquemas
    delete originais[chave]
    await $.store.set('wtOriginal', originais)
  }

  await escreverComBackup($, caminho, `${JSON.stringify(settings, null, 4)}\n`, original)

  return esquema ? 'pintado' : 'restaurado'
}
