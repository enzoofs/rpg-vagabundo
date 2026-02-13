import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const GAME_CHANNEL_ID = '1471854580882210868';
const DM_USER_ID = '1067562732456525946';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Campaign Pack — carregamento de arquivos
// ---------------------------------------------------------------------------
const CAMPAIGN_DIR = path.join(__dirname, 'campaign');

const pack = {
  dmPersona: '',
  worldBible: '',
  playerGuide: '',
  clueSystem: '',
  tensionClocks: '',
  canonSummary: null, // objeto JSON
};

function loadPackFiles() {
  try {
    pack.dmPersona = fs.readFileSync(path.join(CAMPAIGN_DIR, 'dm_persona.md'), 'utf8');
  } catch { pack.dmPersona = ''; }
  try {
    pack.worldBible = fs.readFileSync(path.join(CAMPAIGN_DIR, 'world_bible.md'), 'utf8');
  } catch { pack.worldBible = ''; }
  try {
    pack.playerGuide = fs.readFileSync(path.join(CAMPAIGN_DIR, 'player_guide.md'), 'utf8');
  } catch { pack.playerGuide = ''; }
  try {
    pack.clueSystem = fs.readFileSync(path.join(CAMPAIGN_DIR, 'clue_system.md'), 'utf8');
  } catch { pack.clueSystem = ''; }
  try {
    pack.tensionClocks = fs.readFileSync(path.join(CAMPAIGN_DIR, 'tension_clocks.md'), 'utf8');
  } catch { pack.tensionClocks = ''; }
  try {
    const raw = fs.readFileSync(path.join(CAMPAIGN_DIR, 'canon_summary.json'), 'utf8');
    pack.canonSummary = JSON.parse(raw);
  } catch { pack.canonSummary = null; }
}

// Carrega no boot
loadPackFiles();

// ---------------------------------------------------------------------------
// Canon Summary — texto compacto para injecao nos prompts
// ---------------------------------------------------------------------------
function canonBlock() {
  if (!pack.canonSummary) return '';
  const c = pack.canonSummary;
  // So inclui secoes que tem conteudo
  const parts = [];
  if (c.tone) parts.push(`Tom: ${c.tone}`);
  if (c.dm_voice_rules?.length) parts.push(`Voz do DM: ${c.dm_voice_rules.join('; ')}`);
  if (c.table_rules?.length) parts.push(`Regras da mesa: ${c.table_rules.join('; ')}`);
  if (c.setting_facts?.length) parts.push(`Fatos do cenario: ${c.setting_facts.join('; ')}`);
  if (c.factions?.length)
    parts.push(`Faccoes: ${c.factions.map((f) => `${f.name} (${f.goal})`).join('; ')}`);
  if (c.npc_index?.length)
    parts.push(`NPCs: ${c.npc_index.map((n) => `${n.name} — ${n.role}`).join('; ')}`);
  if (c.plot_threads?.length)
    parts.push(`Tramas: ${c.plot_threads.map((t) => `${t.name} [${t.status}]`).join('; ')}`);
  if (c.threat_clocks?.length)
    parts.push(`Relogios de ameaca: ${c.threat_clocks.map((t) => `${t.name} [${t.level}]`).join('; ')}`);
  if (c.clue_threads?.length)
    parts.push(`Pistas ativas: ${c.clue_threads.map((t) => `${t.thread}: social=${t.social}; ambiental=${t.environmental}; consequencia=${t.consequence}`).join(' | ')}`);
  if (c.invisible_clocks?.length)
    parts.push(`RELOGIOS INVISIVEIS (nunca revele numeros ao jogador, mostre apenas consequencias): ${c.invisible_clocks.map((t) => `${t.name} [${t.level}] — sinais: ${t.signals}; avanca: ${t.advances}; reduz: ${t.reduces}`).join(' | ')}`);
  if (c.taboos?.length) parts.push(`Tabus: ${c.taboos.join('; ')}`);
  if (c.mechanics?.length) parts.push(`Mecanicas: ${c.mechanics.join('; ')}`);

  if (parts.length === 0) return '';
  return `\nCANON SUMMARY (nunca contradiga):\n${parts.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Guardrails de profundidade narrativa
// ---------------------------------------------------------------------------
const NARRATIVE_GUARDRAILS = `
GUARDRAILS NARRATIVOS (siga sempre):
- IDIOMA: responda SEMPRE em portugues brasileiro (pt-BR). Nunca use ingles, espanhol ou outro idioma.
- TAMANHO: maximo 2-4 paragrafos curtos fora de combate. Seja conciso e impactante — menos e mais.
- NUNCA faca perguntas diretas ao jogador no final (nada de "O que voce faz?", "Voce vai sentar?", listas de opcoes). Apenas narre e diga "Proximo turno: <nome>".
- NUNCA liste opcoes numeradas de escolha. O jogador decide sozinho o que fazer.
- CONSISTENCIA: nunca mude nomes de locais, NPCs ou objetos ja estabelecidos no historico. Se um lugar foi chamado "Javali Palido", NUNCA troque para outro nome. Consulte o historico antes de inventar.
- Toda cena deve ter: (1) detalhe sensorial, (2) reacao do mundo. Sem railroading.

SISTEMA DE PISTAS (3-Clue Rule):
- Cada misterio tem 3 camadas: SOCIAL (conversas/rumores), AMBIENTAL (exploracao/observacao), CONSEQUENCIA (o mundo reage).
- Quando um jogador investigar algo importante, ofereca pelo menos UMA pista nova de qualquer camada.
- Nunca esconda informacao critica atras de um unico teste. Falha revela algo parcial ou cria complicacao — nunca silencio.
- Se os jogadores ignorarem pistas, o mundo avanca: relogios progridem e consequencias revelam a verdade.
- Se os jogadores estiverem perdidos, avance um relogio de ameaca e descreva uma consequencia visivel que funcione como pista.
- Introduza pistas organicamente nas descricoes — nunca como exposicao direta ou "info dump".

RELOGIOS DE AMEACA:
- O mundo nao espera. Falhas, demora e "solucoes faceis" avancam os relogios.
- Mostre sinais antes do desastre (foreshadowing): mudancas ambientais, comportamento de NPCs, rumores novos.

RELOGIOS INVISIVEIS DE TENSAO (Confianca das Faccoes, Paranoia da Vila, Corrupcao Espiritual):
- Estes relogios sao INTERNOS. NUNCA revele numeros, niveis ou o nome do sistema ao jogador.
- Mostre APENAS consequencias narrativas: reacoes de NPCs, clima social, eventos ambientais.
- Avance ou reduza conforme acoes dos PCs (veja Canon Summary para gatilhos especificos).
- Mudancas sutis em 3+; eventos fortes em 6.
- Exemplo: em vez de "Paranoia aumentou", descreva "As janelas se fecham uma a uma quando voces passam."

CANON E INVENCAO:
- Se algo nao esta no Canon Summary, pode inventar, mas adicione "CANON UPDATE: <fato>" no final da sua resposta quando criar fatos permanentes.

CONSEQUENCIAS PERSISTENTES:
- Consulte o WORLD STATE para colorir cenas: precos, patrulhas, comportamento de NPCs, clima social.
- Se um relogio esta CRITICO, reflita urgencia na narracao (eventos visiveis, pressao nos NPCs).
- Use a reputacao das faccoes para calibrar reacoes: faccao hostil recusa cooperar; aliada oferece vantagens.
- Memoria de NPCs importa: se um NPC confia nos PCs, sera mais aberto; se teme, sera evasivo ou hostil.
- Flags de mundo indicam eventos permanentes (capela_fechada, ponte_selada, etc.) — respeite-os na narracao.
- Nunca mostre numeros de relogios, reputacao ou economia ao jogador — apenas consequencias narrativas.

COMBATE:
- Alterne descricao curta com clareza mecanica (quem, onde, quanto).
`.trim();

// ---------------------------------------------------------------------------
// Utilidade: enviar mensagens longas divididas em partes (limite Discord 2000)
// ---------------------------------------------------------------------------
const DISCORD_MAX = 2000;

async function sendLong(channel, text) {
  if (text.length <= DISCORD_MAX) {
    await channel.send(text);
    return;
  }

  const paragraphs = text.split('\n\n');
  let buffer = '';

  for (const para of paragraphs) {
    const piece = buffer ? '\n\n' + para : para;

    if ((buffer + piece).length <= DISCORD_MAX) {
      buffer += piece;
      continue;
    }

    // Flush buffer if it has content
    if (buffer) {
      await channel.send(buffer);
      buffer = '';
    }

    // If the paragraph itself exceeds the limit, split by lines
    if (para.length > DISCORD_MAX) {
      const lines = para.split('\n');
      for (const line of lines) {
        if ((buffer ? buffer + '\n' + line : line).length <= DISCORD_MAX) {
          buffer = buffer ? buffer + '\n' + line : line;
        } else {
          if (buffer) await channel.send(buffer);
          // If a single line exceeds the limit, hard-split
          if (line.length > DISCORD_MAX) {
            let remaining = line;
            while (remaining.length > DISCORD_MAX) {
              const cut = remaining.lastIndexOf(' ', DISCORD_MAX);
              const idx = cut > 0 ? cut : DISCORD_MAX;
              await channel.send(remaining.slice(0, idx));
              remaining = remaining.slice(idx).trimStart();
            }
            buffer = remaining;
          } else {
            buffer = line;
          }
        }
      }
    } else {
      buffer = para;
    }
  }

  if (buffer) await channel.send(buffer);
}

// ---------------------------------------------------------------------------
// Embeds — cores e helpers visuais
// ---------------------------------------------------------------------------
const COLORS = {
  NARRATION:  0x4A3B6B,  // roxo escuro — narracoes do DM
  INTRO:      0x2C2F33,  // quase preto — cena de abertura
  COMBAT:     0xC0392B,  // vermelho — combate
  WORLD:      0x2980B9,  // azul — estado do mundo
  RECAP:      0xF39C12,  // dourado — resumo
  CONTEXT:    0x2C3E50,  // azul escuro — contexto
  ASK:        0x7F8C8D,  // cinza — perguntas
  ROLL:       0x27AE60,  // verde — rolagens
  EVENT:      0xE67E22,  // laranja — eventos de mundo
  HELP:       0x3498DB,  // azul claro — ajuda
  SYSTEM:     0x546E7A,  // cinza escuro — sistema/heuristicas
  SUCCESS:    0x2ECC71,  // verde claro — confirmacoes
  INVENTORY:  0xD4AC0D,  // dourado escuro — inventario
  QUEST:      0x8E44AD,  // roxo — quests
  PORTRAIT:   0x1ABC9C,  // turquesa — retratos de NPC
};

const EMBED_DESC_MAX = 4096;

async function sendEmbed(channel, { color, title, description, fields, footer, thumbnail, image }) {
  if (!description && !fields?.length) {
    await channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(title)] });
    return;
  }

  // Se descricao cabe em um embed
  if (!description || description.length <= EMBED_DESC_MAX) {
    const embed = new EmbedBuilder().setColor(color);
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (footer) embed.setFooter({ text: footer });
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (fields?.length) {
      for (const f of fields) embed.addFields(f);
    }
    await channel.send({ embeds: [embed] });
    return;
  }

  // Descricao longa — dividir em multiplos embeds
  const paragraphs = description.split('\n\n');
  let buffer = '';
  let first = true;

  for (const para of paragraphs) {
    const piece = buffer ? '\n\n' + para : para;

    if ((buffer + piece).length <= EMBED_DESC_MAX) {
      buffer += piece;
      continue;
    }

    if (buffer) {
      const embed = new EmbedBuilder().setColor(color).setDescription(buffer);
      if (first && title) { embed.setTitle(title); first = false; }
      await channel.send({ embeds: [embed] });
      buffer = '';
    }

    buffer = para.length > EMBED_DESC_MAX ? para.slice(0, EMBED_DESC_MAX) : para;
  }

  if (buffer) {
    const embed = new EmbedBuilder().setColor(color).setDescription(buffer);
    if (first && title) embed.setTitle(title);
    if (footer) embed.setFooter({ text: footer });
    if (fields?.length) {
      for (const f of fields) embed.addFields(f);
    }
    await channel.send({ embeds: [embed] });
  }
}

// ---------------------------------------------------------------------------
// Animacao de dados rolando (d20)
// ---------------------------------------------------------------------------
const DICE_FRAMES = [
  '⚀', '⚁', '⚂', '⚃', '⚄', '⚅',
];

async function diceRollAnimation(channel, { label, finalValue, bonus, total, dmg }) {
  const frames = 4;
  const delay = 350;

  // Frame inicial
  const msg = await channel.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.COMBAT)
      .setDescription(`${DICE_FRAMES[0]} **Rolando d20...** ${DICE_FRAMES[0]}`)],
  });

  // Frames de animação
  for (let i = 1; i <= frames; i++) {
    await new Promise(r => setTimeout(r, delay));
    const fakeRoll = Math.floor(Math.random() * 20) + 1;
    const dice = DICE_FRAMES[Math.floor(Math.random() * DICE_FRAMES.length)];
    await msg.edit({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.COMBAT)
        .setDescription(`${dice} **d20 →** \`${fakeRoll}\` ${dice}`)],
    }).catch(() => {});
  }

  // Frame final com resultado real
  await new Promise(r => setTimeout(r, delay));

  const isCrit = finalValue === 20;
  const isFumble = finalValue === 1;

  const resultEmbed = new EmbedBuilder();

  if (isCrit) {
    resultEmbed.setColor(0xFFD700); // dourado
    resultEmbed.setTitle(`💥 ACERTO CRÍTICO! 💥${label ? ` — ${label}` : ''}`);
  } else if (isFumble) {
    resultEmbed.setColor(0x2C2F33); // quase preto
    resultEmbed.setTitle(`💀 FALHA CRÍTICA! 💀${label ? ` — ${label}` : ''}`);
  } else {
    resultEmbed.setColor(COLORS.COMBAT);
    if (label) resultEmbed.setTitle(`⚔️ ${label}`);
  }

  let desc = isCrit
    ? `✨ **d20 →** \`${finalValue}\` ✨`
    : isFumble
      ? `🕳️ **d20 →** \`${finalValue}\` 🕳️`
      : `🎲 **d20 →** \`${finalValue}\``;
  if (bonus !== undefined) desc += ` + ${bonus} = **${total}**`;
  if (dmg !== undefined) desc += `\n💥 Dano: **${dmg}**`;
  if (isCrit) desc += '\n\n⚡ **O golpe encontra seu alvo com precisão devastadora!**';
  if (isFumble) desc += '\n\n😵 **O ataque falha miseravelmente...**';
  resultEmbed.setDescription(desc);

  await msg.edit({ embeds: [resultEmbed] }).catch(() => {});
  return msg;
}

