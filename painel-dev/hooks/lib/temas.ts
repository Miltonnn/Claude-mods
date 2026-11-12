export type Cores8 = readonly [string, string, string, string, string, string, string, string]

export type Paleta = {
  slug: string
  nome: string
  fundo: string
  texto: string
  destaque: string
  normal: Cores8
  brilhante: Cores8
}

export const NOME_TEMA = 'painel-dev'

export const COR_CLAUDE = '#d97757'
export const COR_FUNDO_ESCURO = '#141413'
export const COR_FUNDO_PAINEL = '#0d0d0c'

export const TEMAS: readonly Paleta[] = [
  {
    slug: 'econverse-claude',
    nome: 'Econverse Claude',
    fundo: COR_FUNDO_ESCURO,
    texto: '#f0eee6',
    destaque: COR_CLAUDE,
    normal: ['#262624', '#e5675e', '#6fbf8e', '#e8b45a', '#7aa2f7', COR_CLAUDE, '#67c4cf', '#c2c0b6'],
    brilhante: ['#4a4843', '#f08a80', '#8fd6a9', '#f3c97d', '#9bb8ff', '#eb9a7c', '#8bd8e0', '#faf9f5'],
  },
  {
    slug: 'dracula',
    nome: 'Dracula',
    fundo: '#282a36',
    texto: '#f8f8f2',
    destaque: '#bd93f9',
    normal: ['#21222c', '#ff5555', '#50fa7b', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2'],
    brilhante: ['#6272a4', '#ff6e6e', '#69ff94', '#ffffa5', '#d6acff', '#ff92df', '#a4ffff', '#ffffff'],
  },
  {
    slug: 'tokyo-night',
    nome: 'Tokyo Night',
    fundo: '#1a1b26',
    texto: '#c0caf5',
    destaque: '#bb9af7',
    normal: ['#15161e', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6'],
    brilhante: ['#414868', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#c0caf5'],
  },
  {
    slug: 'catppuccin-mocha',
    nome: 'Catppuccin Mocha',
    fundo: '#1e1e2e',
    texto: '#cdd6f4',
    destaque: '#cba6f7',
    normal: ['#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de'],
    brilhante: ['#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8'],
  },
  {
    slug: 'rose-pine',
    nome: 'Rosé Pine',
    fundo: '#191724',
    texto: '#e0def4',
    destaque: '#c4a7e7',
    normal: ['#26233a', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4'],
    brilhante: ['#6e6a86', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4'],
  },
  {
    slug: 'one-dark',
    nome: 'One Dark',
    fundo: '#282c34',
    texto: '#abb2bf',
    destaque: '#c678dd',
    normal: ['#282c34', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#abb2bf'],
    brilhante: ['#5c6370', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#ffffff'],
  },
  {
    slug: 'nord',
    nome: 'Nord',
    fundo: '#2e3440',
    texto: '#d8dee9',
    destaque: '#88c0d0',
    normal: ['#3b4252', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#88c0d0', '#e5e9f0'],
    brilhante: ['#4c566a', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#8fbcbb', '#eceff4'],
  },
  {
    slug: 'gruvbox-dark',
    nome: 'Gruvbox Dark',
    fundo: '#282828',
    texto: '#ebdbb2',
    destaque: '#fe8019',
    normal: ['#282828', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984'],
    brilhante: ['#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2'],
  },
  {
    slug: 'solarized-dark',
    nome: 'Solarized Dark',
    fundo: '#002b36',
    texto: '#839496',
    destaque: '#6c71c4',
    normal: ['#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5'],
    brilhante: ['#586e75', '#cb4b16', '#859900', '#b58900', '#268bd2', '#6c71c4', '#2aa198', '#fdf6e3'],
  },
  {
    slug: 'github-light',
    nome: 'GitHub Light',
    fundo: '#ffffff',
    texto: '#1f2328',
    destaque: '#8250df',
    normal: ['#24292f', '#cf222e', '#116329', '#4d2d00', '#0969da', '#8250df', '#1b7c83', '#6e7781'],
    brilhante: ['#57606a', '#a40e26', '#1a7f37', '#633c01', '#218bff', '#a475f9', '#3192aa', '#8c959f'],
  },
  {
    slug: 'catppuccin-latte',
    nome: 'Catppuccin Latte',
    fundo: '#eff1f5',
    texto: '#4c4f69',
    destaque: '#8839ef',
    normal: ['#5c5f77', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#acb0be'],
    brilhante: ['#6c6f85', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#bcc0cc'],
  },
]

function paraRgb(hex: string): [number, number, number] {
  const valor = Number.parseInt(hex.replace('#', ''), 16)

  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255]
}

function paraHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map(canal => Math.round(canal).toString(16).padStart(2, '0')).join('')}`
}

export function misturar(cor: string, outra: string, peso: number): string {
  const a = paraRgb(cor)
  const b = paraRgb(outra)

  return paraHex([a[0] + (b[0] - a[0]) * peso, a[1] + (b[1] - a[1]) * peso, a[2] + (b[2] - a[2]) * peso])
}

export function ehClaro(hex: string): boolean {
  const [r, g, b] = paraRgb(hex)

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5
}

export function paraTemaClaude(paleta: Paleta) {
  const [, vermelho, verde, amarelo, azul, magenta, ciano] = paleta.normal
  const { fundo, texto, destaque } = paleta

  return {
    name: paleta.nome,
    base: ehClaro(fundo) ? 'light' : 'dark',
    overrides: {
      claude: destaque,
      claudeShimmer: misturar(destaque, texto, 0.35),
      text: texto,
      inverseText: fundo,
      inactive: paleta.brilhante[0],
      subtle: misturar(fundo, texto, 0.3),
      suggestion: azul,
      permission: destaque,
      remember: magenta,
      success: verde,
      error: vermelho,
      warning: amarelo,
      planMode: ciano,
      autoAccept: magenta,
      promptBorder: misturar(fundo, texto, 0.35),
      bashBorder: magenta,
      ide: azul,
      merged: destaque,
      diffAdded: misturar(fundo, verde, 0.25),
      diffRemoved: misturar(fundo, vermelho, 0.25),
      diffAddedWord: verde,
      diffRemovedWord: vermelho,
    },
  }
}

export function paraEsquemaWindowsTerminal(paleta: Paleta): Record<string, string> {
  const nomes = ['black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white'] as const
  const esquema: Record<string, string> = {
    name: NOME_TEMA,
    background: paleta.fundo,
    foreground: paleta.texto,
    cursorColor: paleta.destaque,
    selectionBackground: misturar(paleta.fundo, paleta.destaque, 0.35),
  }

  nomes.forEach((nome, indice) => {
    esquema[nome] = paleta.normal[indice] ?? paleta.texto
    esquema[`bright${nome.charAt(0).toUpperCase()}${nome.slice(1)}`] = paleta.brilhante[indice] ?? paleta.texto
  })

  return esquema
}
