export type Plataforma = 'VTEX IO' | 'FastStore' | 'Deco' | 'Wake'

export type Aba = 'painel' | 'explicacao' | 'deploy' | 'tema' | 'modo'

export type Esforco = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type Preferencias = {
  tema: { valor: string; nome: string } | null
  temasNativos: string[]
  modelo: string | null
  esforco: Esforco | null
  modoPadrao: string | null
  aviso: string | null
}

export type AppVtex = {
  pasta: string
  vendor: string
  nome: string
  versao: string
  builders: string[]
  dependencias: Record<string, string>
}

export type Painel = {
  nome: string | null
  projeto: string | null
  plataforma: Plataforma | null
  apps: AppVtex[]
  branch: string | null
  tarefa: string | null
  modificados: string[]
  alteradosUltimoCommit: string[]
  conta: string | null
  workspace: string | null
  storeId: string | null
  decoSite: string | null
  decoEnv: string | null
}

export type CacheInfo = {
  ultimaRespostaEm: number | null
  aproveitamento: number | null
  ttlMin: number
}

export type Explicacao = {
  em: number
  arquivos: string[]
  feito: string[]
  decisoes: string[]
  aprender: string[]
}

export type LeituraGuiada = {
  alvo: string
  inicio: number
  etapa: number
  pergunta: string | null
  equivocos: string[]
  conceitos: string[]
  concluida: boolean
}

export type Limite = {
  rotulo: string
  pct: number
  zeraEm: number | null
}

export type StatusInfo = {
  contextoPct: number | null
  contextoTokens: number | null
  janela: number
  limites: Limite[]
}

export type StatusPasso = 'pendente' | 'fazendo' | 'feito'

export type PassoZen = {
  id: string
  texto: string
  status: StatusPasso
}

export type TarefaZen = {
  titulo: string
  inicio: number
  fim: number | null
  passos: PassoZen[]
}

export type DeployInfo = {
  app: string | null
  publicadoEm: Record<string, number>
}

declare module 'claude-code' {
  interface PluginState {
    'painel-dev': {
      painel: Shaped<Painel | null>
      cache: Shaped<CacheInfo>
      agora: number
      explicacao: Shaped<Explicacao | null>
      leitura: Shaped<LeituraGuiada | null>
      arquivosTurno: string[]
      aba: Aba
      deploy: Shaped<DeployInfo>
      preferencias: Shaped<Preferencias>
      status: Shaped<StatusInfo | null>
      paneAberta: boolean
      zenLigado: boolean
      zenRecolhido: boolean
      zenTarefa: Shaped<TarefaZen | null>
      zenRelogio: number
    }
  }
}