// ---------------------------------------------------------------------------
// Sistema de tempo e clima
// ---------------------------------------------------------------------------
const TIME_CYCLE = ['amanhecer', 'manha', 'tarde', 'entardecer', 'noite', 'madrugada'];
const TIME_EMOJI = {
  amanhecer: '🌅', manha: '☀️', tarde: '🌤️',
  entardecer: '🌇', noite: '🌙', madrugada: '🌑',
};

const WEATHER_TYPES = [
  { id: 'limpo', desc: 'Ceu limpo', emoji: '☀️' },
  { id: 'nublado', desc: 'Nublado e cinzento', emoji: '☁️' },
  { id: 'chuva_fina', desc: 'Chuva fina e persistente', emoji: '🌧️' },
  { id: 'chuva_forte', desc: 'Chuva forte com trovoadas', emoji: '⛈️' },
  { id: 'neblina', desc: 'Neblina espessa', emoji: '🌫️' },
  { id: 'neve_leve', desc: 'Neve leve caindo', emoji: '🌨️' },
  { id: 'tempestade', desc: 'Tempestade de vento e neve', emoji: '❄️' },
  { id: 'cinzas', desc: 'Cinzas sobrenaturais no ar', emoji: '💨' },
];

function randomWeather(corruptionLevel) {
  // Se corrupcao alta, mais chance de cinzas/neblina
  if (corruptionLevel >= 4 && Math.random() < 0.5) {
    return Math.random() < 0.6
      ? WEATHER_TYPES.find(w => w.id === 'cinzas')
      : WEATHER_TYPES.find(w => w.id === 'neblina');
  }
  return WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
}

function advanceTimeOfDay(current) {
  const idx = TIME_CYCLE.indexOf(current);
  return TIME_CYCLE[(idx + 1) % TIME_CYCLE.length];
}

function timeFooter(cs) {
  const emoji = TIME_EMOJI[cs.timeOfDay] || '🕐';
  const wEmoji = cs.weather?.emoji || '';
  return `${emoji} ${cs.timeOfDay.charAt(0).toUpperCase() + cs.timeOfDay.slice(1)} | ${wEmoji} ${cs.weather?.desc || 'Clima normal'} | Dia ${cs.day}`;
}

// ---------------------------------------------------------------------------
// Barra de HP visual
// ---------------------------------------------------------------------------
function hpBar(current, max) {
  const total = 10;
  const filled = Math.max(0, Math.round((current / max) * total));
  return '█'.repeat(filled) + '░'.repeat(total - filled);
}

// ---------------------------------------------------------------------------
// Estado em memoria por canal
// ---------------------------------------------------------------------------
const games = new Map();

function freshCombat() {
  return {
    active: false,
    round: 1,
    order: [],
    index: 0,
    npcs: {},
  };
}

function freshConsequences() {
  return {
    day: 1,
    clocks: {
      ritual_do_veu: 0,
      fome_e_saque: 0,
      ponte_antiga: 0,
      confianca_faccoes: 0,
      paranoia_vila: 0,
      corrupcao_espiritual: 0,
    },
    factions: {
      lamina_juramentada: 0,
      conclave_veu_cinzento: 0,
    },
    economy: {
      priceIndex: 1.0,
      scarcity: [],
    },
    patrols: {
      intensity: 'normal',
      curfew: false,
    },
    npcs: {},   // npcName -> { trust: 0, fear: 0, flags: [] }
    flags: [],  // world flags: "chapel_closed", "bridge_sealed", etc.
    weather: { id: 'chuva_fina', desc: 'Chuva fina e persistente', emoji: '🌧️' },
    timeOfDay: 'entardecer', // amanhecer, manha, tarde, entardecer, noite, madrugada
  };
}

function freshGame() {
  return {
    players: [],
    turnIndex: 0,
    pendingActions: new Map(),
    log: [],
    scene: null,
    opened: false,
    combat: freshCombat(),
    pcSecrets: {},
    consequences: freshConsequences(),
    inventory: { items: [], gold: 0 },
    quests: [],       // { name, status: 'active'|'done' }
    portraits: {},    // npcName -> imageUrl (gerados por DALL-E)
  };
}

function ensureGame(channelId) {
  if (!games.has(channelId)) {
    games.set(channelId, freshGame());
  }
  return games.get(channelId);
}

// ---------------------------------------------------------------------------
// Persistencia — data/state_<channelId>.json (por canal)
// ---------------------------------------------------------------------------
function stateFilePath(channelId) {
  return path.join(DATA_DIR, `state_${channelId}.json`);
}

function serializeGame(game) {
  return JSON.stringify({
    players: game.players,
    turnIndex: game.turnIndex,
    pendingActions: [...game.pendingActions.entries()],
    log: game.log.slice(-100),
    scene: game.scene,
    opened: game.opened || false,
    combat: game.combat,
    pcSecrets: game.pcSecrets || {},
    consequences: game.consequences || freshConsequences(),
    inventory: game.inventory || { items: [], gold: 0 },
    quests: game.quests || [],
    portraits: game.portraits || {},
  }, null, 2);
}

function deserializeGame(json) {
  const data = JSON.parse(json);
  const game = freshGame();
  game.players = data.players || [];
  game.turnIndex = data.turnIndex || 0;
  game.pendingActions = new Map(data.pendingActions || []);
  game.log = data.log || [];
  game.scene = data.scene || null;
  game.opened = data.opened || false;
  game.pcSecrets = data.pcSecrets || {};
  if (data.combat) {
    game.combat = {
      active: data.combat.active || false,
      round: data.combat.round || 1,
      order: data.combat.order || [],
      index: data.combat.index || 0,
      npcs: data.combat.npcs || {},
    };
  }
  if (data.consequences) {
    const fresh = freshConsequences();
    game.consequences = {
      ...fresh,
      ...data.consequences,
      clocks: { ...fresh.clocks, ...(data.consequences.clocks || {}) },
      factions: { ...fresh.factions, ...(data.consequences.factions || {}) },
      economy: { ...fresh.economy, ...(data.consequences.economy || {}) },
      patrols: { ...fresh.patrols, ...(data.consequences.patrols || {}) },
      weather: data.consequences.weather || fresh.weather,
      timeOfDay: data.consequences.timeOfDay || fresh.timeOfDay,
    };
  }
  game.inventory = data.inventory || { items: [], gold: 0 };
  game.quests = data.quests || [];
  game.portraits = data.portraits || {};
  return game;
}

function saveGame(channelId, game) {
  try {
    fs.writeFileSync(stateFilePath(channelId), serializeGame(game), 'utf8');
  } catch (err) {
    console.error(`Erro ao salvar state_${channelId}.json:`, err.message);
  }
}

function loadAllGames() {
  // Migrar savegame.json antigo se existir
  const oldSave = path.join(__dirname, 'savegame.json');
  if (fs.existsSync(oldSave)) {
    try {
      const raw = fs.readFileSync(oldSave, 'utf8');
      const obj = JSON.parse(raw);
      for (const [channelId, data] of Object.entries(obj)) {
        const game = deserializeGame(JSON.stringify(data));
        games.set(channelId, game);
        saveGame(channelId, game);
      }
      fs.renameSync(oldSave, oldSave + '.bak');
      console.log('Migrado savegame.json -> data/. Backup criado.');
    } catch (err) {
      console.error('Erro ao migrar savegame.json:', err.message);
    }
  }

  // Carregar todos os state files
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('state_') && f.endsWith('.json'));
    for (const file of files) {
      const channelId = file.slice('state_'.length, -'.json'.length);
      if (games.has(channelId)) continue;
      try {
        const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
        games.set(channelId, deserializeGame(raw));
      } catch (err) {
        console.error(`Erro ao carregar ${file}:`, err.message);
      }
    }
  } catch { /* data/ vazio ou inexistente */ }

  console.log(`State carregado: ${games.size} mesa(s).`);
}

// Carrega state no boot
loadAllGames();

function currentPlayerId(game) {
  return game.players[game.turnIndex % game.players.length];
}

// ---------------------------------------------------------------------------
// Dice helpers
// ---------------------------------------------------------------------------
function d20() {
  return Math.floor(Math.random() * 20) + 1;
}

function rollDice(sides, count = 1) {
  let total = 0;
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
  return total;
}

// ---------------------------------------------------------------------------
// Combat order helpers
// ---------------------------------------------------------------------------
function sortCombatOrder(order) {
  order.sort((a, b) => {
    if (b.init !== a.init) return b.init - a.init;
    if (a.type !== b.type) return a.type === 'player' ? -1 : 1;
    return 0;
  });
}

function currentCombatEntry(game) {
  const c = game.combat;
  if (c.order.length === 0) return null;
  return c.order[c.index % c.order.length];
}

function advanceCombatTurn(game) {
  const c = game.combat;
  c.index++;
  if (c.index >= c.order.length) {
    c.index = 0;
    c.round++;
  }
  return currentCombatEntry(game);
}

function formatOrder(game) {
  const c = game.combat;
  return c.order
    .map((e, i) => {
      const marker = i === c.index ? '\u27a4 ' : '  ';
      if (e.type === 'player') return `${marker}<@${e.id}> (init ${e.init})`;
      const npc = c.npcs[e.name];
      if (!npc) return `${marker}${e.name} (derrotado)`;
      const bar = hpBar(npc.hp, npc.maxHp);
      return `${marker}${e.name} \`[${bar}]\` ${npc.hp}/${npc.maxHp} HP (init ${e.init})`;
    })
    .join('\n');
}

function allPlayersHaveInit(game) {
  const c = game.combat;
  return game.players.every((pid) =>
    c.order.some((e) => e.type === 'player' && e.id === pid),
  );
}

function hasNpcInOrder(game) {
  return game.combat.order.some((e) => e.type === 'npc');
}

function removeNpcFromOrder(game, name) {
  const c = game.combat;
  const idx = c.order.findIndex((e) => e.type === 'npc' && e.name === name);
  if (idx < 0) return;
  c.order.splice(idx, 1);
  if (c.order.length === 0) {
    c.index = 0;
  } else if (idx < c.index) {
    c.index--;
  } else if (c.index >= c.order.length) {
    c.index = 0;
    c.round++;
  }
}

// ---------------------------------------------------------------------------
// Parse NPC add arguments
// ---------------------------------------------------------------------------
function parseNpcArgs(tokens) {
  const name = tokens[0];
  if (!name) return null;

  let hp = null;
  let ac = null;
  let init = null;
  let notes = '';

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    const low = t.toLowerCase();
    if (low.startsWith('hp=')) hp = parseInt(t.slice(3));
    else if (low.startsWith('ac=')) ac = parseInt(t.slice(3));
    else if (low.startsWith('init=')) init = parseInt(t.slice(5));
    else if (low.startsWith('notes=')) notes = t.slice(6);
  }

  if (!name || hp == null || ac == null || init == null) return null;
  if (isNaN(hp) || isNaN(ac) || isNaN(init)) return null;
  return { name, hp, ac, init, notes };
}

// ---------------------------------------------------------------------------
// AI: DM narrador (modo historia) — com canon + guardrails
// ---------------------------------------------------------------------------
function pcSecretsBlock(game) {
  if (!game.pcSecrets || Object.keys(game.pcSecrets).length === 0) return '';
  const lines = Object.entries(game.pcSecrets)
    .map(([pid, text]) => `<@${pid}>: ${text}`)
    .join('\n');
  return `\nSEGREDOS DOS PCs (use para motivar NPCs, criar tensao, oferecer ganchos — nunca revele diretamente):\n${lines}\n`;
}

