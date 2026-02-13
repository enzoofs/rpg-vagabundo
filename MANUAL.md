# Manual do RPG Bot — As Cinzas de Valgrin

> O DM IA responde **sempre em portugues brasileiro (pt-BR)**. Todos os prompts, narracoes, eventos de mundo e resumos sao gerados em pt-BR.

## Configuracao Inicial

### 1. Variaveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```
DISCORD_TOKEN=seu_token_do_bot_discord
OPENAI_API_KEY=sua_chave_da_openai
```

### 2. IDs no codigo
No `index.js`, substitua:
- `GAME_CHANNEL_ID` — ID do canal do Discord onde a mesa funciona
- `DM_USER_ID` — ID do usuario Discord que sera o DM (so ele pode usar comandos de controle)

Para pegar IDs: ative Modo Desenvolvedor no Discord (Configuracoes > Avancado), clique com direito no canal/usuario > Copiar ID.

### 3. Iniciar o bot
```
npm install
node index.js
```

---

## Fluxo de Jogo

```
1. DM: !setup                    → cria a mesa
2. Jogador 1: !join              → entra na mesa
3. Jogador 2: !join              → entra na mesa
4. DM: !scene <descricao>        → define tom/vibe da campanha
5. DM: !start                    → comeca a aventura (posta onboarding)
6. Jogador 1: !act <acao>        → descreve o que faz
7. Jogador 2: !act <acao>        → descreve o que faz
8. Bot narra automaticamente     → DM IA responde com a cena
9. Repita do passo 6!
```

---

## Comandos — Referencia Rapida

### Todos os jogadores

| Comando | O que faz |
|---------|-----------|
| `!join` | Entra na mesa (max 2 jogadores) |
| `!act <acao>` | Registra sua acao no turno |
| `!pass` | Passa o turno sem agir |
| `!turn` | Mostra de quem e o turno (combate) |
| `!init <valor>` | Registra sua iniciativa (combate) |
| `!ask <pergunta>` | Pergunta algo sobre o ambiente (resposta curta e direta) |
| `!context` | Resumo detalhado da situacao atual |
| `!roll <resultado>` | Informa resultado de rolagem pedida pelo DM |
| `!pc secret <texto>` | Registra motivacao/medo/segredo do seu PC |
| `!pc list` | Mostra segredos registrados |
| `!pc sheet` | Mostra ficha resumida do PC |
| `!inv` | Mostra inventario do grupo |
| `!inv add <item> [xN]` | Adiciona item ao inventario |
| `!inv rm <item> [xN]` | Remove item do inventario |
| `!inv gold <+/-N>` | Ajusta ouro do grupo |
| `!help` | Ajuda geral |
| `!help combat` | Ajuda de combate |
| `!help story` | Ajuda de narrativa |
| `!help npc` | Ajuda de NPCs |
| `!help pack` | Ajuda do campaign pack |
| `!help world` | Ajuda do sistema de mundo |
| `!pinhelp` | Reposta a mensagem de onboarding |
| `!world` | Mostra estado do mundo (clima, hora, ameacas, quests, inventario) |
| `!recap` | Resumo dramatico "Previously on..." |
| `!export` | Exporta sessao como arquivo .txt |

### Apenas o DM

| Comando | O que faz |
|---------|-----------|
| `!setup` | Cria/reseta a mesa (preserva estado do mundo) |
| `!scene <texto>` | Define tom/vibe da campanha |
| `!combat start` | Inicia modo combate |
| `!combat end` | Encerra combate |
| `!npc add <nome> hp=N ac=N init=N [notes=...]` | Adiciona NPC ao combate |
| `!npc hp <nome> <+/-N>` | Altera HP de NPC (mostra barra visual) |
| `!npc list` | Lista NPCs vivos com barras de HP |
| `!npc trust <nome> <+/-N>` | Ajusta confianca do NPC nos PCs |
| `!npc fear <nome> <+/-N>` | Ajusta medo do NPC dos PCs |
| `!npc flag <nome> add <texto>` | Adiciona flag de memoria ao NPC |
| `!npc flag <nome> rm <texto>` | Remove flag de memoria |
| `!npc flag <nome> list` | Lista flags do NPC |
| `!quest add <nome>` | Adiciona quest ao diario |
| `!quest done <nome>` | Marca quest como concluida |
| `!quest rm <nome>` | Remove quest |
| `!quest` | Lista todas as quests |
| `!portrait <nome_npc>` | Gera retrato de NPC via DALL-E |
| `!clock <nome> <+/-N>` | Ajusta relogio de ameaca (0-6) |
| `!advance day [N]` | Avanca dias no mundo + gera evento + muda clima |
| `!rep <faccao> <+/-N>` | Ajusta reputacao com faccao (-10 a +10) |
| `!economy price <val>` | Ajusta indice de precos (0.1-5.0) |
| `!economy scarcity add <item>` | Adiciona item a lista de escassez |
| `!economy scarcity rm <item>` | Remove item da escassez |
| `!economy scarcity list` | Lista itens escassos |
| `!patrol low\|normal\|high\|lockdown` | Ajusta intensidade de patrulha |
| `!patrol curfew on\|off` | Liga/desliga toque de recolher |
| `!flag add <nome>` | Adiciona flag de mundo |
| `!flag rm <nome>` | Remove flag de mundo |
| `!flag list` | Lista flags ativas |
| `!pack reload` | Recarrega arquivos da campanha |
| `!pack summarize` | Gera canon_summary.json via IA |
| `!save <nome>` | Salva snapshot completo da mesa |
| `!save list` | Lista saves disponiveis |
| `!load <nome>` | Carrega um save (restaura mesa inteira) |
| `!end` | Encerra a mesa (apaga tudo, inclusive mundo) |

---

## Sistemas Visuais

### Barras de HP
NPCs em combate mostram barras visuais:
```
Goblin1 [████████░░] 8/10 HP (init 12)
```
Barras se atualizam automaticamente com `!npc hp`.

### Animacao de Dados
Quando o bot rola dados (combate, `!roll`), uma animacao visual de d20 aparece no chat.
- **Nat 20**: efeito dourado especial "ACERTO CRITICO!"
- **Nat 1**: efeito sombrio "FALHA CRITICA!"

### Hora do Dia
O footer de cada narracao mostra o periodo atual:
- Ciclo: amanhecer → manha → tarde → entardecer → noite → madrugada
- Avanca automaticamente a cada narracao
- Reseta para "amanhecer" com `!advance day`

### Clima Dinamico
O clima muda automaticamente com `!advance day`:
- Tipos: ceu limpo, nublado, chuva fina, chuva forte, neblina, neve leve, tempestade, cinzas sobrenaturais
- Corrupcao espiritual alta = mais chance de cinzas e neblina
- O DM IA usa o clima para colorir as narracoes

### Retratos de NPC
Quando um NPC do canon aparece em uma narracao, o bot gera automaticamente um retrato via DALL-E em background. A imagem aparece no chat quando ficar pronta, sem travar o jogo.
- Use `!portrait <nome>` para gerar/re-exibir manualmente

---

## Como Escrever Acoes

Seja descritivo! Diga **O QUE** faz, **COMO** faz e **QUAL** o objetivo.

### Exemplos

**Exploracao:**
```
!act Examino a porta com cuidado, procurando armadilhas. Uso Investigacao.
```

**Social:**
```
!act Me aproximo do taberneiro e pergunto sobre os desaparecimentos.
"Ouvi dizer que gente anda sumindo... sabe de algo?"
```

**Combate:**
```
!act Avanco ate o Goblin1 e ataco com minha espada longa.
(Avrae: 1d20+5 = 17, dano 1d8+3 = 7)
```

**Acao publica (afeta paranoia da vila):**
```
!act Ataco o guarda corrupto na frente de todos na praca #publico
```

### Dica: tag #publico
Adicione `#publico` no final da sua acao se ela acontece em publico (rua, praca, mercado). Isso afeta o relogio de **paranoia da vila**. Acoes privadas (dentro de casas, becos escuros) nao precisam da tag.

