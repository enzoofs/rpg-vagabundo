# RPG Bot — As Cinzas de Valgrin

Bot Discord de RPG de mesa com **DM controlado por IA** (OpenAI gpt-5.2) para campanhas de D&D 5e em portugues brasileiro.

O bot narra cenas, controla NPCs, gerencia combate com animacoes visuais, rastreia consequencias no mundo e gera retratos de personagens via DALL-E — tudo dentro do Discord.

## Features

**Narrativa**
- DM IA que narra cenas com profundidade sensorial e consequencias
- Sistema de pistas em 3 camadas (social, ambiental, consequencia)
- Relogios de ameaca invisiveis que moldam o tom da narrativa
- Recap dramatico estilo "Previously on..." de serie de TV

**Combate**
- Iniciativa automatica com ordem de turno
- NPCs autonomos controlados pela IA
- Animacao de d20 com efeitos para Nat 20 e Nat 1
- Barras de HP visuais (`[████████░░] 8/10 HP`)

**Mundo Persistente**
- 6 relogios de ameaca (0-6) que influenciam a narrativa
- Reputacao com faccoes (-10 a +10)
- Sistema economico (precos, escassez)
- Patrulhas e toque de recolher
- Memoria de NPCs (confianca, medo, flags)
- Clima dinamico e ciclo de hora do dia
- Heuristicas automaticas que atualizam o mundo com base nas acoes

**Visual**
- Discord Embeds tematicos em todas as interacoes
- Retratos de NPC gerados por DALL-E (assincrono, nao trava o jogo)
- Indicador de hora do dia e clima no footer

**Gameplay**
- Inventario compartilhado do grupo
- Diario de quests
- Ficha de PC resumida
- Exportacao de sessao como .txt
- Save/load de snapshots

## Setup

```bash
git clone https://github.com/enzoofs/rpg-vagabundo.git
cd rpg-vagabundo
npm install
```

Crie um arquivo `.env` (veja `.env.example`):

```
DISCORD_TOKEN=seu_token_do_bot_discord
OPENAI_API_KEY=sua_chave_da_openai
```

No `index.js`, configure:
- `GAME_CHANNEL_ID` — ID do canal do Discord
- `DM_USER_ID` — ID do usuario DM

```bash
node index.js
```

## Como Jogar

```
1. DM: !setup           → cria a mesa
2. Jogadores: !join      → entram (max 2)
3. DM: !scene <tom>      → define o tom da campanha
4. DM: !start            → comeca a aventura
5. Jogadores: !act <acao> → descrevem o que fazem
6. Bot narra e avanca     → repita!
```

## Documentacao

Veja o [MANUAL.md](MANUAL.md) para a referencia completa de comandos e sistemas.

## Stack

- Node.js (ESM)
- discord.js
- OpenAI API (gpt-5.2 + DALL-E 3)

## Campaign Pack

Os arquivos em `campaign/` definem o cenario. Edite-os para criar sua propria campanha:

| Arquivo | Conteudo |
|---------|----------|
| `dm_persona.md` | Personalidade do DM IA |
| `world_bible.md` | Cenario, faccoes, NPCs, misterios |
| `clue_system.md` | Sistema de pistas |
| `tension_clocks.md` | Relogios invisiveis de tensao |
| `player_guide.md` | Guia para jogadores |

Use `!pack summarize` para gerar o resumo canonico que alimenta a IA.