// ---------------------------------------------------------------------------
// World State — bloco descritivo para injecao nos prompts (sem numeros)
// ---------------------------------------------------------------------------
function worldStateBlock(game) {
  const cs = game.consequences;
  if (!cs) return '';

  const parts = [];
  parts.push(`Dia ${cs.day} no vale. Periodo: ${cs.timeOfDay}. Clima: ${cs.weather?.desc || 'normal'}.`);

  // Clocks — descritivo
  const clockDescs = [];
  for (const [name, level] of Object.entries(cs.clocks)) {
    if (level === 0) continue;
    const label = name.replace(/_/g, ' ');
    if (level <= 2) clockDescs.push(`${label}: sinais sutis`);
    else if (level <= 4) clockDescs.push(`${label}: tensao crescente`);
    else clockDescs.push(`${label}: CRITICO`);
  }
  if (clockDescs.length) parts.push(`Ameacas: ${clockDescs.join('; ')}.`);

  // Faccoes — descritivo
  const facDescs = [];
  for (const [name, rep] of Object.entries(cs.factions)) {
    const label = name.replace(/_/g, ' ');
    if (rep <= -7) facDescs.push(`${label}: hostil aos PCs`);
    else if (rep <= -3) facDescs.push(`${label}: desconfiada`);
    else if (rep >= 7) facDescs.push(`${label}: aliada dos PCs`);
    else if (rep >= 3) facDescs.push(`${label}: amigavel`);
    else facDescs.push(`${label}: neutra`);
  }
  parts.push(`Faccoes: ${facDescs.join('; ')}.`);

  // Economia
  if (cs.economy.priceIndex > 1.2)
    parts.push(`Economia: precos inflacionados.`);
  if (cs.economy.scarcity.length)
    parts.push(`Escassez: ${cs.economy.scarcity.join(', ')}.`);

  // Patrulhas
  if (cs.patrols.intensity !== 'normal')
    parts.push(`Patrulhas: ${cs.patrols.intensity}.`);
  if (cs.patrols.curfew)
    parts.push('Toque de recolher ativo.');

  // Memoria de NPCs
  const npcDescs = [];
  for (const [name, mem] of Object.entries(cs.npcs)) {
    const traits = [];
    if (mem.trust > 3) traits.push('confia nos PCs');
    else if (mem.trust < -3) traits.push('desconfia dos PCs');
    if (mem.fear > 3) traits.push('teme os PCs');
    if (mem.flags?.length) traits.push(mem.flags.join(', '));
    if (traits.length) npcDescs.push(`${name}: ${traits.join('; ')}`);
  }
  if (npcDescs.length) parts.push(`NPCs: ${npcDescs.join(' | ')}.`);

  // Flags de mundo
  if (cs.flags.length)
    parts.push(`Eventos ativos: ${cs.flags.join(', ')}.`);

  return `\nWORLD STATE (use para colorir narracoes e reacoes — nunca mostre numeros):\n${parts.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Heuristicas — atualiza consequencias com base em keywords da acao
// ---------------------------------------------------------------------------
function applyHeuristics(game, actionText, isPublic) {
  const cs = game.consequences;
  const text = actionText.toLowerCase();
  const changes = [];

  const has = (re) => re.test(text);
  const violence = /\b(atac|mat|sangue|lut|golpe|espada|flecha|fogo|explos|feri|decapit|execut)\w*/i;
  const help = /\b(ajud|proteg|cur|distribu|acalm|consol|defend|socorr|acolh|ampar)\w*/i;
  const civTarget = /\b(vila|povo|morador|civil|crianca|ferido|famili|refugiad|mendigo)\w*/i;
  const sacredPlace = /\b(capela|templo|altar|cripta|catacumba)\w*/i;
  const magicAct = /\b(ritual|invoca|conjur|necroman|magia negra|sacrific|canaliz|lanc.*magia)\w*/i;
  const bridgeAct = /\b(ponte|runa|selo|gravar|sangue.*runa|runa.*sangue)\w*/i;
  const laminaRef = /\b(lamina|guarnicao|capita|irena|kald|baronato|soldado|patrulh)\w*/i;
  const conclaveRef = /\b(conclave|veu cinzento|mavra|irma mavra|acolito|culto)\w*/i;
  const factionHelp = /\b(ajud|entreg|inform|alian|cooper|defend|proteg|serv|apoi)\w*/i;
  const econStress = /\b(roub|saqu|furto|incendi|destru|queimar).*\b(loja|estoque|mercado|armazem|carregamento)\w*/i;
  const econBuy = /\b(compr|acumul|estoc).*\b(tudo|todo|grande quantidade|estoque inteiro)\w*/i;
  const diplomacy = /\b(negoci|diplomat|paz|acordo|promessa|trato|media|convenc|persuad)\w*/i;
  const purify = /\b(purific|restaur|benc|consagr|reforc.*selo|reparar.*selo|limpar.*corrupc)\w*/i;

  // Violencia publica -> paranoia sobe (so se marcado #publico ou combate)
  if (has(violence) && isPublic) {
    cs.clocks.paranoia_vila = Math.min(6, cs.clocks.paranoia_vila + 1);
    changes.push('paranoia_vila +1 (violencia publica)');
  }

  // Ajudar civis diretamente -> paranoia desce (precisa menção a civis)
  if (has(help) && has(civTarget)) {
    cs.clocks.paranoia_vila = Math.max(0, cs.clocks.paranoia_vila - 1);
    changes.push('paranoia_vila -1 (ajuda a civis)');
  }

  // Magia/ritual em local sagrado -> corrupcao espiritual sobe
  if (has(sacredPlace) && has(magicAct)) {
    cs.clocks.corrupcao_espiritual = Math.min(6, cs.clocks.corrupcao_espiritual + 1);
    changes.push('corrupcao_espiritual +1 (magia em local sagrado)');
  }

  // Interacao com a ponte + magia/sangue -> ponte acorda + corrupcao
  if (has(bridgeAct) && has(magicAct)) {
    cs.clocks.ponte_antiga = Math.min(6, cs.clocks.ponte_antiga + 1);
    cs.clocks.corrupcao_espiritual = Math.min(6, cs.clocks.corrupcao_espiritual + 1);
    changes.push('ponte_antiga +1, corrupcao_espiritual +1 (magia na ponte)');
  }

  // Ajudar Lamina Juramentada (referencia + acao de ajuda)
  if (has(laminaRef) && has(factionHelp)) {
    cs.factions.lamina_juramentada = Math.min(10, cs.factions.lamina_juramentada + 1);
    cs.factions.conclave_veu_cinzento = Math.max(-10, cs.factions.conclave_veu_cinzento - 1);
    cs.clocks.confianca_faccoes = Math.min(6, cs.clocks.confianca_faccoes + 1);
    changes.push('lamina +1, conclave -1');
  }

  // Ajudar Conclave (referencia + acao de ajuda)
  if (has(conclaveRef) && has(factionHelp)) {
    cs.factions.conclave_veu_cinzento = Math.min(10, cs.factions.conclave_veu_cinzento + 1);
    cs.factions.lamina_juramentada = Math.max(-10, cs.factions.lamina_juramentada - 1);
    cs.clocks.confianca_faccoes = Math.min(6, cs.clocks.confianca_faccoes + 1);
    changes.push('conclave +1, lamina -1');
  }

  // Roubo/saque de comercio OU compra em massa -> pressao economica
  if (has(econStress) || has(econBuy)) {
    cs.economy.priceIndex = Math.round(Math.min(3.0, cs.economy.priceIndex + 0.1) * 10) / 10;
    cs.clocks.fome_e_saque = Math.min(6, cs.clocks.fome_e_saque + 1);
    changes.push('fome_e_saque +1 (pressao economica)');
  }

  // Diplomacia com faccoes ou NPCs -> paranoia desce
  if (has(diplomacy) && (has(laminaRef) || has(conclaveRef) || has(civTarget))) {
    cs.clocks.paranoia_vila = Math.max(0, cs.clocks.paranoia_vila - 1);
    changes.push('paranoia_vila -1 (diplomacia)');
  }

  // Purificar / restaurar selos -> corrupcao desce
  if (has(purify)) {
    cs.clocks.corrupcao_espiritual = Math.max(0, cs.clocks.corrupcao_espiritual - 1);
    changes.push('corrupcao_espiritual -1 (purificacao)');
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Gerador de eventos de mundo (avanco de dia)
// ---------------------------------------------------------------------------
async function generateWorldEvent(game) {
  const cs = game.consequences;
  const canon = canonBlock();
  const worldState = worldStateBlock(game);

  const prompt = `
Baseado no estado atual do mundo, gere UM evento curto (2-3 frases) que acontece "off-screen" e sera percebido pelos personagens.
O evento deve refletir as consequencias das acoes dos PCs e o avanco dos relogios.
Responda APENAS com o texto narrativo do evento, sem marcacao, sem explicacao.
${canon}${worldState}
Dia atual: ${cs.day}
`.trim();

  const resp = await openai.responses.create({
    model: 'gpt-5.2',
    input: [
      { role: 'system', content: 'Voce gera eventos de mundo para D&D 5e em portugues brasileiro (pt-BR). Tom serio, medieval, consequencias reais. Maximo 3 frases.' },
      { role: 'user', content: prompt },
    ],
  });

  return resp.output_text ?? '(sem evento)';
}

// ---------------------------------------------------------------------------
// Retratos de NPC — DALL-E (assincrono, nao bloqueia jogo)
// ---------------------------------------------------------------------------
function getNpcDescriptionFromCanon(npcName) {
  if (!pack.canonSummary?.npc_index) return null;
  const npc = pack.canonSummary.npc_index.find(
    n => n.name.toLowerCase() === npcName.toLowerCase()
  );
  if (!npc) return null;
  return `${npc.name} — ${npc.role}${npc.secret ? '. ' + npc.secret : ''}`;
}

async function generateNpcPortrait(channel, game, npcName) {
  // Nao gera duplicata
  if (game.portraits[npcName]) return;
  game.portraits[npcName] = 'generating';

  const desc = getNpcDescriptionFromCanon(npcName);
  if (!desc) { delete game.portraits[npcName]; return; }

  try {
    const prompt = `Fantasy medieval character portrait: ${desc}. Dark, atmospheric, painted style, D&D character art, somber tones, muted colors, professional illustration. No text or lettering.`;
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
    });
    const imageUrl = response.data[0].url;
    game.portraits[npcName] = imageUrl;

    await sendEmbed(channel, {
      color: COLORS.PORTRAIT,
      title: `🎨 ${npcName}`,
      image: imageUrl,
    });
  } catch (err) {
    console.error(`Erro ao gerar retrato de ${npcName}:`, err.message);
    delete game.portraits[npcName];
  }
}

function detectAndGeneratePortraits(channel, game, text) {
  if (!pack.canonSummary?.npc_index) return;
  for (const npc of pack.canonSummary.npc_index) {
    if (game.portraits[npc.name]) continue; // ja gerado ou em andamento
    if (text.includes(npc.name)) {
      // Gera em background — nao bloqueia
      generateNpcPortrait(channel, game, npc.name).catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// Opening Scene — cena de abertura narrada pela IA no !start
// ---------------------------------------------------------------------------
async function dmOpeningScene(game) {
  const canon = canonBlock();
  const worldState = worldStateBlock(game);
  const scene = game.scene ? `\nGUIA DA CAMPANHA:\n${game.scene}\n` : '';
  const playerNames = game.players.map(id => `<@${id}>`).join(' e ');

  const system = `
Voce e um Dungeon Master (DM) de D&D 5e em portugues brasileiro (pt-BR).
Sua tarefa e narrar a CENA DE ABERTURA da campanha.

INSTRUCOES:
- Use o Canon Summary e o cenario para descrever a chegada dos personagens ao Vale de Brumafria.
- Introduza o clima, o local, a tensao e pelo menos um detalhe sensorial marcante.
- Apresente brevemente 1-2 NPCs visiveis na cena (sem revelar segredos).
- Nao controle as acoes dos jogadores — apenas descreva o que eles veem, ouvem e sentem.
- Termine com "Proximo turno: ${playerNames.split(' e ')[0]}" para indicar quem age primeiro.
- Tom: serio, cinematico, imersivo. Sem humor. Sem meta-jogo.
- Maximo 4-6 paragrafos.
${canon}${worldState}${scene}
${NARRATIVE_GUARDRAILS}
`.trim();

  const resp = await openai.responses.create({
    model: 'gpt-5.2',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: `Narre a cena de abertura da campanha. Os jogadores sao: ${playerNames}. Dia ${game.consequences.day}.` },
    ],
  });

  return resp.output_text ?? '(sem cena de abertura)';
}

async function dmNarrate(game) {
  const recentLog = game.log.slice(-20).join('\n');
  const scene = game.scene ? `\nGUIA DA CAMPANHA:\n${game.scene}\n` : '';
  const canon = canonBlock();
  const secrets = pcSecretsBlock(game);
  const worldState = worldStateBlock(game);

  const system = `
Voce e um Dungeon Master (DM) de D&D 5e em portugues brasileiro (pt-BR).
Regras:
- Nunca controle os personagens dos jogadores.
- Seja CONCISO: 2-4 paragrafos curtos. Nao escreva textos longos.
- Nao faca perguntas ao jogador. Nao liste opcoes. Apenas narre a cena e termine com "Proximo turno: <nome>".
- Peca rolagens quando necessario (o Avrae rola no Discord).
- NUNCA mude nomes de locais, NPCs ou objetos ja mencionados no historico.
- No fim, diga APENAS: "Proximo turno: <@ID>". Nada mais depois disso.
${canon}${secrets}${worldState}${scene}
${NARRATIVE_GUARDRAILS}
`.trim();

  const input = `
HISTORICO (resumo recente):
${recentLog}

ACOES DESTA RODADA:
${game.players
  .map(
    (pid, i) =>
      `Jogador ${i + 1} (<@${pid}>): ${game.pendingActions.get(pid) || '(sem acao)'}`,
  )
  .join('\n')}

Agora narre a continuacao da cena e diga o proximo turno.
`.trim();

  const resp = await openai.responses.create({
    model: 'gpt-5.2',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ],
  });

  return resp.output_text ?? '(sem texto)';
}

// ---------------------------------------------------------------------------
// !ask — resposta direta e curta sobre o ambiente
// ---------------------------------------------------------------------------
async function dmAsk(game, question) {
  const recentLog = game.log.slice(-15).join('\n');
  const canon = canonBlock();
  const worldState = worldStateBlock(game);

  const system = `
Voce e um Dungeon Master de D&D 5e em portugues brasileiro (pt-BR).
O jogador esta fazendo uma PERGUNTA sobre o ambiente, a cena ou o que ele percebe.

REGRAS RIGIDAS:
- Responda de forma DIRETA e CURTA: 1-3 frases no maximo.
- Descreva apenas o que o personagem pode ver, ouvir, cheirar ou sentir.
- Se a informacao exigir teste, diga qual teste e a CD.
- NAO narre acoes do personagem. NAO avance a cena. NAO diga "Proximo turno".
- NAO liste opcoes. NAO faca perguntas de volta.
- NUNCA mude nomes ja estabelecidos no historico.
${canon}${worldState}
`.trim();

  const resp = await openai.responses.create({
    model: 'gpt-5.2',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: `HISTORICO RECENTE:\n${recentLog}\n\nPERGUNTA DO JOGADOR: ${question}` },
    ],
  });

  return resp.output_text ?? '(sem resposta)';
}

// ---------------------------------------------------------------------------
// !context — resumo detalhado da situacao atual
// ---------------------------------------------------------------------------
async function dmContext(game) {
  const recentLog = game.log.slice(-30).join('\n');
  const canon = canonBlock();
  const worldState = worldStateBlock(game);
  const secrets = pcSecretsBlock(game);

  const system = `
Voce e um Dungeon Master de D&D 5e em portugues brasileiro (pt-BR).
O jogador pediu um RESUMO DA SITUACAO ATUAL.

REGRAS:
- Descreva onde os PCs estao, o que acabou de acontecer, quem esta presente e qual a tensao da cena.
- Maximo 2-3 paragrafos.
- Inclua detalhes sensoriais relevantes e o clima emocional.
- NAO avance a cena. NAO diga "Proximo turno". NAO liste opcoes.
- NUNCA mude nomes ja estabelecidos no historico.
${canon}${secrets}${worldState}
`.trim();

  const resp = await openai.responses.create({
    model: 'gpt-5.2',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: `HISTORICO RECENTE:\n${recentLog}\n\nDescreva a situacao atual dos personagens.` },
    ],
  });

  return resp.output_text ?? '(sem contexto)';
}

// ---------------------------------------------------------------------------
// !roll — resolve uma rolagem pedida pelo DM
// ---------------------------------------------------------------------------
async function dmResolveRoll(game, playerId, rollText) {
  const recentLog = game.log.slice(-20).join('\n');
  const canon = canonBlock();
  const worldState = worldStateBlock(game);
  const secrets = pcSecretsBlock(game);

  const system = `
Voce e um Dungeon Master de D&D 5e em portugues brasileiro (pt-BR).
O jogador acabou de informar o resultado de uma rolagem que voce pediu.

REGRAS RIGIDAS:
- Resolva a acao com base no resultado da rolagem.
- Seja CONCISO: 1-3 paragrafos curtos.
- Descreva o que acontece (sucesso, falha ou sucesso parcial) de forma narrativa.
- NAO faca novas perguntas. NAO liste opcoes.
- NUNCA mude nomes ja estabelecidos no historico.
- Termine com "Proximo turno: <@ID>" indicando quem age em seguida.
${canon}${secrets}${worldState}
${NARRATIVE_GUARDRAILS}
`.trim();

  const nextPlayer = game.players.find(p => p !== playerId) || playerId;

  const resp = await openai.responses.create({
    model: 'gpt-5.2',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: `HISTORICO RECENTE:\n${recentLog}\n\nRESULTADO DA ROLAGEM de <@${playerId}>: ${rollText}\n\nResolva a acao e diga "Proximo turno: <@${nextPlayer}>".` },
    ],
  });

  return resp.output_text ?? '(sem resolucao)';
}

// ---------------------------------------------------------------------------
// AI: turno de NPC (modo combate) — com canon + guardrails
// ---------------------------------------------------------------------------
async function npcTurnAI(game, npcEntry) {
  const c = game.combat;
  const npc = c.npcs[npcEntry.name];
  const scene = game.scene ? `\nGUIA DA CAMPANHA:\n${game.scene}\n` : '';
  const canon = canonBlock();
  const secrets = pcSecretsBlock(game);
  const worldState = worldStateBlock(game);
  const recentLog = game.log.slice(-12).join('\n');

  const npcList = Object.values(c.npcs)
    .map((n) => `${n.name}: HP=${n.hp}, AC=${n.ac}${n.notes ? ', ' + n.notes : ''}`)
    .join('\n');

  const pcList = game.players
    .map((pid, i) => `Jogador ${i + 1}: <@${pid}>`)
    .join('\n');

  const system = `
Voce e o assistente de turno de NPC em combate D&D 5e em portugues brasileiro (pt-BR).
Voce controla o NPC "${npcEntry.name}" (HP=${npc.hp}, AC=${npc.ac}${npc.notes ? ', ' + npc.notes : ''}).
Escreva UMA acao curta e tatica: escolha alvo entre os jogadores, descreva ataque ou acao.
Responda em 2-3 frases no maximo. Tom de narracao de mesa.
Nao role dados — os resultados mecanicos serao adicionados automaticamente.
${canon}${secrets}${worldState}${scene}
${NARRATIVE_GUARDRAILS}
`.trim();

  const input = `
ROUND ${c.round}
ORDEM DE INICIATIVA:
${formatOrder(game)}

NPCs VIVOS:
${npcList}

JOGADORES:
${pcList}

HISTORICO RECENTE:
${recentLog}

Descreva a acao de ${npcEntry.name} neste turno.
`.trim();

  const resp = await openai.responses.create({
    model: 'gpt-5.2',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ],
  });

  return resp.output_text ?? '(sem texto)';
}

// ---------------------------------------------------------------------------
// Executar turnos consecutivos de NPC e parar no proximo player
// ---------------------------------------------------------------------------
async function runNpcTurns(channel, game) {
  const c = game.combat;
  let safety = 0;

  while (c.order.length > 0 && safety < c.order.length + 2) {
    const entry = currentCombatEntry(game);
    if (!entry || entry.type !== 'npc') break;
    safety++;

    const npc = c.npcs[entry.name];
    if (!npc) {
      advanceCombatTurn(game);
      continue;
    }

    const aiText = await npcTurnAI(game, entry);

    const attackBonus = 4;
    const atkRoll = d20();
    const totalAtk = atkRoll + attackBonus;
    const dmgRoll = rollDice(6) + 2;

    // Animação de dados rolando
    await diceRollAnimation(channel, {
      label: `${entry.name} — Round ${c.round}`,
      finalValue: atkRoll,
      bonus: attackBonus,
      total: totalAtk,
      dmg: dmgRoll,
    });

    // Narração do turno
    await sendEmbed(channel, {
      color: COLORS.COMBAT,
      title: `⚔️ ${entry.name}`,
      description: aiText,
    });
    game.log.push(`DM (${entry.name}): ${aiText} [Atk ${totalAtk}, Dmg ${dmgRoll}]`);

    advanceCombatTurn(game);
  }

  const next = currentCombatEntry(game);
  if (next && next.type === 'player') {
    await sendEmbed(channel, {
      color: COLORS.COMBAT,
      description: `🎲 **Round ${c.round}** | Turno: <@${next.id}> — use \`!act <acao>\` ou \`!pass\`.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Checar se a ordem esta pronta e iniciar combate se sim
// ---------------------------------------------------------------------------
async function tryStartCombatOrder(channel, game) {
  const c = game.combat;
  if (!allPlayersHaveInit(game) || !hasNpcInOrder(game)) {
    const missing = game.players.filter(
      (pid) => !c.order.some((e) => e.type === 'player' && e.id === pid),
    );
    const npcCount = c.order.filter((e) => e.type === 'npc').length;
    const parts = [];
    if (missing.length > 0)
      parts.push(`Falta iniciativa: ${missing.map((id) => `<@${id}>`).join(', ')}`);
    if (npcCount === 0) parts.push('Nenhum NPC adicionado ainda.');
    if (parts.length > 0) await channel.send(parts.join('\n'));
    return;
  }

  sortCombatOrder(c.order);
  c.index = 0;
  c.round = 1;

  await sendEmbed(channel, {
    color: COLORS.COMBAT,
    title: '⚔️ Ordem de Iniciativa',
    description: formatOrder(game),
  });

  const first = currentCombatEntry(game);
  if (first.type === 'player') {
    await sendEmbed(channel, {
      color: COLORS.COMBAT,
      description: `🎲 **Round ${c.round}** | Turno: <@${first.id}> — use \`!act <acao>\` ou \`!pass\`.`,
    });
  } else {
    await runNpcTurns(channel, game);
  }
}

