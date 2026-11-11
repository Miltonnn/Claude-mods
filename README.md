# Claude-mods

Mods pessoais para o Claude Code.

## Estrutura

Cada mod fica em uma pasta própria na raiz do repositório:

```
Claude-mods/
├── nome-do-mod/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── hooks/
│   ├── types/
│   └── tsconfig.json
└── outro-mod/
```

O `plugin.json` identifica o mod:

```json
{
  "name": "nome-do-mod",
  "version": "0.1.0",
  "description": "O que o mod faz",
  "types": "./types/index.d.ts"
}
```

## Como ativar um mod

Adicione a pasta do mod na variável `CLAUDE_CODE_PLUGIN_DIRS` do `~/.claude/settings.json`, separando os caminhos com `;`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "C:\\Users\\milto\\.claude\\mods\\extra-mods;C:\\Users\\milto\\pessoal\\Claude-mods\\nome-do-mod"
  }
}
```

Depois, reinicie o Claude Code. A variável só é lida quando a sessão começa.

## Como desativar um mod

Remova o caminho do mod da variável `CLAUDE_CODE_PLUGIN_DIRS` e reinicie o Claude Code.
