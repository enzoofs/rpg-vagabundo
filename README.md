# As Cinzas de Valgrin

> Um Dungeon Master que nunca dorme, nunca esquece e nunca perdoa.

Bot Discord que transforma um canal de texto em uma mesa de RPG completa. Uma IA controla o DM, narra cenas, rola dados, gera retratos de NPCs e rastreia tudo o que acontece no mundo — enquanto voce so precisa dizer o que seu personagem faz.

Feito para D&D 5e. Narrado em portugues brasileiro.

---

## O que o bot faz

```
Voce:    !act Examino a porta com cuidado, procurando armadilhas
Bot:     [📜 Narração]
         A madeira esta inchada pela umidade. Seus dedos encontram
         uma fina linha de arame quase invisivel, esticada na altura
         do tornozelo. Alguem nao quer que essa porta seja aberta.
         Proximo turno: @jogador2
```

Ele narra. Ele rola dados com animacao. Ele lembra que voce roubou sal do ferreiro 3 sessoes atras e faz o NPC reagir diferente por causa disso.

---

## Features

### DM por IA
- Narracao automatica com profundidade sensorial
- Respostas concisas (2-4 paragrafos, sem enrolacao)
- Consistencia — nunca troca nomes de locais ou NPCs
- Sistema de pistas em 3 camadas (social, ambiental, consequencia)
- Recap estilo "Previously on..." de serie de TV

### Combate Visual
- Ordem de iniciativa automatica
- NPCs controlados pela IA com taticas proprias
- Animacao de d20 rolando no chat
- **Nat 20** — efeito dourado "ACERTO CRITICO!"
- **Nat 1** — efeito sombrio "FALHA CRITICA!"
- Barras de HP visuais: `[████████░░] 8/10 HP`

### Mundo Vivo
- 6 relogios de ameaca que moldam a narrativa
- Reputacao com faccoes que muda como NPCs reagem
- Economia, patrulhas, toque de recolher
- Clima dinamico (chuva, neve, neblina, cinzas sobrenaturais)
- Ciclo de hora do dia nos embeds
- Heuristicas que atualizam o mundo com base nas suas acoes
- Memoria de NPCs — confianca, medo, flags

### Retratos de NPC
Quando um NPC do canon aparece na narracao, o bot gera um retrato via DALL-E em background. A imagem aparece no chat quando fica pronta, sem travar o jogo.

### Gerenciamento
- Inventario compartilhado do grupo
- Diario de quests
- Ficha de PC resumida
- Save/load de snapshots
- Exportacao da sessao como .txt

---

## Quick Start

```bash
git clone https://github.com/enzoofs/rpg-vagabundo.git
cd rpg-vagabundo
npm install
```

Crie um `.env` (veja `.env.example`):

```
DISCORD_TOKEN=seu_token_do_bot_discord
OPENAI_API_KEY=sua_chave_da_openai
```

No `index.js`, configure os IDs:

```js
const GAME_CHANNEL_ID = 'id_do_canal';
const DM_USER_ID = 'id_do_dm';
```

```bash
node index.js
```

Para pegar IDs: Modo Desenvolvedor no Discord (Configuracoes > Avancado), clique direito > Copiar ID.

---

## Como Jogar

```
DM:         !setup              cria a mesa
Jogadores:  !join               entram (max 2)
DM:         !scene <tom>        define o tom da campanha
DM:         !start              comeca a aventura
Jogador 1:  !act <acao>         descreve o que faz
Jogador 2:  !act <acao>         descreve o que faz
Bot:        narra e avanca      repita!
```

### Comandos principais

| Comando | Quem | O que faz |
|---------|------|-----------|
| `!act <acao>` | Jogador | Descreve sua acao |
| `!pass` | Jogador | Passa o turno |
| `!ask <pergunta>` | Jogador | Pergunta algo ao DM (resposta curta) |
| `!roll <resultado>` | Jogador | Informa resultado de rolagem |
| `!inv` | Todos | Inventario do grupo |
| `!pc sheet` | Jogador | Ficha resumida |
| `!recap` | Todos | Resumo "Previously on..." |
| `!world` | Todos | Estado do mundo completo |
| `!quest` | DM | Diario de quests |
| `!portrait <npc>` | DM | Gera retrato de NPC |
| `!combat start/end` | DM | Controle de combate |
| `!advance day` | DM | Avanca o dia + muda clima |
| `!save/load <nome>` | DM | Snapshots da mesa |
| `!export` | Todos | Exporta sessao como .txt |

Referencia completa: [MANUAL.md](MANUAL.md)

---

## Campaign Pack

Os arquivos em `campaign/` definem o cenario. Edite para criar sua propria campanha:

| Arquivo | Conteudo |
|---------|----------|
| `dm_persona.md` | Personalidade e regras do DM |
| `world_bible.md` | Cenario, faccoes, NPCs, misterios |
| `clue_system.md` | Sistema de pistas |
| `tension_clocks.md` | Relogios invisiveis de tensao |
| `player_guide.md` | Guia para jogadores |

Depois de editar: `!pack reload` → `!pack summarize`

---

## Stack

- **Node.js** (ESM) — runtime
- **discord.js** — integracao Discord
- **OpenAI API** — gpt-5.2 (narrativa) + DALL-E 3 (retratos)