// ---------------------------------------------------------------------------
// Onboarding message (postada pelo !start e !pinhelp)
// ---------------------------------------------------------------------------
const ONBOARDING_MSG = `**Ordem dos turnos**
Cada jogador age na sua vez. O bot avisa quem e o proximo com \`Proximo turno: @nome\`.

**Como escrever acoes**
Use \`!act <sua acao>\` no seu turno. Seja descritivo!
- Diga O QUE faz, COMO faz, e QUAL o objetivo.
- Se precisar de rolagem, o DM vai pedir.

**Rolando dados com Avrae**
Use o Avrae no canal de dados e cole o resultado na sua acao.
Ex: \`!r 1d20+5\` no Avrae, depois \`!act Ataco o goblin com minha espada (resultado: 18)\`

**Exemplos prontos**

\`!act Examino a porta com cuidado, procurando armadilhas. Uso Investigacao.\`

\`!act Me aproximo do taberneiro e pergunto sobre os desaparecimentos. "Ouvi dizer que gente anda sumindo..."\`

\`!act Avanco ate o goblin mais proximo e ataco com minha espada longa. (Avrae: 1d20+5 = 17, dano 1d8+3 = 7)\`

**Ajuda**
\`!help\` — geral | \`!help combat\` — combate | \`!help story\` — narrativa | \`!help npc\` — NPCs | \`!help pack\` — campanha`;

// ---------------------------------------------------------------------------
// Help texts
// ---------------------------------------------------------------------------
const HELP_MAIN = `**Comandos — Visao geral**

\`!help combat\` — comandos de combate
\`!help story\` — comandos de narrativa e mesa
\`!help npc\` — gerenciamento de NPCs
\`!help pack\` — campaign pack e arquivos
\`!help world\` — estado do mundo e consequencias

**Acoes**
- \`!act <acao>\` — registra sua acao (combate ou exploracao)
- \`!pass\` — passa o turno
- \`!turn\` — mostra turno e ordem atual
- \`!ask <pergunta>\` — pergunta algo sobre o ambiente (resposta curta)
- \`!context\` — resumo detalhado da situacao atual
- \`!roll <resultado>\` — informa resultado de uma rolagem pedida pelo DM
- \`!pc secret <texto>\` — registra motivacao/medo/segredo do seu PC
- \`!pc list\` — mostra segredos registrados
- \`!pc sheet\` — mostra sua ficha resumida
- \`!inv\` — inventario do grupo (add/rm/gold/list)
- \`!recap\` — resumo dramatico "Previously on..."
- \`!pinhelp\` — reposta a mensagem de onboarding`;

const HELP_COMBAT = `**Comandos de Combate**

- \`!combat start\` — inicia combate
- \`!combat end\` — encerra combate
- \`!init <valor>\` — registra sua iniciativa (so jogadores)
- \`!turn\` — mostra round, turno atual e ordem

**Fluxo:**
1. \`!combat start\`
2. Jogadores usam \`!init <valor>\`, DM usa \`!npc add ...\`
3. Quando todos prontos, a ordem e anunciada automaticamente
4. No seu turno: \`!act <acao>\` ou \`!pass\`
5. NPCs agem automaticamente
6. \`!combat end\` para encerrar

**Exemplo:**
\`\`\`
!combat start
!init 15
!npc add Goblin1 hp=7 ac=15 init=12
!act Ataco o Goblin1 com minha espada!
!npc hp Goblin1 -7
!combat end
\`\`\``;

const HELP_STORY = `**Comandos de Narrativa / Mesa**

- \`!setup\` — cria uma mesa neste canal (reseta tudo)
- \`!join\` — entra como jogador (ate 2)
- \`!start\` — comeca a aventura + posta onboarding + cena de abertura
- \`!intro\` — gera (ou regenera) a cena de abertura via IA
- \`!scene <tema/tom/regras>\` — define vibe da campanha
- \`!ask <pergunta>\` — pergunta ao DM sobre o ambiente (resposta curta e direta)
- \`!context\` — pede um resumo detalhado da situacao atual
- \`!roll <resultado>\` — informa resultado de rolagem pedida pelo DM
- \`!pc sheet\` — mostra sua ficha resumida
- \`!inv\` — inventario do grupo (\`add/rm/gold/list\`)
- \`!quest\` — diario de quests (\`add/done/rm/list\`) (DM)
- \`!portrait <npc>\` — gera retrato de NPC via IA (DM)
- \`!export\` — exporta sessao como arquivo .txt
- \`!save <nome>\` — salva snapshot da mesa (DM)
- \`!load <nome>\` — carrega um save (DM)
- \`!end\` — encerra a mesa

**Fluxo:**
1. \`!setup\` → \`!join\` (x2) → \`!start\`
2. Jogador 1 usa \`!act\`, depois Jogador 2 usa \`!act\`
3. DM narra automaticamente e anuncia proximo turno
4. Repita!

**Dica:** Use \`!scene\` antes de \`!start\` para definir o tom.`;

const HELP_NPC = `**Gerenciamento de NPCs**

- \`!npc add <nome> hp=<n> ac=<n> init=<n> [notes=...]\` — adiciona NPC ao combate
- \`!npc hp <nome> <+/-n>\` — altera HP (negativo = dano, positivo = cura)
- \`!npc list\` — lista todos os NPCs vivos com HP/AC
- \`!npc trust <nome> <+/-n>\` — ajusta confianca de um NPC nos PCs
- \`!npc fear <nome> <+/-n>\` — ajusta medo de um NPC em relacao aos PCs
- \`!npc flag <nome> add|rm|list <texto>\` — gerencia flags de memoria do NPC

**Exemplos:**
\`\`\`
!npc add Goblin1 hp=7 ac=15 init=12
!npc hp Goblin1 -5
!npc trust Dargan +2
!npc fear Mavra +3
!npc flag Dargan add viu PCs roubando sal
!npc flag Dargan list
!npc list
\`\`\`

**Regras:**
- NPC com HP <= 0 e removido automaticamente da ordem e da lista.
- Trust/fear/flags de NPCs afetam como eles reagem nas narracoes do DM.`;

const HELP_WORLD = `**Estado do Mundo e Consequencias**

- \`!world\` — mostra estado completo (clima, hora, ameacas, inventario, quests)
- \`!clock <nome> <+/-n>\` — ajusta um relogio manualmente (0-6)
- \`!advance day [n]\` — avanca o dia (gera evento + muda clima)
- \`!rep <faccao> <+/-n>\` — ajusta reputacao com uma faccao (-10 a +10)
- \`!economy price <val>\` — ajusta indice de precos (0.1-5.0)
- \`!economy scarcity add|rm|list <item>\` — gerencia itens escassos
- \`!patrol low|normal|high|lockdown\` — ajusta patrulhas
- \`!patrol curfew on|off\` — toque de recolher
- \`!flag add|list|rm <nome>\` — gerencia flags de mundo
- \`!recap\` — resumo dramatico "Previously on..."

**Clima:** muda automaticamente com \`!advance day\`. Corrupcao alta = mais cinzas e neblina.
**Hora:** avanca a cada narracao (amanhecer → manha → tarde → entardecer → noite → madrugada).

**Relogios:** ritual_do_veu, fome_e_saque, ponte_antiga, confianca_faccoes, paranoia_vila, corrupcao_espiritual
**Faccoes:** lamina_juramentada, conclave_veu_cinzento`;