---

## Sistema de Combate

### Fluxo
```
1. DM: !combat start
2. Cada jogador: !init <valor>     → (role no Avrae e use o resultado)
3. DM: !npc add <nome> hp=N ac=N init=N
4. Bot anuncia ordem automaticamente quando todos registrarem
5. No seu turno: !act <acao> ou !pass
6. NPCs agem automaticamente (IA + dados + animacao de d20)
7. DM: !npc hp <nome> -N           → mostra barra de HP visual
8. NPC com HP 0 e removido automaticamente
9. DM: !combat end                  → volta ao modo historia
```

### Exemplo completo
```
DM:       !combat start
Jogador1: !init 15
Jogador2: !init 12
DM:       !npc add Goblin1 hp=7 ac=15 init=12
DM:       !npc add Goblin2 hp=7 ac=15 init=8
         → Bot anuncia ordem com barras de HP visuais
Jogador1: !act Ataco o Goblin1 com minha espada (Avrae: 18, dano 7)
DM:       !npc hp Goblin1 -7
         → Goblin1 derrotado! (com efeito visual)
         → Goblin2 age automaticamente (IA + animacao de d20)
Jogador2: !act Ataco o Goblin2...
DM:       !combat end
```

---

## Inventario do Grupo

O grupo compartilha um inventario de itens e ouro.

