# Claude-mods

Mods pessoais para o Claude Code.

## Mods

| Mod | O que faz |
| --- | --- |
| `painel-dev` | Aba lateral com três tabs. **Painel**: projeto, plataforma (VTEX IO, FastStore, Deco, Wake), branch, tarefa, arquivos alterados, conta/workspace/apps VTEX e cache do prompt. **Explicação**: resumo da última alteração feita pelo Claude e arquivos editados. **Deploy**: roteiro de publish, espera de 7 min, deploy e install por app VTEX IO, com botão de copiar cada comando. **Tema**: 11 temas curados que pintam o Claude Code e o fundo do Windows Terminal, além dos temas nativos. **Modo**: modelo, esforço e modo de permissão padrão. Comandos `/painel`, `/explicacao`, `/deploy`, `/tema`, `/modo` e `/cache-ttl 5\|60`. |
| `guarda-comandos` | Bloqueia `git commit`, `git push`, `git add .`/`-A` e `vtex deploy -f` feitos pelo Claude. Pede confirmação antes de `vtex publish`, `deploy`, `install`, `promote` e `use master`. |
| `atalhos` | Comandos `/vtex-whoami`, `/vtex-ls` e `/deco-meta <url> [termo]`. |

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