const HELP_PACK = `**Campaign Pack**

Arquivos em \`campaign/\`:
- \`dm_persona.md\` — personalidade e regras do DM
- \`world_bible.md\` — cenario, faccoes, NPCs, tramas, relogios de ameaca
- \`clue_system.md\` — sistema de pistas (3 camadas por thread)
- \`tension_clocks.md\` — relogios invisiveis de tensao dramatica
- \`player_guide.md\` — guia para jogadores
- \`canon_summary.json\` — resumo canonico (gerado pelo bot)

**Comandos:**
- \`!pack reload\` — recarrega todos os arquivos sem reiniciar o bot
- \`!pack summarize\` — gera o resumo canonico via IA a partir dos .md

**Como funciona:**
1. Edite os arquivos .md com as informacoes da sua campanha
2. Use \`!pack reload\` para o bot reconhecer as mudancas
3. Use \`!pack summarize\` para gerar o canon_summary.json
4. O resumo (pistas, relogios, tensao, faccoes) e injetado automaticamente em TODOS os prompts do DM`;

// ---------------------------------------------------------------------------
// Permissao de DM
// ---------------------------------------------------------------------------
const DM_ONLY_CMDS = new Set([
  '!setup', '!scene', '!intro', '!combat', '!npc', '!pack',
  '!clock', '!advance', '!rep', '!flag', '!economy', '!patrol',
  '!save', '!load', '!portrait', '!quest',
]);