```
!inv                    → lista inventario
!inv add Pocao de Cura  → adiciona 1 pocao
!inv add Flechas x20    → adiciona 20 flechas
!inv rm Pocao de Cura   → remove 1 pocao
!inv gold +50           → ganha 50 de ouro
!inv gold -10           → gasta 10 de ouro
```

O inventario aparece tambem em `!world` e `!pc sheet`.

---

## Diario de Quests

O DM gerencia as quests ativas da campanha.

```
!quest add Investigar os desaparecimentos
!quest add Encontrar o sal negro
!quest done Investigar os desaparecimentos
!quest                  → lista quests ativas e concluidas
!quest rm <nome>        → remove quest
```

Quests aparecem em `!world` e `!pc sheet`.

---

## Sistema de Mundo (Consequencias Persistentes)

O bot rastreia o estado do mundo de Brumafria automaticamente. Isso influencia como o DM IA narra as cenas.

### Relogios de Ameaca (0 a 6)
Cada relogio mede uma pressao no mundo. Quanto mais alto, mais serio.

| Relogio | O que representa |
|---------|-----------------|
| `ritual_do_veu` | Progresso do ritual do Conclave |
| `fome_e_saque` | Escassez, saques, caos economico |
| `ponte_antiga` | A ponte despertando |
| `confianca_faccoes` | Quanto as faccoes se interessam pelos PCs |
| `paranoia_vila` | Medo e desconfianca da populacao |
| `corrupcao_espiritual` | Presenca sobrenatural no vale |

**Niveis:**
- 0: normal
- 1-2: sinais sutis
- 3-4: tensao crescente
- 5-6: CRITICO — eventos graves acontecem

### Reputacao de Faccoes (-10 a +10)
| Valor | Significado |
|-------|-------------|
| -10 a -7 | Hostil — atacam ou recusam cooperar |
| -6 a -3 | Desconfiada — resistencia, precos altos |
| -2 a +2 | Neutra |
| +3 a +6 | Amigavel — ajuda, informacoes |
| +7 a +10 | Aliada — missoes privadas, protecao |

### Economia
- **Indice de precos**: multiplicador sobre precos normais (1.0 = normal, 2.0 = dobro)
- **Escassez**: itens dificeis de encontrar (ex: comida, lenha, remedio)

### Patrulhas
- `low` — pouca vigilancia
- `normal` — padrao
- `high` — guardas em todo lugar, revistas
- `lockdown` — ninguem entra ou sai sem autorizacao
- **Toque de recolher**: se ativo, sair a noite e arriscado

### Memoria de NPCs
Cada NPC lembra como os PCs agiram:
- **Trust** (-10 a +10): quanto confia nos PCs
- **Fear** (-10 a +10): quanto teme os PCs
- **Flags**: notas especificas ("viu PCs roubando", "foi curado pelos PCs")

### Flags de Mundo
Marcadores de eventos permanentes. Exemplos:
- `capela_fechada` — a capela foi interditada
- `ponte_selada` — os selos da ponte foram restaurados
- `dargan_preso` — o ferreiro foi preso

### Heuristicas Automaticas
Quando jogadores usam `!act`, o bot detecta palavras-chave e atualiza o mundo:

