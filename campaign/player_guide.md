# Player Guide — Como jogar no Discord

## Regras rapidas
- So use `!act` no seu turno.
- Pode rolar dados com Avrae no canal #dados e colar o resultado na sua acao.

## Comandos principais

### Mesa
- `!setup` — inicia uma mesa neste canal
- `!join` — entra como jogador (ate 2)
- `!start` — comeca a aventura (turno do Jogador 1)
- `!scene <tom/guia>` — define o tom da campanha
- `!end` — encerra a mesa

### Acoes
- `!act <acao>` — registra sua acao no seu turno
- `!pass` — passa o turno sem agir

### Combate
- `!combat start` / `!combat end` — inicia ou encerra combate
- `!init <valor>` — registra sua iniciativa
- `!npc add <nome> hp=<n> ac=<n> init=<n>` — adiciona NPC
- `!npc hp <nome> <delta>` — altera HP de NPC (ex: -5 ou +3)
- `!npc list` — lista NPCs vivos
- `!turn` — mostra turno e ordem atual

### Utilidades
- `!help` — ajuda geral (veja tambem `!help combat`, `!help story`, `!help npc`)
- `!pack reload` — recarrega arquivos da campanha
- `!pack summarize` — gera resumo canonico da campanha
- `!pinhelp` — reposta a mensagem de onboarding

## Exemplos

### Exploracao
```
!act Examino a porta com cuidado, procurando armadilhas. Uso Investigacao.
```

### Social
```
!act Me aproximo do taberneiro e pergunto sobre os desaparecimentos, tentando ser persuasivo. "Ouvi dizer que gente anda sumindo por aqui..."
```

### Combate
```
!act Avanco ate o goblin mais proximo e ataco com minha espada longa. (Avrae: !attack "Longsword")
```