function isDM(message) {
  return message.author.id === DM_USER_ID;
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (!content.startsWith('!')) return;
  if (message.channel.id !== GAME_CHANNEL_ID) return;

  const [cmd, ...rest] = content.split(/\s+/);
  const args = rest.join(' ');

  const channelId = message.channel.id;
  const game = ensureGame(channelId);

  try {
    // Verifica permissao de DM
    if (DM_ONLY_CMDS.has(cmd) && !isDM(message)) {
      await message.reply('Apenas o DM pode usar esse comando.');
      return;
    }
    // -----------------------------------------------------------------------
    // !help [subtopic]
    // -----------------------------------------------------------------------
    if (cmd === '!help') {
      const sub = rest[0]?.toLowerCase();
      const helpMap = {
        combat: { title: '⚔️ Ajuda — Combate', text: HELP_COMBAT },
        story:  { title: '📜 Ajuda — Narrativa', text: HELP_STORY },
        npc:    { title: '🧠 Ajuda — NPCs', text: HELP_NPC },
        pack:   { title: '📦 Ajuda — Campaign Pack', text: HELP_PACK },
        world:  { title: '🌍 Ajuda — Mundo', text: HELP_WORLD },
      };
      const entry = helpMap[sub];
      if (entry) {
        await sendEmbed(message.channel, { color: COLORS.HELP, title: entry.title, description: entry.text });
        return;
      }
      await sendEmbed(message.channel, { color: COLORS.HELP, title: '📋 Ajuda', description: HELP_MAIN });
      return;
    }

    // -----------------------------------------------------------------------
    // !pinhelp
    // -----------------------------------------------------------------------
    if (cmd === '!pinhelp') {
      await sendEmbed(message.channel, {
        color: COLORS.HELP,
        title: '⚔️ Bem-vindos à Mesa!',
        description: ONBOARDING_MSG,
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !pack reload | summarize
    // -----------------------------------------------------------------------
    if (cmd === '!pack') {
      const sub = rest[0]?.toLowerCase();

      if (sub === 'reload') {
        loadPackFiles();
        await message.reply(
          'Campaign pack recarregado! (dm_persona, world_bible, clue_system, tension_clocks, player_guide, canon_summary)',
        );
        return;
      }

      if (sub === 'summarize') {
        if (!pack.dmPersona && !pack.worldBible) {
          await message.reply(
            'Arquivos da campanha vazios. Edite `campaign/dm_persona.md` e `campaign/world_bible.md` primeiro.',
          );
          return;
        }

        await message.reply('\uD83E\uDD16 Gerando resumo canonico...');

        const clueSection = pack.clueSystem
          ? `\n--- CLUE SYSTEM ---\n${pack.clueSystem}`
          : '';

        const tensionSection = pack.tensionClocks
          ? `\n--- TENSION CLOCKS ---\n${pack.tensionClocks}`
          : '';

        const prompt = `
Voce recebera o conteudo dos arquivos de campanha de D&D 5e.
Gere um JSON compacto com EXATAMENTE esta estrutura (sem texto extra, so o JSON):
{
  "tone": "descricao curta do tom",
  "dm_voice_rules": ["regra1", "regra2"],
  "table_rules": ["regra1", "regra2"],
  "setting_facts": ["fato1", "fato2"],
  "factions": [{"name":"...", "goal":"..."}],
  "npc_index": [{"name":"...", "role":"...", "secret":"..."}],
  "plot_threads": [{"name":"...", "status":"..."}],
  "threat_clocks": [{"name":"...", "level":"0/6", "triggers":"..."}],
  "clue_threads": [{"thread":"...", "social":"pista resumida", "environmental":"pista resumida", "consequence":"pista resumida"}],
  "invisible_clocks": [{"name":"...", "level":"0/6", "signals":"sinais resumidos", "advances":"gatilhos de avanco", "reduces":"gatilhos de reducao"}],
  "taboos": ["coisa proibida na mesa"],
  "mechanics": ["regra mecanica especial"]
}
Extraia as informacoes dos documentos abaixo. Se uma secao nao tiver info, deixe array vazio.
Para clue_threads: resuma cada camada (social/ambiental/consequencia) em 1 frase curta — o DM usa isso como lembrete.
Para threat_clocks: extraia nome, nivel atual e gatilhos resumidos.
Para invisible_clocks: extraia nome, nivel, sinais narrativos resumidos, gatilhos de avanco e reducao. IMPORTANTE: estes relogios sao internos do DM, nunca revelados numericamente aos jogadores.

--- DM PERSONA ---
${pack.dmPersona}

--- WORLD BIBLE ---
${pack.worldBible}
${clueSection}
${tensionSection}
`.trim();

        const resp = await openai.responses.create({
          model: 'gpt-5.2',
          input: [
            { role: 'system', content: 'Voce e um assistente que gera JSON estruturado em portugues brasileiro (pt-BR). Responda APENAS com o JSON, sem markdown, sem explicacao. Todo o conteudo textual dentro do JSON deve estar em pt-BR.' },
            { role: 'user', content: prompt },
          ],
        });

        const raw = resp.output_text ?? '';

        try {
          // Tenta extrair JSON mesmo se vier com ```json ... ```
          const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(jsonStr);
          fs.writeFileSync(
            path.join(CAMPAIGN_DIR, 'canon_summary.json'),
            JSON.stringify(parsed, null, 2),
            'utf8',
          );
          pack.canonSummary = parsed;
          await sendEmbed(message.channel, {
            color: COLORS.SUCCESS,
            title: '✅ Canon Summary',
            description: 'Gerado e salvo em `campaign/canon_summary.json`!\nUse `!pack reload` a qualquer momento para recarregar.',
          });
        } catch {
          await sendEmbed(message.channel, {
            color: COLORS.COMBAT,
            title: '❌ Erro',
            description: 'Erro ao parsear JSON da IA. Tente novamente com `!pack summarize`.\n```\n' + raw.slice(0, 1500) + '\n```',
          });
        }
        return;
      }

      await message.reply('Use: `!pack reload` ou `!pack summarize`. Veja `!help pack`.');
      return;
    }

    // -----------------------------------------------------------------------
    // !setup
    // -----------------------------------------------------------------------
    if (cmd === '!setup') {
      const oldConsequences = game.consequences;
      const newGame = freshGame();
      // Preserva consequencias do mundo entre setups
      newGame.consequences = oldConsequences;
      games.set(channelId, newGame);
      await message.reply('Mesa criada neste canal (estado do mundo preservado). Dois jogadores: usem `!join`.');
      return;
    }

    // -----------------------------------------------------------------------
    // !join
    // -----------------------------------------------------------------------
    if (cmd === '!join') {
      if (game.players.includes(message.author.id)) {
        await message.reply('Voce ja esta na mesa.');
        return;
      }
      if (game.players.length >= 2) {
        await message.reply('A mesa ja tem 2 jogadores.');
        return;
      }
      game.players.push(message.author.id);
      await message.reply(`Entrou! (${game.players.length}/2).`);
      return;
    }

    // -----------------------------------------------------------------------
    // !start — com mensagem de onboarding
    // -----------------------------------------------------------------------
    if (cmd === '!start') {
      if (game.players.length !== 2) {
        await message.reply('Precisa de 2 jogadores. Ambos usem `!join`.');
        return;
      }
      game.turnIndex = 0;
      game.pendingActions.clear();
      game.log.push('A aventura comecou.');

      // Posta onboarding
      await sendEmbed(message.channel, {
        color: COLORS.HELP,
        title: '⚔️ Bem-vindos à Mesa!',
        description: ONBOARDING_MSG,
      });

      // Gera cena de abertura via IA (apenas na primeira vez)
      if (!game.opened) {
        await message.channel.send('🌫️ O mundo desperta...');
        const intro = await dmOpeningScene(game);
        game.log.push(`[CENA DE ABERTURA] ${intro}`);
        game.opened = true;
        await sendEmbed(message.channel, {
          color: COLORS.INTRO,
          title: '🌫️ As Cinzas de Valgrin',
          description: intro,
          footer: timeFooter(game.consequences),
        });
        // Retratos de NPC em background
        detectAndGeneratePortraits(message.channel, game, intro);
      } else {
        await sendEmbed(message.channel, {
          color: COLORS.NARRATION,
          description: `🎲 Retomando! Proximo turno: <@${currentPlayerId(game)}>. Use \`!act <acao>\`.`,
        });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // !intro — gera (ou regenera) a cena de abertura via IA
    // -----------------------------------------------------------------------
    if (cmd === '!intro') {
      if (game.players.length !== 2) {
        await message.reply('Precisa de 2 jogadores na mesa para gerar a intro.');
        return;
      }
      await message.channel.send('🌫️ O mundo desperta...');
      const intro = await dmOpeningScene(game);
      game.log.push(`[CENA DE ABERTURA] ${intro}`);
      game.opened = true;
      await sendEmbed(message.channel, {
        color: COLORS.INTRO,
        title: '🌫️ As Cinzas de Valgrin',
        description: intro,
        footer: timeFooter(game.consequences),
      });
      detectAndGeneratePortraits(message.channel, game, intro);
      return;
    }

    // -----------------------------------------------------------------------
    // !ask — pergunta direta sobre o ambiente
    // -----------------------------------------------------------------------
    if (cmd === '!ask') {
      if (!args) {
        await message.reply('Use: `!ask <sua pergunta>`');
        return;
      }
      if (game.players.length === 0) {
        await message.reply('Nenhuma mesa ativa. Use `!setup` primeiro.');
        return;
      }
      await message.channel.send('🔍 ...');
      const answer = await dmAsk(game, args);
      game.log.push(`[ASK] <@${message.author.id}>: ${args} → ${answer}`);
      await sendEmbed(message.channel, {
        color: COLORS.ASK,
        title: '🔍 Resposta do DM',
        description: answer,
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !context — resumo da situacao atual
    // -----------------------------------------------------------------------
    if (cmd === '!context') {
      if (game.players.length === 0) {
        await message.reply('Nenhuma mesa ativa. Use `!setup` primeiro.');
        return;
      }
      if (game.log.length === 0) {
        await message.reply('Nenhum historico ainda. Comece a aventura com `!start`.');
        return;
      }
      await message.channel.send('📖 Contextualizando...');
      const ctx = await dmContext(game);
      await sendEmbed(message.channel, {
        color: COLORS.CONTEXT,
        title: '📖 Contexto Atual',
        description: ctx,
        footer: timeFooter(game.consequences),
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !roll — informa resultado de rolagem pedida pelo DM
    // -----------------------------------------------------------------------
    if (cmd === '!roll') {
      if (!args) {
        await message.reply('Use: `!roll <resultado>` (ex: `!roll Percepcao 18` ou `!roll 14`)');
        return;
      }
      if (!game.players.includes(message.author.id)) {
        await message.reply('Voce nao esta na mesa.');
        return;
      }
      game.log.push(`[ROLL] <@${message.author.id}>: ${args}`);

      // Extrai o numero da rolagem para a animação
      const rollNum = parseInt(args.match(/\d+/)?.[0]) || 0;

      // Animação + resolução da IA em paralelo
      const [, resolution] = await Promise.all([
        rollNum > 0
          ? diceRollAnimation(message.channel, { label: 'Rolagem', finalValue: rollNum })
          : message.channel.send('🎲 Resolvendo...'),
        dmResolveRoll(game, message.author.id, args),
      ]);

      game.log.push(`DM (roll): ${resolution}`);
      await sendEmbed(message.channel, {
        color: COLORS.ROLL,
        title: '🎲 Resolução',
        description: resolution,
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !scene
    // -----------------------------------------------------------------------
    if (cmd === '!scene') {
      if (!args) {
        await message.reply('Use: `!scene <tema/tom/regras>`');
        return;
      }
      game.scene = args;
      game.log.push(`CENA/GUIA: ${args}`);
      await message.reply('Ok! Cena/guia da campanha definida.');
      return;
    }

    // -----------------------------------------------------------------------
    // !combat start | end
    // -----------------------------------------------------------------------
    if (cmd === '!combat') {
      const sub = rest[0]?.toLowerCase();

      if (sub === 'start') {
        game.combat = freshCombat();
        game.combat.active = true;
        game.log.push('⚔️ Combate iniciado.');
        await sendEmbed(message.channel, {
          color: COLORS.COMBAT,
          title: '⚔️ Combate Iniciado!',
          description: 'Use `!init <valor>` para jogadores e `!npc add ...` para inimigos.',
        });
        return;
      }

      if (sub === 'end') {
        game.combat = freshCombat();
        game.log.push('Combate encerrado.');
        await sendEmbed(message.channel, {
          color: COLORS.SUCCESS,
          title: '🛡️ Combate Encerrado',
          description: 'De volta ao modo historia.',
        });
        return;
      }

      await message.reply('Use: `!combat start` ou `!combat end`.');
      return;
    }

    // -----------------------------------------------------------------------
    // !init <valor>
    // -----------------------------------------------------------------------
    if (cmd === '!init') {
      const c = game.combat;
      if (!c.active) {
        await message.reply('Nenhum combate ativo. Use `!combat start`.');
        return;
      }
      if (!game.players.includes(message.author.id)) {
        await message.reply('Voce nao esta na mesa.');
        return;
      }
      const val = parseInt(args);
      if (isNaN(val)) {
        await message.reply('Use: `!init <numero>`');
        return;
      }

      const displayName =
        message.member?.displayName || message.author.username;
      const entry = {
        type: 'player',
        id: message.author.id,
        name: displayName,
        init: val,
      };

      const existing = c.order.findIndex(
        (e) => e.type === 'player' && e.id === message.author.id,
      );
      if (existing >= 0) c.order[existing] = entry;
      else c.order.push(entry);

      await message.reply(
        `Iniciativa de ${displayName} registrada: **${val}**.`,
      );
      await tryStartCombatOrder(message.channel, game);
      return;
    }

    // -----------------------------------------------------------------------
    // !npc add | hp | list
    // -----------------------------------------------------------------------
    if (cmd === '!npc') {
      const sub = rest[0]?.toLowerCase();
      const c = game.combat;

      if (sub === 'add') {
        if (!c.active) {
          await message.reply('Nenhum combate ativo. Use `!combat start`.');
          return;
        }
        const parsed = parseNpcArgs(rest.slice(1));
        if (!parsed) {
          await message.reply(
            'Use: `!npc add <nome> hp=<n> ac=<n> init=<n> [notes=...]`',
          );
          return;
        }

        c.npcs[parsed.name] = {
          name: parsed.name,
          hp: parsed.hp,
          maxHp: parsed.hp,
          ac: parsed.ac,
          notes: parsed.notes,
        };

        const orderEntry = { type: 'npc', name: parsed.name, init: parsed.init };
        const existIdx = c.order.findIndex(
          (e) => e.type === 'npc' && e.name === parsed.name,
        );
        if (existIdx >= 0) c.order[existIdx] = orderEntry;
        else c.order.push(orderEntry);

        await message.reply(
          `NPC **${parsed.name}** adicionado (HP=${parsed.hp}, AC=${parsed.ac}, Init=${parsed.init}).`,
        );
        await tryStartCombatOrder(message.channel, game);
        return;
      }

      if (sub === 'hp') {
        const name = rest[1];
        const deltaStr = rest[2];
        if (!name || !deltaStr) {
          await message.reply('Use: `!npc hp <nome> <+/-n>`');
          return;
        }
        const delta = parseInt(deltaStr);
        if (isNaN(delta)) {
          await message.reply('Delta deve ser um numero (ex: -5 ou +3).');
          return;
        }
        const npc = c.npcs[name];
        if (!npc) {
          await message.reply(`NPC "${name}" nao encontrado.`);
          return;
        }

        npc.hp += delta;

        if (npc.hp <= 0) {
          npc.hp = 0;
          removeNpcFromOrder(game, name);
          delete c.npcs[name];
          await sendEmbed(message.channel, {
            color: COLORS.COMBAT,
            description: `💀 **${name}** foi derrotado!`,
          });
          game.log.push(`${name} derrotado.`);
        } else {
          const bar = hpBar(npc.hp, npc.maxHp);
          await sendEmbed(message.channel, {
            color: COLORS.COMBAT,
            description: `**${name}** \`[${bar}]\` ${npc.hp}/${npc.maxHp} HP (${delta > 0 ? '+' : ''}${delta})`,
          });
        }
        return;
      }

      if (sub === 'list') {
        const entries = Object.values(c.npcs);
        if (entries.length === 0) {
          await message.reply('Nenhum NPC ativo.');
          return;
        }
        const list = entries
          .map(
            (n) =>
              `- **${n.name}**: \`[${hpBar(n.hp, n.maxHp)}]\` ${n.hp}/${n.maxHp} HP, AC=${n.ac}${n.notes ? ' (' + n.notes + ')' : ''}`,
          )
          .join('\n');
        await sendEmbed(message.channel, {
          color: COLORS.COMBAT,
          title: '⚔️ NPCs em Combate',
          description: list,
        });
        return;
      }

      if (sub === 'trust' || sub === 'fear') {
        const cs = game.consequences;
        const npcName = rest[1];
        const deltaStr = rest[2];
        if (!npcName || !deltaStr) {
          await message.reply(`Use: \`!npc ${sub} <nome> <+/-n>\``);
          return;
        }
        const delta = parseInt(deltaStr);
        if (isNaN(delta)) {
          await message.reply('Delta deve ser um numero.');
          return;
        }
        if (!cs.npcs[npcName]) {
          cs.npcs[npcName] = { trust: 0, fear: 0, flags: [] };
        }
        cs.npcs[npcName][sub] = Math.max(-10, Math.min(10, cs.npcs[npcName][sub] + delta));
        await message.reply(`**${npcName}** ${sub}: ${cs.npcs[npcName][sub]} (${delta > 0 ? '+' : ''}${delta})`);
        return;
      }

      if (sub === 'flag') {
        const cs = game.consequences;
        const npcName = rest[1];
        const action = rest[2]?.toLowerCase();
        const flagText = rest.slice(3).join(' ');

        if (!npcName || !action) {
          await message.reply('Use: `!npc flag <nome> add|rm|list <texto>`');
          return;
        }

        if (!cs.npcs[npcName]) {
          cs.npcs[npcName] = { trust: 0, fear: 0, flags: [] };
        }

        if (action === 'add') {
          if (!flagText) { await message.reply('Use: `!npc flag <nome> add <texto>`'); return; }
          cs.npcs[npcName].flags.push(flagText);
          await message.reply(`**${npcName}** flag adicionada: "${flagText}"`);
          return;
        }

        if (action === 'rm') {
          if (!flagText) { await message.reply('Use: `!npc flag <nome> rm <texto>`'); return; }
          const idx = cs.npcs[npcName].flags.indexOf(flagText);
          if (idx < 0) { await message.reply(`Flag "${flagText}" nao encontrada em ${npcName}.`); return; }
          cs.npcs[npcName].flags.splice(idx, 1);
          await message.reply(`**${npcName}** flag removida: "${flagText}"`);
          return;
        }

        if (action === 'list') {
          const flags = cs.npcs[npcName].flags;
          if (!flags.length) { await message.reply(`**${npcName}** nao tem flags.`); return; }
          await message.reply(`**${npcName}** flags: ${flags.join(', ')}`);
          return;
        }

        await message.reply('Use: `!npc flag <nome> add|rm|list <texto>`');
        return;
      }

      await message.reply('Use: `!npc add|hp|list|trust|fear|flag ...`');
      return;
    }

    // -----------------------------------------------------------------------
    // !turn
    // -----------------------------------------------------------------------
    if (cmd === '!turn') {
      const c = game.combat;
      if (!c.active) {
        await message.reply('Nenhum combate ativo.');
        return;
      }
      if (c.order.length === 0) {
        await message.reply('Ordem de iniciativa ainda nao definida.');
        return;
      }
      const entry = currentCombatEntry(game);
      const turno =
        entry.type === 'player' ? `<@${entry.id}>` : entry.name;
      await message.reply(
        `**Round ${c.round}** | Turno: ${turno}\n${formatOrder(game)}`,
      );
      return;
    }

    // -----------------------------------------------------------------------
    // !act
    // -----------------------------------------------------------------------
    if (cmd === '!act') {
      // ---------- COMBAT MODE ----------
      if (game.combat.active) {
        const c = game.combat;

        if (c.order.length === 0) {
          await message.reply(
            'Combate iniciado mas ordem nao definida. Use `!init` e `!npc add`.',
          );
          return;
        }
        if (!game.players.includes(message.author.id)) {
          await message.reply('Voce nao esta na mesa.');
          return;
        }
        const entry = currentCombatEntry(game);
        if (
          !entry ||
          entry.type !== 'player' ||
          entry.id !== message.author.id
        ) {
          const turno =
            entry?.type === 'player'
              ? `<@${entry.id}>`
              : entry?.name || '???';
          await message.reply(`Agora e o turno de ${turno}.`);
          return;
        }
        if (!args) {
          await message.reply('Use: `!act <sua acao>`');
          return;
        }

        game.log.push(`Jogador <@${message.author.id}>: ${args}`);
        const hChanges = applyHeuristics(game, args, true);
        await message.reply(`Acao registrada: ${args}`);
        if (hChanges.length) {
          await sendEmbed(message.channel, {
            color: COLORS.SYSTEM,
            description: `🔧 **[WORLD]** ${hChanges.join(' | ')}`,
          });
        }

        advanceCombatTurn(game);
        await runNpcTurns(message.channel, game);
        return;
      }

      // ---------- STORY MODE ----------
      if (game.players.length !== 2) {
        await message.reply(
          'Mesa nao esta pronta. Use `!setup`, `!join` e `!start`.',
        );
        return;
      }
      if (!game.players.includes(message.author.id)) {
        await message.reply('Voce nao esta na mesa.');
        return;
      }
      const expected = currentPlayerId(game);
      if (message.author.id !== expected) {
        await message.reply(
          `Agora e o turno de <@${expected}>. Aguarde.`,
        );
        return;
      }
      if (!args) {
        await message.reply('Use: `!act <sua acao>`');
        return;
      }

      const isPublic = args.includes('#publico');
      game.pendingActions.set(message.author.id, args.replace(/#publico/gi, '').trim());
      game.log.push(`Jogador <@${message.author.id}>: ${args}`);
      const hChanges = applyHeuristics(game, args, isPublic);
      if (hChanges.length) {
        await sendEmbed(message.channel, {
          color: COLORS.SYSTEM,
          description: `🔧 **[WORLD]** ${hChanges.join(' | ')}`,
        });
      }

      game.turnIndex = (game.turnIndex + 1) % game.players.length;
      const next = currentPlayerId(game);

      if (!game.pendingActions.has(next)) {
        await message.reply(
          `Acao registrada. \uD83C\uDFB2 Proximo turno: <@${next}> (use \`!act <acao>\`).`,
        );
        return;
      }

      await message.channel.send('🤖 DM esta narrando...');
      const narration = await dmNarrate(game);
      game.log.push(`DM: ${narration}`);
      game.pendingActions.clear();
      await sendEmbed(message.channel, {
        color: COLORS.NARRATION,
        title: '📜 Narração',
        description: narration,
        footer: timeFooter(game.consequences),
      });
      game.consequences.timeOfDay = advanceTimeOfDay(game.consequences.timeOfDay);
      detectAndGeneratePortraits(message.channel, game, narration);

      // Lembretes sutis de comandos uteis (1 em 4 narracoes)
      if (Math.random() < 0.25) {
        const hints = [
          '💡 `!ask` para perguntar algo ao DM | `!context` para resumo da cena',
          '💡 `!inv` para ver inventario | `!quest` para quests ativas',
          '💡 `!pc sheet` para ver sua ficha | `!recap` para resumo da sessao',
          '💡 `!world` para ver o estado do mundo',
        ];
        const hint = hints[Math.floor(Math.random() * hints.length)];
        await sendEmbed(message.channel, {
          color: COLORS.SYSTEM,
          description: hint,
        });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // !pass
    // -----------------------------------------------------------------------
    if (cmd === '!pass') {
      // ---------- COMBAT MODE ----------
      if (game.combat.active) {
        const c = game.combat;

        if (c.order.length === 0) {
          await message.reply('Ordem de iniciativa nao definida ainda.');
          return;
        }
        if (!game.players.includes(message.author.id)) {
          await message.reply('Voce nao esta na mesa.');
          return;
        }
        const entry = currentCombatEntry(game);
        if (
          !entry ||
          entry.type !== 'player' ||
          entry.id !== message.author.id
        ) {
          const turno =
            entry?.type === 'player'
              ? `<@${entry.id}>`
              : entry?.name || '???';
          await message.reply(`Agora e o turno de ${turno}.`);
          return;
        }

        game.log.push(`Jogador <@${message.author.id}>: (passa o turno)`);
        await message.reply('Turno passado.');

        advanceCombatTurn(game);
        await runNpcTurns(message.channel, game);
        return;
      }

      // ---------- STORY MODE ----------
      if (!game.players.includes(message.author.id)) {
        await message.reply('Voce nao esta na mesa.');
        return;
      }
      const expected = currentPlayerId(game);
      if (message.author.id !== expected) {
        await message.reply(`Agora e o turno de <@${expected}>.`);
        return;
      }

      game.pendingActions.set(message.author.id, '(passa o turno)');
      game.log.push(`Jogador <@${message.author.id}>: (passa o turno)`);

      game.turnIndex = (game.turnIndex + 1) % game.players.length;
      const nextP = currentPlayerId(game);

      if (!game.pendingActions.has(nextP)) {
        await message.reply(
          `Ok. \uD83C\uDFB2 Proximo turno: <@${nextP}> (use \`!act\` ou \`!pass\`).`,
        );
        return;
      }

      await message.channel.send('🤖 DM esta narrando...');
      const narration = await dmNarrate(game);
      game.log.push(`DM: ${narration}`);
      game.pendingActions.clear();
      await sendEmbed(message.channel, {
        color: COLORS.NARRATION,
        title: '📜 Narração',
        description: narration,
        footer: timeFooter(game.consequences),
      });
      game.consequences.timeOfDay = advanceTimeOfDay(game.consequences.timeOfDay);
      detectAndGeneratePortraits(message.channel, game, narration);
      return;
    }

    // -----------------------------------------------------------------------
    // !pc secret <texto>
    // -----------------------------------------------------------------------
    if (cmd === '!pc') {
      const sub = rest[0]?.toLowerCase();

      if (sub === 'secret') {
        if (!game.players.includes(message.author.id)) {
          await message.reply('Voce nao esta na mesa.');
          return;
        }
        const secretText = rest.slice(1).join(' ');
        if (!secretText) {
          await message.reply(
            'Use: `!pc secret <o que quer | o que teme | o que esconde>`\nExemplo: `!pc secret Quer vingar o irmao. Teme fogo. Esconde que e um desertor.`',
          );
          return;
        }

        if (!game.pcSecrets) game.pcSecrets = {};
        game.pcSecrets[message.author.id] = secretText;
        game.log.push(`PC SECRET <@${message.author.id}>: (registrado)`);
        await message.reply('Segredo registrado! O DM vai considerar isso nas narracoes.');
        return;
      }

      if (sub === 'list') {
        if (!game.pcSecrets || Object.keys(game.pcSecrets).length === 0) {
          await message.reply('Nenhum segredo de PC registrado.');
          return;
        }
        const list = Object.entries(game.pcSecrets)
          .map(([pid, text]) => `- <@${pid}>: ${text}`)
          .join('\n');
        await message.reply(`**Segredos dos PCs:**\n${list}`);
        return;
      }

      if (sub === 'sheet') {
        if (!game.players.includes(message.author.id)) {
          await message.reply('Voce nao esta na mesa.');
          return;
        }
        const displayName = message.member?.displayName || message.author.username;
        const secret = game.pcSecrets?.[message.author.id] || '_Nenhum segredo registrado._';
        const cs = game.consequences;

        const fields = [];
        fields.push({ name: '🎭 Jogador', value: `<@${message.author.id}> (${displayName})`, inline: true });
        fields.push({ name: '📍 Dia', value: `${cs.day}`, inline: true });
        fields.push({ name: '🔮 Segredos', value: secret, inline: false });

        // Quests ativas
        if (game.quests?.length) {
          const active = game.quests.filter(q => q.status === 'active');
          if (active.length) {
            fields.push({ name: '📋 Quests Ativas', value: active.map(q => `- ${q.name}`).join('\n'), inline: false });
          }
        }

        // Inventario resumido
        if (game.inventory && (game.inventory.items.length || game.inventory.gold > 0)) {
          let inv = `💰 ${game.inventory.gold} ouro`;
          if (game.inventory.items.length) {
            inv += ' | ' + game.inventory.items.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ');
          }
          fields.push({ name: '🎒 Inventário', value: inv, inline: false });
        }

        await sendEmbed(message.channel, {
          color: COLORS.HELP,
          title: `📜 Ficha — ${displayName}`,
          fields,
          footer: timeFooter(cs),
        });
        return;
      }

      await message.reply('Use: `!pc secret <texto>`, `!pc list` ou `!pc sheet`.');
      return;
    }

    // -----------------------------------------------------------------------
    // !world — mostra estado do mundo (descritivo)
    // -----------------------------------------------------------------------
    if (cmd === '!world') {
      const cs = game.consequences;
      const fields = [];

      // Clocks
      const clockLines = Object.entries(cs.clocks).map(([name, level]) => {
        const label = name.replace(/_/g, ' ');
        const bar = '█'.repeat(level) + '░'.repeat(6 - level);
        return `${label}: \`[${bar}]\` ${level}/6`;
      });
      fields.push({ name: '⏱️ Ameaças', value: clockLines.join('\n'), inline: false });

      // Faccoes
      const facLines = Object.entries(cs.factions).map(([name, rep]) => {
        const label = name.replace(/_/g, ' ');
        const sign = rep >= 0 ? '+' : '';
        return `${label}: **${sign}${rep}**`;
      });
      fields.push({ name: '🏴 Facções', value: facLines.join('\n'), inline: true });

      // Economia
      let econText = `Preço: **x${cs.economy.priceIndex.toFixed(1)}**`;
      if (cs.economy.scarcity.length)
        econText += `\nEscassez: ${cs.economy.scarcity.join(', ')}`;
      fields.push({ name: '💰 Economia', value: econText, inline: true });

      // Patrulhas
      const patrolText = `${cs.patrols.intensity}${cs.patrols.curfew ? ' 🔒 toque de recolher' : ''}`;
      fields.push({ name: '🛡️ Patrulhas', value: patrolText, inline: true });

      // Flags
      if (cs.flags.length)
        fields.push({ name: '🚩 Flags', value: cs.flags.join(', '), inline: false });

      // NPC memory
      const npcEntries = Object.entries(cs.npcs);
      if (npcEntries.length) {
        const npcLines = npcEntries.map(([name, mem]) =>
          `**${name}**: confiança=${mem.trust}, medo=${mem.fear}${mem.flags?.length ? ' [' + mem.flags.join(', ') + ']' : ''}`
        );
        fields.push({ name: '🧠 Memória de NPCs', value: npcLines.join('\n'), inline: false });
      }

      // Clima e hora
      const tEmoji = TIME_EMOJI[cs.timeOfDay] || '🕐';
      const wEmoji = cs.weather?.emoji || '';
      fields.push({ name: `${tEmoji} Período`, value: cs.timeOfDay, inline: true });
      fields.push({ name: `${wEmoji} Clima`, value: cs.weather?.desc || 'Normal', inline: true });

      // Inventario do grupo
      if (game.inventory && (game.inventory.items.length || game.inventory.gold > 0)) {
        let invText = `💰 Ouro: **${game.inventory.gold}**`;
        if (game.inventory.items.length) {
          invText += '\n' + game.inventory.items.map(i => `- ${i.name}${i.qty > 1 ? ` (x${i.qty})` : ''}`).join('\n');
        }
        fields.push({ name: '🎒 Inventário', value: invText, inline: false });
      }

      // Quests ativas
      if (game.quests?.length) {
        const activeQ = game.quests.filter(q => q.status === 'active');
        const doneQ = game.quests.filter(q => q.status === 'done');
        let questText = '';
        if (activeQ.length) questText += activeQ.map(q => `📌 ${q.name}`).join('\n');
        if (doneQ.length) questText += (questText ? '\n' : '') + doneQ.map(q => `✅ ~~${q.name}~~`).join('\n');
        if (questText) fields.push({ name: '📋 Quests', value: questText, inline: false });
      }

      await sendEmbed(message.channel, {
        color: COLORS.WORLD,
        title: `🌍 Estado do Mundo — Dia ${cs.day}`,
        fields,
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !clock <nome> <+/-n>
    // -----------------------------------------------------------------------
    if (cmd === '!clock') {
      const cs = game.consequences;
      const clockName = rest[0]?.toLowerCase();
      const deltaStr = rest[1];

      if (!clockName || !deltaStr) {
        const names = Object.keys(cs.clocks).join(', ');
        await message.reply(`Use: \`!clock <nome> <+/-n>\`\nRelogios: ${names}`);
        return;
      }

      if (!(clockName in cs.clocks)) {
        await message.reply(`Relogio "${clockName}" nao encontrado. Disponiveis: ${Object.keys(cs.clocks).join(', ')}`);
        return;
      }

      const delta = parseInt(deltaStr);
      if (isNaN(delta)) {
        await message.reply('Delta deve ser um numero (ex: +1 ou -2).');
        return;
      }

      cs.clocks[clockName] = Math.max(0, Math.min(6, cs.clocks[clockName] + delta));
      const label = clockName.replace(/_/g, ' ');
      const bar = '\u2588'.repeat(cs.clocks[clockName]) + '\u2591'.repeat(6 - cs.clocks[clockName]);
      await message.reply(`**${label}**: [${bar}] ${cs.clocks[clockName]}/6`);
      return;
    }

    // -----------------------------------------------------------------------
    // !advance day [n]
    // -----------------------------------------------------------------------
    if (cmd === '!advance') {
      const sub = rest[0]?.toLowerCase();
      if (sub !== 'day') {
        await message.reply('Use: `!advance day [n]`');
        return;
      }

      const cs = game.consequences;
      const days = parseInt(rest[1]) || 1;
      cs.day += days;

      // Novo dia: clima muda e periodo volta para amanhecer
      const newWeather = randomWeather(cs.clocks.corrupcao_espiritual);
      cs.weather = { id: newWeather.id, desc: newWeather.desc, emoji: newWeather.emoji };
      cs.timeOfDay = 'amanhecer';

      // Inatividade avanca relogios
      if (days >= 2) {
        cs.clocks.ritual_do_veu = Math.min(6, cs.clocks.ritual_do_veu + 1);
        cs.clocks.fome_e_saque = Math.min(6, cs.clocks.fome_e_saque + 1);
        game.log.push(`[SISTEMA] ${days} dias passaram. Relogios avancaram por inatividade.`);
      }

      await sendEmbed(message.channel, {
        color: COLORS.EVENT,
        description: `⏳ **${days} dia(s) passaram.** Dia atual: ${cs.day}\nGerando evento de mundo...`,
      });

      const event = await generateWorldEvent(game);
      game.log.push(`[EVENTO DIA ${cs.day}] ${event}`);
      await sendEmbed(message.channel, {
        color: COLORS.EVENT,
        title: `🌍 Evento do Dia ${cs.day}`,
        description: event,
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !rep <faccao> <+/-n>
    // -----------------------------------------------------------------------
    if (cmd === '!rep') {
      const cs = game.consequences;
      const factionName = rest[0]?.toLowerCase();
      const deltaStr = rest[1];

      if (!factionName || !deltaStr) {
        const names = Object.keys(cs.factions).join(', ');
        await message.reply(`Use: \`!rep <faccao> <+/-n>\`\nFaccoes: ${names}`);
        return;
      }

      if (!(factionName in cs.factions)) {
        await message.reply(`Faccao "${factionName}" nao encontrada. Disponiveis: ${Object.keys(cs.factions).join(', ')}`);
        return;
      }

      const delta = parseInt(deltaStr);
      if (isNaN(delta)) {
        await message.reply('Delta deve ser um numero (ex: +2 ou -3).');
        return;
      }

      cs.factions[factionName] = Math.max(-10, Math.min(10, cs.factions[factionName] + delta));
      const label = factionName.replace(/_/g, ' ');
      const sign = cs.factions[factionName] >= 0 ? '+' : '';
      await message.reply(`**${label}**: ${sign}${cs.factions[factionName]} (${delta > 0 ? '+' : ''}${delta})`);
      return;
    }

    // -----------------------------------------------------------------------
    // !flag add|list|rm
    // -----------------------------------------------------------------------
    if (cmd === '!flag') {
      const cs = game.consequences;
      const sub = rest[0]?.toLowerCase();

      if (sub === 'add') {
        const flag = rest.slice(1).join('_').toLowerCase();
        if (!flag) {
          await message.reply('Use: `!flag add <nome_do_flag>`');
          return;
        }
        if (!cs.flags.includes(flag)) {
          cs.flags.push(flag);
        }
        await message.reply(`Flag adicionada: **${flag}**`);
        return;
      }

      if (sub === 'list') {
        if (cs.flags.length === 0) {
          await message.reply('Nenhuma flag ativa.');
          return;
        }
        await message.reply(`**Flags ativas:** ${cs.flags.join(', ')}`);
        return;
      }

      if (sub === 'rm') {
        const flag = rest.slice(1).join('_').toLowerCase();
        if (!flag) {
          await message.reply('Use: `!flag rm <nome_do_flag>`');
          return;
        }
        const idx = cs.flags.indexOf(flag);
        if (idx < 0) {
          await message.reply(`Flag "${flag}" nao encontrada.`);
          return;
        }
        cs.flags.splice(idx, 1);
        await message.reply(`Flag removida: **${flag}**`);
        return;
      }

      await message.reply('Use: `!flag add <nome>`, `!flag list` ou `!flag rm <nome>`.');
      return;
    }

    // -----------------------------------------------------------------------
    // !recap — resumo da sessao via IA
    // -----------------------------------------------------------------------
    if (cmd === '!recap') {
      if (game.log.length === 0) {
        await message.reply('Nenhum historico para resumir.');
        return;
      }

      await sendEmbed(message.channel, {
        color: COLORS.RECAP,
        description: '🎬 **Preparando o resumo...**',
      });

      const recentLog = game.log.slice(-60).join('\n');
      const canon = canonBlock();
      const worldState = worldStateBlock(game);

      const resp = await openai.responses.create({
        model: 'gpt-5.2',
        input: [
          { role: 'system', content: `Voce e o narrador de uma serie de fantasia medieval em portugues brasileiro (pt-BR).
Escreva um resumo dramatico no estilo "Previously on..." de serie de TV.
FORMATO OBRIGATORIO:
1. Comece com: "Anteriormente, em As Cinzas de Valgrin..."
2. Escreva 3-5 frases curtas e impactantes, cada uma em paragrafo separado.
3. Use tom dramatico, cinematico, com tensao. Como se fosse a voz de um narrador de serie.
4. Cubra: eventos principais, decisoes dos PCs, consequencias no mundo.
5. Termine com uma frase de gancho que gere expectativa.
6. Maximo 8 frases no total.` },
          { role: 'user', content: `${canon}${worldState}\n\nHISTORICO DA SESSAO:\n${recentLog}\n\nGere o resumo dramatico.` },
        ],
      });

      const recap = resp.output_text ?? '(sem resumo)';
      game.log.push(`[RECAP] ${recap}`);
      await sendEmbed(message.channel, {
        color: COLORS.RECAP,
        title: '🎬 Previously on... As Cinzas de Valgrin',
        description: recap,
        footer: timeFooter(game.consequences),
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !economy price|scarcity
    // -----------------------------------------------------------------------
    if (cmd === '!economy') {
      const cs = game.consequences;
      const sub = rest[0]?.toLowerCase();

      if (sub === 'price') {
        const val = parseFloat(rest[1]);
        if (isNaN(val) || val < 0.1 || val > 5.0) {
          await message.reply(`Use: \`!economy price <0.1-5.0>\`\nAtual: x${cs.economy.priceIndex.toFixed(1)}`);
          return;
        }
        cs.economy.priceIndex = Math.round(val * 10) / 10;
        await message.reply(`Indice de precos ajustado para **x${cs.economy.priceIndex.toFixed(1)}**`);
        return;
      }

      if (sub === 'scarcity') {
        const action = rest[1]?.toLowerCase();

        if (action === 'add') {
          const item = rest.slice(2).join(' ').toLowerCase();
          if (!item) { await message.reply('Use: `!economy scarcity add <item>`'); return; }
          if (!cs.economy.scarcity.includes(item)) cs.economy.scarcity.push(item);
          await message.reply(`Escassez adicionada: **${item}**`);
          return;
        }

        if (action === 'rm') {
          const item = rest.slice(2).join(' ').toLowerCase();
          if (!item) { await message.reply('Use: `!economy scarcity rm <item>`'); return; }
          const idx = cs.economy.scarcity.indexOf(item);
          if (idx < 0) { await message.reply(`"${item}" nao esta na lista de escassez.`); return; }
          cs.economy.scarcity.splice(idx, 1);
          await message.reply(`Escassez removida: **${item}**`);
          return;
        }

        if (action === 'list' || !action) {
          if (cs.economy.scarcity.length === 0) {
            await message.reply('Nenhuma escassez ativa.');
          } else {
            await message.reply(`**Escassez:** ${cs.economy.scarcity.join(', ')}`);
          }
          return;
        }

        await message.reply('Use: `!economy scarcity add|rm|list <item>`');
        return;
      }

      await message.reply(
        `**Economia atual:** preco x${cs.economy.priceIndex.toFixed(1)}, escassez: ${cs.economy.scarcity.length ? cs.economy.scarcity.join(', ') : 'nenhuma'}\n` +
        'Comandos: `!economy price <val>`, `!economy scarcity add|rm|list <item>`'
      );
      return;
    }

    // -----------------------------------------------------------------------
    // !patrol <intensity> | curfew on|off
    // -----------------------------------------------------------------------
    if (cmd === '!patrol') {
      const cs = game.consequences;
      const sub = rest[0]?.toLowerCase();

      if (sub === 'curfew') {
        const val = rest[1]?.toLowerCase();
        if (val === 'on') { cs.patrols.curfew = true; await message.reply('Toque de recolher **ativado**.'); return; }
        if (val === 'off') { cs.patrols.curfew = false; await message.reply('Toque de recolher **desativado**.'); return; }
        await message.reply(`Toque de recolher: ${cs.patrols.curfew ? 'ativo' : 'inativo'}. Use: \`!patrol curfew on|off\``);
        return;
      }

      const validIntensities = ['low', 'normal', 'high', 'lockdown'];
      if (sub && validIntensities.includes(sub)) {
        cs.patrols.intensity = sub;
        await message.reply(`Intensidade de patrulha ajustada para **${sub}**.`);
        return;
      }

      await message.reply(
        `**Patrulhas:** ${cs.patrols.intensity}${cs.patrols.curfew ? ' (toque de recolher)' : ''}\n` +
        'Comandos: `!patrol low|normal|high|lockdown`, `!patrol curfew on|off`'
      );
      return;
    }

    // -----------------------------------------------------------------------
    // !save <nome> | !save list
    // -----------------------------------------------------------------------
    if (cmd === '!save') {
      const sub = rest[0]?.toLowerCase();

      if (!sub) {
        await message.reply('Use: `!save <nome>` para salvar ou `!save list` para listar saves.');
        return;
      }

      if (sub === 'list') {
        try {
          const prefix = `save_${channelId}_`;
          const files = fs.readdirSync(DATA_DIR)
            .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
            .map(f => f.slice(prefix.length, -'.json'.length));
          if (files.length === 0) {
            await message.reply('Nenhum save encontrado.');
          } else {
            await message.reply(`**Saves disponíveis:**\n${files.map(n => `- \`${n}\``).join('\n')}`);
          }
        } catch { await message.reply('Nenhum save encontrado.'); }
        return;
      }

      const saveName = sub.replace(/[^a-z0-9_-]/g, '');
      if (!saveName) {
        await message.reply('Nome invalido. Use letras, numeros, _ ou -.');
        return;
      }

      const savePath = path.join(DATA_DIR, `save_${channelId}_${saveName}.json`);
      try {
        fs.writeFileSync(savePath, serializeGame(game), 'utf8');
        await message.reply(`Save criado: **${saveName}**`);
      } catch (err) {
        console.error('Erro ao salvar:', err.message);
        await message.reply('Erro ao criar save.');
      }
      return;
    }

    // -----------------------------------------------------------------------
    // !load <nome>
    // -----------------------------------------------------------------------
    if (cmd === '!load') {
      const sub = rest[0]?.toLowerCase();

      if (!sub) {
        await message.reply('Use: `!load <nome>` para carregar um save. Veja `!save list`.');
        return;
      }

      const saveName = sub.replace(/[^a-z0-9_-]/g, '');
      const savePath = path.join(DATA_DIR, `save_${channelId}_${saveName}.json`);

      if (!fs.existsSync(savePath)) {
        await message.reply(`Save "${saveName}" nao encontrado. Use \`!save list\` para ver disponiveis.`);
        return;
      }

      try {
        const raw = fs.readFileSync(savePath, 'utf8');
        const loaded = deserializeGame(raw);
        games.set(channelId, loaded);
        saveGame(channelId, loaded);
        await message.reply(`Save **${saveName}** carregado! Mesa restaurada.`);
      } catch (err) {
        console.error('Erro ao carregar save:', err.message);
        await message.reply('Erro ao carregar save.');
      }
      return;
    }

    // -----------------------------------------------------------------------
    // !inv — inventario do grupo
    // -----------------------------------------------------------------------
    if (cmd === '!inv') {
      const sub = rest[0]?.toLowerCase();

      if (sub === 'add') {
        const itemName = rest.slice(1).join(' ').replace(/\s+x\d+$/i, '').trim();
        const qtyMatch = args.match(/x(\d+)$/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        if (!itemName) { await message.reply('Use: `!inv add <item> [xN]`'); return; }

        if (!game.inventory) game.inventory = { items: [], gold: 0 };
        const existing = game.inventory.items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (existing) {
          existing.qty += qty;
        } else {
          game.inventory.items.push({ name: itemName, qty });
        }
        await sendEmbed(message.channel, {
          color: COLORS.INVENTORY,
          description: `🎒 **+${qty}** ${itemName} adicionado ao inventario.`,
        });
        return;
      }

      if (sub === 'rm') {
        const itemName = rest.slice(1).join(' ').replace(/\s+x\d+$/i, '').trim();
        const qtyMatch = args.match(/x(\d+)$/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        if (!itemName) { await message.reply('Use: `!inv rm <item> [xN]`'); return; }
        if (!game.inventory) { await message.reply('Inventario vazio.'); return; }

        const idx = game.inventory.items.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (idx < 0) { await message.reply(`"${itemName}" nao esta no inventario.`); return; }

        game.inventory.items[idx].qty -= qty;
        if (game.inventory.items[idx].qty <= 0) {
          game.inventory.items.splice(idx, 1);
        }
        await sendEmbed(message.channel, {
          color: COLORS.INVENTORY,
          description: `🎒 **-${qty}** ${itemName} removido do inventario.`,
        });
        return;
      }

      if (sub === 'gold') {
        const delta = parseInt(rest[1]);
        if (isNaN(delta)) { await message.reply('Use: `!inv gold <+/-N>`'); return; }
        if (!game.inventory) game.inventory = { items: [], gold: 0 };
        game.inventory.gold = Math.max(0, game.inventory.gold + delta);
        await sendEmbed(message.channel, {
          color: COLORS.INVENTORY,
          description: `💰 Ouro: **${game.inventory.gold}** (${delta > 0 ? '+' : ''}${delta})`,
        });
        return;
      }

      // !inv list (ou so !inv)
      if (!game.inventory || (!game.inventory.items.length && game.inventory.gold === 0)) {
        await message.reply('Inventario vazio.');
        return;
      }
      let invDesc = `💰 **Ouro:** ${game.inventory.gold}\n\n`;
      if (game.inventory.items.length) {
        invDesc += game.inventory.items.map(i => `- ${i.name}${i.qty > 1 ? ` (x${i.qty})` : ''}`).join('\n');
      } else {
        invDesc += '_Nenhum item._';
      }
      await sendEmbed(message.channel, {
        color: COLORS.INVENTORY,
        title: '🎒 Inventário do Grupo',
        description: invDesc,
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !quest — diario de quests
    // -----------------------------------------------------------------------
    if (cmd === '!quest') {
      const sub = rest[0]?.toLowerCase();

      if (sub === 'add') {
        const questName = rest.slice(1).join(' ').trim();
        if (!questName) { await message.reply('Use: `!quest add <nome da quest>`'); return; }
        if (!game.quests) game.quests = [];
        game.quests.push({ name: questName, status: 'active' });
        await sendEmbed(message.channel, {
          color: COLORS.QUEST,
          description: `📌 Quest adicionada: **${questName}**`,
        });
        return;
      }

      if (sub === 'done') {
        const questName = rest.slice(1).join(' ').trim();
        if (!questName) { await message.reply('Use: `!quest done <nome da quest>`'); return; }
        if (!game.quests) { await message.reply('Nenhuma quest registrada.'); return; }
        const quest = game.quests.find(q => q.name.toLowerCase() === questName.toLowerCase() && q.status === 'active');
        if (!quest) { await message.reply(`Quest ativa "${questName}" nao encontrada.`); return; }
        quest.status = 'done';
        await sendEmbed(message.channel, {
          color: COLORS.QUEST,
          description: `✅ Quest concluida: **${quest.name}**`,
        });
        return;
      }

      if (sub === 'rm') {
        const questName = rest.slice(1).join(' ').trim();
        if (!questName) { await message.reply('Use: `!quest rm <nome da quest>`'); return; }
        if (!game.quests) { await message.reply('Nenhuma quest registrada.'); return; }
        const idx = game.quests.findIndex(q => q.name.toLowerCase() === questName.toLowerCase());
        if (idx < 0) { await message.reply(`Quest "${questName}" nao encontrada.`); return; }
        game.quests.splice(idx, 1);
        await message.reply(`Quest removida.`);
        return;
      }

      // !quest list (ou so !quest)
      if (!game.quests?.length) {
        await message.reply('Nenhuma quest registrada. Use `!quest add <nome>`.');
        return;
      }
      const activeQ = game.quests.filter(q => q.status === 'active');
      const doneQ = game.quests.filter(q => q.status === 'done');
      let questDesc = '';
      if (activeQ.length) questDesc += '**Ativas:**\n' + activeQ.map(q => `📌 ${q.name}`).join('\n');
      if (doneQ.length) questDesc += (questDesc ? '\n\n' : '') + '**Concluidas:**\n' + doneQ.map(q => `✅ ~~${q.name}~~`).join('\n');
      await sendEmbed(message.channel, {
        color: COLORS.QUEST,
        title: '📋 Diário de Quests',
        description: questDesc,
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !portrait <nome_npc> — gera retrato via DALL-E (DM only)
    // -----------------------------------------------------------------------
    if (cmd === '!portrait') {
      const npcName = args.trim();
      if (!npcName) {
        await message.reply('Use: `!portrait <nome do NPC>`');
        return;
      }
      const desc = getNpcDescriptionFromCanon(npcName);
      if (!desc) {
        await message.reply(`NPC "${npcName}" nao encontrado no canon. Verifique o nome ou rode \`!pack summarize\`.`);
        return;
      }
      if (game.portraits[npcName] && game.portraits[npcName] !== 'generating') {
        await sendEmbed(message.channel, {
          color: COLORS.PORTRAIT,
          title: `🎨 ${npcName}`,
          image: game.portraits[npcName],
        });
        return;
      }
      await message.reply(`🎨 Gerando retrato de **${npcName}**... (vai aparecer quando ficar pronto)`);
      generateNpcPortrait(message.channel, game, npcName).catch(() => {});
      return;
    }

    // -----------------------------------------------------------------------
    // !export — exporta sessao como arquivo .txt
    // -----------------------------------------------------------------------
    if (cmd === '!export') {
      if (game.log.length === 0) {
        await message.reply('Nenhum historico para exportar.');
        return;
      }

      const lines = [
        '═══════════════════════════════════════════',
        '  AS CINZAS DE VALGRIN — Registro de Sessão',
        `  Dia ${game.consequences.day} | ${game.consequences.weather?.desc || 'Clima normal'}`,
        '═══════════════════════════════════════════',
        '',
      ];

      for (const entry of game.log) {
        // Limpa menções Discord <@id> -> @jogador
        const clean = entry.replace(/<@(\d+)>/g, '@jogador');
        if (clean.startsWith('DM:') || clean.startsWith('DM (')) {
          lines.push('─── DM ───');
          lines.push(clean.replace(/^DM[^:]*:\s*/, ''));
          lines.push('');
        } else if (clean.startsWith('Jogador')) {
          lines.push(`► ${clean}`);
          lines.push('');
        } else if (clean.startsWith('[')) {
          lines.push(`  ${clean}`);
        } else {
          lines.push(clean);
        }
      }

      lines.push('', '═══════════════════════════════════════════');
      lines.push('  Fim do registro');
      lines.push('═══════════════════════════════════════════');

      const content = lines.join('\n');
      const filePath = path.join(DATA_DIR, `export_${channelId}.txt`);
      fs.writeFileSync(filePath, content, 'utf8');

      await message.channel.send({
        content: '📄 **Registro da sessão exportado!**',
        files: [{ attachment: filePath, name: `sessao_dia${game.consequences.day}.txt` }],
      });
      return;
    }

    // -----------------------------------------------------------------------
    // !end
    // -----------------------------------------------------------------------
    if (cmd === '!end') {
      games.delete(channelId);
      try { fs.unlinkSync(stateFilePath(channelId)); } catch { /* ok */ }
      await message.reply('Mesa encerrada neste canal.');
      return;
    }

    await message.reply('Comando desconhecido. Use `!help`.');
  } catch (err) {
    console.error(err);
    await message.reply('Deu erro ao processar. Veja o console do bot.');
  } finally {
    // Auto-save apos cada comando processado
    saveGame(channelId, game);
  }
});

client.once('ready', () => {
  console.log(`Logado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