| Acao | Efeito |
|------|--------|
| Violencia publica (#publico) | paranoia +1 |
| Ajudar civis/moradores | paranoia -1 |
| Magia/ritual em local sagrado | corrupcao +1 |
| Magia/sangue na ponte | ponte +1, corrupcao +1 |
| Ajudar Lamina Juramentada | lamina +1, conclave -1 |
| Ajudar Conclave | conclave +1, lamina -1 |
| Roubo/saque de comercio | fome +1 |
| Diplomacia com faccoes/civis | paranoia -1 |
| Purificar/restaurar selos | corrupcao -1 |

Mudancas sao exibidas no canal como `[WORLD] paranoia_vila +1 (violencia publica)`.

### Avancar Dias
Use `!advance day` entre cenas ou sessoes. O bot:
1. Avanca o contador de dia
2. Gera novo clima aleatorio (influenciado pela corrupcao)
3. Reseta o periodo para "amanhecer"
4. Se 2+ dias passaram, avanca relogios por inatividade
5. Gera um evento de mundo narrativo via IA

---

## Campaign Pack

Arquivos em `campaign/` definem a campanha:

| Arquivo | Conteudo |
|---------|----------|
| `dm_persona.md` | Personalidade e regras do DM IA |
| `world_bible.md` | Cenario, faccoes, NPCs, relogios, misterios |
| `clue_system.md` | Sistema de pistas (3 camadas por misterio) |
| `tension_clocks.md` | Relogios invisiveis de tensao dramatica |
| `player_guide.md` | Guia para jogadores |
| `canon_summary.json` | Resumo compacto gerado pelo bot |

### Fluxo de edicao
```
1. Edite os arquivos .md com as informacoes da sua campanha
2. !pack reload       → bot reconhece as mudancas
3. !pack summarize    → gera canon_summary.json via IA
4. Pronto! O resumo e injetado em todos os prompts do DM
```

**Importante:** O DM IA nunca recebe os arquivos brutos — apenas o resumo compacto do `canon_summary.json`. Isso economiza tokens e mantem consistencia.

---

## Persistencia

- Cada mesa salva automaticamente em `data/state_<channelId>.json`
- O estado e salvo apos cada comando (inclui inventario, quests, clima, retratos)
- Na reinicializacao do bot, todas as mesas sao carregadas
- `!setup` preserva o estado do mundo (relogios, faccoes, economia, etc.)
- `!end` apaga tudo, inclusive o estado do mundo

---

## Dicas para o DM

1. **Use `!scene` antes de `!start`** para definir o tom. Ex:
   ```
   !scene Fantasia medieval seria, tom sombrio, pouco humor, combate tatico.
   Os PCs acabaram de chegar em Brumafria.
   ```

2. **Registre segredos dos PCs cedo** com `!pc secret` — o DM IA usa isso para criar ganchos.

3. **Ajuste relogios manualmente** quando algo significativo acontecer fora das heuristicas.

4. **Use `!advance day` entre sessoes** para manter o mundo vivo e mudar o clima.

5. **Use `!recap` no inicio da sessao** — agora com estilo "Previously on..." dramatico.

6. **Monitore `!world` regularmente** — mostra clima, hora, ameacas, inventario e quests tudo junto.

7. **NPC memory e poderosa** — use `!npc trust`, `!npc fear` e `!npc flag` para que o DM IA reaja de forma coerente.

8. **Rode `!pack summarize` depois de editar arquivos da campanha** — o bot precisa do resumo atualizado.

9. **Use `!quest` para rastrear objetivos** — lembre os jogadores quando concluirem quests.

10. **Use `!portrait` se o auto-detect nao gerou** — retratos sao gerados automaticamente quando NPCs do canon aparecem, mas voce pode forcar manualmente.

11. **Use `!export` no final da sessao** — gera um .txt limpo com todo o registro.

---

## Resolucao de Problemas

| Problema | Solucao |
|----------|---------|
| Bot nao responde | Verifique GAME_CHANNEL_ID e se o bot esta online |
| "Apenas o DM pode usar esse comando" | Verifique DM_USER_ID no index.js |
| DM IA incoerente | Rode `!pack summarize` para atualizar o canon |
| Estado perdido apos reiniciar | Verifique se `data/` existe e tem os arquivos .json |
| Bot lento | Normal nas primeiras respostas — a IA precisa processar contexto |
| `!act` nao registra | Verifique se e seu turno (`!turn`) |
| Retrato de NPC nao aparece | Use `!portrait <nome>` manualmente. Verifique se o NPC esta no canon |
| Clima nao muda | Use `!advance day` para gerar novo clima |
