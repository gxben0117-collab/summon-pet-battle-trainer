const SAVE_KEY = 'summonPetTrainerSaveV2';
const MAP_SIZE = 10;
const START_CELL = 90;
const BOSS_CELLS = [9, 0, 99];
const ENEMY_COUNT = 20;
const VILLAGER_COUNT = 7;
const ITEM_COUNT = 9;
const MAX_FIELD_PETS = 5;
const ATB_LIMIT = 100;
const confettiColors = ['#f5b84b', '#4bc6a8', '#ef6b6b', '#67a7ff', '#f5f7fb'];
let petIdSeed = 1;
let battleTimer = null;

const elements = {
  wood: { name: '木', icon: '木', beats: 'earth' },
  fire: { name: '火', icon: '火', beats: 'metal' },
  earth: { name: '土', icon: '土', beats: 'water' },
  metal: { name: '金', icon: '金', beats: 'wood' },
  water: { name: '水', icon: '水', beats: 'fire' },
};

const petCatalog = [
  { name: '芽靈', element: 'wood', icon: '芽', role: 'heal', power: 8, maxHp: 30, speed: 7 },
  { name: '炎尾', element: 'fire', icon: '炎', role: 'attack', power: 10, maxHp: 24, speed: 9 },
  { name: '岩甲', element: 'earth', icon: '岩', role: 'guard', power: 7, maxHp: 38, speed: 4 },
  { name: '鋼爪', element: 'metal', icon: '鋼', role: 'attack', power: 9, maxHp: 28, speed: 6 },
  { name: '浪鰭', element: 'water', icon: '浪', role: 'support', power: 8, maxHp: 32, speed: 6 },
  { name: '藤鹿', element: 'wood', icon: '藤', role: 'support', power: 9, maxHp: 29, speed: 8 },
  { name: '燼狐', element: 'fire', icon: '燼', role: 'attack', power: 11, maxHp: 23, speed: 10 },
  { name: '泥衛', element: 'earth', icon: '泥', role: 'guard', power: 8, maxHp: 36, speed: 5 },
  { name: '鏡狼', element: 'metal', icon: '鏡', role: 'guard', power: 10, maxHp: 27, speed: 7 },
  { name: '霧龜', element: 'water', icon: '霧', role: 'heal', power: 7, maxHp: 40, speed: 3 },
  { name: '森貓', element: 'wood', icon: '森', role: 'support', power: 7, maxHp: 34, speed: 9 },
  { name: '焰鷹', element: 'fire', icon: '焰', role: 'attack', power: 12, maxHp: 22, speed: 11 },
  { name: '晶蛇', element: 'earth', icon: '晶', role: 'guard', power: 10, maxHp: 33, speed: 5 },
  { name: '銀獅', element: 'metal', icon: '銀', role: 'attack', power: 11, maxHp: 30, speed: 7 },
  { name: '潮蛙', element: 'water', icon: '潮', role: 'heal', power: 9, maxHp: 31, speed: 8 },
];

const items = {
  herb: { name: '藥草', icon: '藥', description: '回復未陣亡寵物 HP' },
  ward: { name: '守護符', icon: '符', description: '跳過下一次追殺' },
  snare: { name: '捕網', icon: '網', description: '移除近距離敵人' },
  whistle: { name: '呼哨', icon: '哨', description: '召喚寵物' },
};

const state = {
  mode: 'map',
  gold: 60,
  pets: [],
  activePetId: null,
  enemyTeam: [],
  battle: null,
  playerCell: START_CELL,
  enemies: new Set(),
  bosses: new Set(BOSS_CELLS),
  villagers: new Set(),
  itemCells: new Set(),
  currentEncounter: null,
  availableMoves: new Set(),
  inventory: { herb: 1, ward: 0, snare: 0, whistle: 0 },
  wardActive: false,
  gameOver: false,
  victory: false,
  turn: 1,
};

const $ = (selector) => document.querySelector(selector);
const deckChoices = $('#deckChoices');
const battleChoices = $('#battleChoices');
const deckSlots = $('#deckSlots');
const opponentHand = $('#opponentHand');
const playerHand = $('#playerHand');
const startButton = $('#startButton');
const resetButton = $('#resetButton');
const continueButton = $('#continueButton');
const saveButton = $('#saveButton');
const healButton = $('#healButton');
const trainButton = $('#trainButton');
const buyPotionButton = $('#buyPotionButton');
const buyWardButton = $('#buyWardButton');
const bagActions = $('#bagActions');
const teamSummary = $('#teamSummary');
const eventText = $('#eventText');
const playerPlayed = $('#playerPlayed');
const opponentPlayed = $('#opponentPlayed');
const playerScore = $('#playerScore');
const opponentScore = $('#opponentScore');
const roundNumber = $('#roundNumber');
const statusText = $('#statusText');
const resultText = $('#resultText');
const mapScreen = $('#mapScreen');
const battleScreen = $('#battleScreen');
const mapBoard = $('#mapBoard');
const mapText = $('#mapText');
const diceButton = $('#diceButton');
const diceValue = $('#diceValue');

const rowOf = (cell) => Math.floor(cell / MAP_SIZE);
const colOf = (cell) => cell % MAP_SIZE;
const cellOf = (row, col) => row * MAP_SIZE + col;
const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
const distanceBetween = (a, b) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));

function makePet(template, level = 1) {
  const pet = {
    id: `pet-${petIdSeed}`,
    name: template.name,
    element: template.element,
    icon: template.icon,
    role: template.role,
    level,
    exp: 0,
    power: template.power + (level - 1) * 2,
    maxHp: template.maxHp + (level - 1) * 7,
    speed: template.speed + Math.floor((level - 1) / 2),
    charge: 0,
    guard: 0,
    focus: 0,
  };
  petIdSeed += 1;
  pet.hp = pet.maxHp;
  return pet;
}

function randomPet(level = 1) {
  return makePet(randomFrom(petCatalog), level);
}

function nextExp(pet) {
  return pet.level * 24;
}

function levelUpIfNeeded(pet) {
  let leveled = false;
  const wasAlive = pet.hp > 0;
  while (pet.exp >= nextExp(pet)) {
    pet.exp -= nextExp(pet);
    pet.level += 1;
    pet.power += 2;
    pet.maxHp += 7;
    pet.speed += pet.level % 2 === 0 ? 1 : 0;
    pet.hp = wasAlive ? pet.maxHp : 0;
    leveled = true;
  }
  return leveled;
}

function elementMultiplier(attacker, defender) {
  return elements[attacker.element].beats === defender.element ? 1.2 : 1;
}

function livingPets() {
  return state.pets.filter((pet) => pet.hp > 0);
}

function playerFieldPets() {
  return livingPets().slice(0, MAX_FIELD_PETS);
}

function livingEnemies() {
  return state.enemyTeam.filter((pet) => pet.hp > 0);
}

function firstLiving(team) {
  return team.find((pet) => pet.hp > 0) || null;
}

function weakestLiving(team) {
  return [...team].filter((pet) => pet.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}

function petPowerLevel() {
  return Math.max(1, ...state.pets.map((pet) => pet.level));
}

function teamText() {
  return `${livingPets().length}/${state.pets.length}`;
}

function threatText() {
  return `${state.enemies.size}+${state.bosses.size}`;
}

function roleIcon(role) {
  return { attack: '攻', support: '輔', guard: '防', heal: '癒' }[role] || '寵';
}

function buildMapEntities() {
  state.bosses = new Set(BOSS_CELLS);
  state.enemies = new Set();
  state.villagers = new Set();
  state.itemCells = new Set();
  const blocked = new Set([START_CELL, ...state.bosses]);
  state.enemies = placeSet(ENEMY_COUNT, blocked, 3);
  state.villagers = placeSet(7, blocked, 2);
  state.itemCells = placeSet(9, blocked, 2);
}

function placeSet(count, blocked, minStartDistance) {
  const placed = new Set();
  const candidates = [];
  for (let cell = 0; cell < MAP_SIZE * MAP_SIZE; cell += 1) {
    if (!blocked.has(cell) && distanceBetween(cell, START_CELL) >= minStartDistance) candidates.push(cell);
  }
  while (placed.size < count && candidates.length > 0) {
    const index = Math.floor(Math.random() * candidates.length);
    const cell = candidates.splice(index, 1)[0];
    placed.add(cell);
    blocked.add(cell);
  }
  return placed;
}

function getAvailableMoves(roll) {
  const moves = new Set();
  for (let cell = 0; cell < MAP_SIZE * MAP_SIZE; cell += 1) {
    const distance = distanceBetween(state.playerCell, cell);
    if (distance > 0 && distance <= roll) moves.add(cell);
  }
  return moves;
}

function renderPetCard(pet, note = '', compact = false) {
  const hp = `${pet.hp}/${pet.maxHp}`;
  return `
    <span class="pet-icon element-${pet.element}">${pet.icon}</span>
    <strong>${pet.name}</strong>
    <small class="stat-line"><span>${elements[pet.element].icon}</span><span>${roleIcon(pet.role)}</span><span>Lv.${pet.level}</span></small>
    <small class="stat-line"><span>♥ ${hp}</span><span>拳 ${pet.power}</span><span>速 ${pet.speed}</span></small>
    ${compact ? '' : `<small>${note || `EXP ${pet.exp}/${nextExp(pet)}`}</small>`}
  `;
}

function renderRoster() {
  deckChoices.innerHTML = '';
  state.pets.forEach((pet, index) => {
    const button = document.createElement('button');
    button.className = pet.id === state.activePetId ? 'pet-card selected-pet' : 'pet-card';
    if (pet.hp <= 0) button.classList.add('fainted-pet');
    button.type = 'button';
    button.innerHTML = renderPetCard(pet, index < MAX_FIELD_PETS ? '上場' : '後備');
    button.addEventListener('click', () => {
      state.activePetId = pet.id;
      renderRoster();
      saveGame(false);
      resultText.textContent = `${pet.name} 成為訓練目標。`;
    });
    deckChoices.append(button);
  });
  teamSummary.textContent = `${teamText()}｜前5上場`;
}

function renderInventory() {
  bagActions.innerHTML = '';
  Object.entries(items).forEach(([key, item]) => {
    const button = document.createElement('button');
    button.className = 'secondary-btn item-btn';
    button.type = 'button';
    button.disabled = state.inventory[key] <= 0 || state.mode !== 'map' || state.gameOver || state.victory;
    button.innerHTML = `<span>${item.icon}</span><strong>${state.inventory[key]}</strong><small>${item.name}</small>`;
    button.title = item.description;
    button.addEventListener('click', () => useItem(key));
    bagActions.append(button);
  });
}

function renderMap() {
  mapBoard.innerHTML = '';
  for (let cell = 0; cell < MAP_SIZE * MAP_SIZE; cell += 1) {
    const tile = document.createElement('button');
    tile.className = 'map-tile';
    tile.type = 'button';
    tile.disabled = !state.availableMoves.has(cell);
    if (cell === START_CELL) setTile(tile, 'start-tile', '起');
    if (state.bosses.has(cell)) setTile(tile, 'boss-tile', '王');
    if (state.enemies.has(cell)) setTile(tile, 'enemy-tile', '敵');
    if (state.villagers.has(cell)) setTile(tile, 'villager-tile', '村');
    if (state.itemCells.has(cell)) setTile(tile, 'item-tile', '物');
    if (state.availableMoves.has(cell)) {
      tile.classList.add('move-tile');
      tile.addEventListener('click', () => moveToCell(cell));
    }
    if (cell === state.playerCell) {
      setTile(tile, 'player-tile', '訓');
      tile.disabled = true;
    }
    mapBoard.append(tile);
  }
}

function setTile(tile, className, text) {
  tile.classList.add(className);
  tile.innerHTML = `<span>${text}</span>`;
}

function showMap() {
  stopBattleTimer();
  state.mode = 'map';
  mapScreen.classList.remove('is-hidden');
  battleScreen.classList.add('is-hidden');
  diceButton.disabled = state.gameOver || state.victory || state.availableMoves.size > 0;
  playerScore.textContent = teamText();
  opponentScore.textContent = threatText();
  roundNumber.textContent = state.gold;
  renderRoster();
  renderInventory();
  renderMap();
  saveGame(false);
}

function rollDice() {
  if (state.mode !== 'map' || state.gameOver || state.victory || state.availableMoves.size > 0) return;
  const roll = Math.floor(Math.random() * 6) + 1;
  state.availableMoves = getAvailableMoves(roll);
  diceValue.textContent = roll;
  diceButton.disabled = true;
  resultText.className = '';
  resultText.textContent = `T${state.turn}｜${roll}`;
  mapText.textContent = '點亮格移動';
  renderMap();
}

function moveToCell(cell) {
  if (!state.availableMoves.has(cell) || state.gameOver || state.victory) return;
  state.playerCell = cell;
  state.availableMoves.clear();
  renderMap();
  if (resolveCellEvent(cell)) return;
  finishPlayerMapMove();
}

function resolveCellEvent(cell) {
  if (state.bosses.has(cell)) return startEncounter('boss', cell), true;
  if (state.enemies.has(cell)) return startEncounter('enemy', cell), true;
  if (state.villagers.has(cell)) {
    state.villagers.delete(cell);
    villagerHelp();
    finishPlayerMapMove();
    return true;
  }
  if (state.itemCells.has(cell)) {
    state.itemCells.delete(cell);
    pickupItem();
    finishPlayerMapMove();
    return true;
  }
  return false;
}

function finishPlayerMapMove() {
  const hadWard = state.wardActive;
  const caughtCell = moveEnemies();
  state.turn += 1;
  if (caughtCell !== null) return startEncounter('enemy', caughtCell);
  resultText.className = '';
  resultText.textContent = hadWard ? '符｜追殺跳過' : '敵動｜安全';
  mapText.textContent = `R${rowOf(state.playerCell) + 1} C${colOf(state.playerCell) + 1}`;
  diceButton.disabled = false;
  showMap();
}

function moveEnemies() {
  if (state.wardActive) {
    state.wardActive = false;
    return null;
  }
  const occupied = new Set([...state.bosses]);
  const movedEnemies = new Set();
  const sortedEnemies = [...state.enemies].sort((a, b) => distanceBetween(a, state.playerCell) - distanceBetween(b, state.playerCell));
  for (let index = 0; index < sortedEnemies.length; index += 1) {
    const enemyCell = sortedEnemies[index];
    const nextCell = bestEnemyStep(enemyCell, occupied);
    if (nextCell === state.playerCell) {
      movedEnemies.add(nextCell);
      for (let rest = index + 1; rest < sortedEnemies.length; rest += 1) movedEnemies.add(sortedEnemies[rest]);
      state.enemies = movedEnemies;
      return nextCell;
    }
    movedEnemies.add(nextCell);
    occupied.add(nextCell);
  }
  state.enemies = movedEnemies;
  return null;
}

function bestEnemyStep(enemyCell, occupied) {
  const row = rowOf(enemyCell);
  const col = colOf(enemyCell);
  const candidates = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
    .filter(([r, c]) => r >= 0 && r < MAP_SIZE && c >= 0 && c < MAP_SIZE)
    .map(([r, c]) => cellOf(r, c))
    .filter((cell) => !occupied.has(cell) && !state.villagers.has(cell) && !state.itemCells.has(cell));
  candidates.sort((a, b) => distanceBetween(a, state.playerCell) - distanceBetween(b, state.playerCell));
  return candidates[0] || enemyCell;
}

function villagerHelp() {
  const roll = Math.floor(Math.random() * 5);
  let message = '';
  if (roll === 0) {
    healLivingPets(0.45);
    message = '村｜♥';
  } else if (roll === 1) {
    state.gold += 35;
    message = '村｜+35G';
  } else if (roll === 2) {
    const itemKey = randomFrom(Object.keys(items));
    state.inventory[itemKey] += 1;
    message = `村｜${items[itemKey].icon}+1`;
  } else if (roll === 3) {
    livingPets().forEach((pet) => {
      pet.exp += 12;
      levelUpIfNeeded(pet);
    });
    message = '村｜EXP+12';
  } else {
    removeNearestEnemy(3);
    message = '村｜退敵';
  }
  eventText.textContent = message;
  resultText.className = 'win';
  resultText.textContent = message;
}

function pickupItem() {
  const itemKey = randomFrom(Object.keys(items));
  state.inventory[itemKey] += 1;
  eventText.textContent = `物｜${items[itemKey].icon}`;
  resultText.className = 'win';
  resultText.textContent = `物｜${items[itemKey].name}`;
}

function startEncounter(type, cell) {
  const enemyLevel = type === 'boss' ? petPowerLevel() + 2 + (3 - state.bosses.size) : Math.max(1, petPowerLevel() + Math.floor(Math.random() * 2));
  const enemyCount = type === 'boss' ? 5 : Math.random() < 0.25 ? 2 : 1;
  state.mode = 'battle';
  state.currentEncounter = { type, cell };
  state.enemyTeam = Array.from({ length: enemyCount }, (_, index) => {
    const pet = randomPet(enemyLevel + (type === 'boss' ? Math.floor(index / 2) : 0));
    pet.name = type === 'boss' ? `王${pet.name}` : `野${pet.name}`;
    if (type === 'boss') {
      pet.maxHp += 22;
      pet.hp = pet.maxHp;
    }
    return pet;
  });
  state.battle = { running: false, waitingPetId: null, log: [], type };
  mapScreen.classList.add('is-hidden');
  battleScreen.classList.remove('is-hidden');
  continueButton.classList.add('is-hidden');
  renderBattle();
  statusText.textContent = type === 'boss' ? 'Boss' : '敵襲';
  resultText.className = '';
  resultText.textContent = '戰鬥';
}

function renderBattle() {
  battleChoices.innerHTML = '';
  playerFieldPets().forEach((pet) => battleChoices.append(renderCombatCard(pet, true)));
  opponentHand.innerHTML = '';
  state.enemyTeam.forEach((pet) => opponentHand.append(renderCombatCard(pet, false)));
  setBattleCards();
  renderSkillBar();
  startButton.disabled = livingPets().length === 0 || livingEnemies().length === 0 || state.battle?.running;
}

function renderCombatCard(pet, isPlayer) {
  const card = document.createElement('article');
  card.className = pet.hp > 0 ? 'pet-card combat-card' : 'pet-card combat-card fainted-pet';
  if (state.battle?.waitingPetId === pet.id) card.classList.add('ready-card');
  const charge = Math.min(100, Math.floor(pet.charge || 0));
  card.innerHTML = `${renderPetCard(pet, '', true)}<div class="charge"><span style="width:${charge}%"></span></div>`;
  if (isPlayer) {
    card.addEventListener('click', () => {
      state.activePetId = pet.id;
      renderBattle();
    });
  }
  return card;
}

function setBattleCards() {
  const pet = state.battle?.waitingPetId ? state.pets.find((item) => item.id === state.battle.waitingPetId) : firstLiving(playerFieldPets());
  const enemy = firstLiving(state.enemyTeam);
  playerPlayed.className = pet ? 'played-card pet-battle-card' : 'played-card empty-card';
  playerPlayed.innerHTML = pet ? renderPetCard(pet, state.battle?.waitingPetId === pet.id ? '行動' : '待機', true) : '<span class="card-mark">倒</span><small>全滅</small>';
  opponentPlayed.className = enemy ? 'played-card pet-battle-card' : 'played-card empty-card';
  opponentPlayed.innerHTML = enemy ? renderPetCard(enemy, '敵', true) : '<span class="card-mark">勝</span><small>敵倒</small>';
}

function startGame() {
  if (!state.battle || state.battle.running) return;
  state.battle.running = true;
  startButton.disabled = true;
  statusText.textContent = '讀秒中';
  battleTimer = setInterval(battleTick, 360);
}

function battleTick() {
  if (!state.battle?.running || state.battle.waitingPetId) return;
  [...playerFieldPets(), ...livingEnemies()].forEach((pet) => {
    if (pet.hp > 0) pet.charge = Math.min(ATB_LIMIT, (pet.charge || 0) + 10 + pet.speed);
  });
  const ready = [...playerFieldPets(), ...livingEnemies()]
    .filter((pet) => pet.hp > 0 && pet.charge >= ATB_LIMIT)
    .sort((a, b) => b.speed - a.speed)[0];
  if (!ready) return renderBattle();
  if (state.pets.includes(ready)) {
    state.battle.waitingPetId = ready.id;
    statusText.textContent = `${ready.name} 行動`;
    renderBattle();
  } else {
    enemyAct(ready);
  }
}

function renderSkillBar() {
  playerHand.innerHTML = '';
  const pet = state.battle?.waitingPetId ? state.pets.find((item) => item.id === state.battle.waitingPetId) : null;
  if (!pet || pet.hp <= 0) {
    deckSlots.textContent = '讀秒中';
    return;
  }
  deckSlots.textContent = `${pet.name} 行動`;
  getSkills(pet).forEach((skill) => {
    const button = document.createElement('button');
    button.className = `skill-btn skill-${skill.type}`;
    button.type = 'button';
    button.innerHTML = `<span>${skill.icon}</span><strong>${skill.name}</strong>`;
    button.addEventListener('click', () => useSkill(pet, skill));
    playerHand.append(button);
  });
}

function getSkills(pet) {
  const base = [
    { id: 'attack', type: 'attack', icon: '攻', name: '攻擊' },
    { id: 'guard', type: 'guard', icon: '防', name: '防守' },
  ];
  const roleSkill = {
    attack: { id: 'burst', type: 'attack', icon: '爆', name: '強擊' },
    support: { id: 'haste', type: 'support', icon: '速', name: '加速' },
    guard: { id: 'cover', type: 'guard', icon: '盾', name: '護盾' },
    heal: { id: 'heal', type: 'heal', icon: '癒', name: '治療' },
  }[pet.role];
  return [...base, roleSkill];
}

function useSkill(pet, skill) {
  if (!state.battle || state.battle.waitingPetId !== pet.id) return;
  const enemies = livingEnemies();
  const allies = playerFieldPets().filter((item) => item.hp > 0);
  let log = '';
  if (skill.id === 'attack' || skill.id === 'burst') {
    const target = enemies.sort((a, b) => a.hp - b.hp)[0];
    const bonus = skill.id === 'burst' ? 1.45 : 1;
    log = dealDamage(pet, target, bonus);
  } else if (skill.id === 'guard') {
    pet.guard = 2;
    log = `${pet.name} 防`;
  } else if (skill.id === 'cover') {
    allies.forEach((ally) => { ally.guard = 1; });
    log = `${pet.name} 盾`;
  } else if (skill.id === 'haste') {
    allies.forEach((ally) => { ally.charge = Math.min(ATB_LIMIT, (ally.charge || 0) + 35); });
    log = `${pet.name} 速`;
  } else if (skill.id === 'heal') {
    const target = weakestLiving(allies);
    const amount = Math.ceil(target.maxHp * .38 + pet.power);
    target.hp = Math.min(target.maxHp, target.hp + amount);
    log = `${pet.name} 癒 ${target.name}+${amount}`;
  }
  pet.charge = 0;
  state.battle.waitingPetId = null;
  pushBattleLog(log);
  checkBattleEnd();
  renderBattle();
}

function enemyAct(enemy) {
  const target = weakestLiving(playerFieldPets());
  if (target) pushBattleLog(dealDamage(enemy, target, 1));
  enemy.charge = 0;
  checkBattleEnd();
  renderBattle();
}

function dealDamage(attacker, defender, skillBonus) {
  const multiplier = elementMultiplier(attacker, defender);
  const guardMultiplier = defender.guard > 0 ? .55 : 1;
  const raw = attacker.power + attacker.level * 2 + Math.floor(Math.random() * 5);
  const amount = Math.max(1, Math.round(raw * multiplier * skillBonus * guardMultiplier));
  defender.hp = Math.max(0, defender.hp - amount);
  if (defender.guard > 0) defender.guard -= 1;
  return `${attacker.name}→${defender.name} ${amount}${multiplier > 1 ? 'x' : ''}`;
}

function pushBattleLog(text) {
  state.battle.log.unshift(text);
  state.battle.log = state.battle.log.slice(0, 5);
  resultText.textContent = text;
  playerHand.dataset.log = state.battle.log.join(' / ');
}

function checkBattleEnd() {
  if (livingEnemies().length === 0) finishBattle('win');
  if (playerFieldPets().length === 0 || livingPets().length === 0) finishBattle('lose');
}

function finishBattle(outcome) {
  stopBattleTimer();
  state.battle.running = false;
  state.battle.waitingPetId = null;
  if (outcome === 'win') {
    playerPlayed.classList.add('winner-card');
    opponentPlayed.classList.add('loser-card');
    addConfetti(playerPlayed);
  } else {
    opponentPlayed.classList.add('winner-card');
    playerPlayed.classList.add('loser-card');
    addConfetti(opponentPlayed);
  }
  resolveEncounter(outcome);
  continueButton.classList.remove('is-hidden');
  startButton.disabled = true;
  saveGame(false);
}

function stopBattleTimer() {
  if (battleTimer) clearInterval(battleTimer);
  battleTimer = null;
}

function giveTeamRewards(type, outcome) {
  const win = outcome === 'win';
  const exp = win ? (type === 'boss' ? 70 : 28) : 12;
  const gold = win ? (type === 'boss' ? 95 : 22) : 8;
  state.gold += gold;
  let levelUps = 0;
  state.pets.forEach((pet) => {
    pet.exp += exp;
    if (levelUpIfNeeded(pet)) levelUps += 1;
  });
  return `EXP+${exp} G+${gold}${levelUps ? ` Lv+${levelUps}` : ''}`;
}

function maybeDropPet(type) {
  if (type === 'boss' || Math.random() <= 0.35) {
    const pet = randomPet(Math.max(1, petPowerLevel()));
    state.pets.push(pet);
    return ` 寵+${pet.name}`;
  }
  return '';
}

function resolveEncounter(outcome) {
  if (!state.currentEncounter) return;
  const { type, cell } = state.currentEncounter;
  const rewardText = giveTeamRewards(type, outcome);
  if (outcome === 'win') {
    if (type === 'boss') {
      state.bosses.delete(cell);
      resultText.className = 'win';
      resultText.textContent = `勝｜${rewardText}${maybeDropPet(type)}`;
      if (state.bosses.size === 0) {
        state.victory = true;
        resultText.textContent += '｜通關';
      }
    } else {
      state.enemies.delete(cell);
      resultText.className = 'win';
      resultText.textContent = `勝｜${rewardText}${maybeDropPet(type)}`;
    }
  } else {
    resultText.className = 'lose';
    resultText.textContent = `敗｜${rewardText}`;
    if (livingPets().length === 0) {
      state.gameOver = true;
      resultText.textContent += '｜全滅';
    }
  }
}

function continueMap() {
  state.currentEncounter = null;
  state.battle = null;
  clearBattleEffects();
  showMap();
  if (state.gameOver) {
    diceButton.disabled = true;
    resultText.className = 'lose';
    resultText.textContent = '敗北｜新局再戰';
  } else if (state.victory) {
    diceButton.disabled = true;
    resultText.className = 'win';
    resultText.textContent = '通關｜3 Boss 擊破';
  }
}

function healLivingPets(rate) {
  livingPets().forEach((pet) => {
    pet.hp = Math.min(pet.maxHp, pet.hp + Math.ceil(pet.maxHp * rate));
  });
}

function useItem(key) {
  if (state.inventory[key] <= 0 || state.mode !== 'map') return;
  if (key === 'herb') {
    healLivingPets(0.35);
    resultText.className = 'win';
    resultText.textContent = '藥｜♥';
  }
  if (key === 'ward') {
    state.wardActive = true;
    resultText.className = 'win';
    resultText.textContent = '符｜追殺無效';
  }
  if (key === 'snare') {
    const removed = removeNearestEnemy(2);
    resultText.className = removed ? 'win' : 'lose';
    resultText.textContent = removed ? '網｜退敵' : '網｜無目標';
  }
  if (key === 'whistle') {
    const pet = randomPet(1);
    state.pets.push(pet);
    resultText.className = 'win';
    resultText.textContent = `哨｜${pet.name}`;
  }
  state.inventory[key] -= 1;
  showMap();
}

function removeNearestEnemy(range) {
  const nearest = [...state.enemies]
    .filter((cell) => distanceBetween(cell, state.playerCell) <= range)
    .sort((a, b) => distanceBetween(a, state.playerCell) - distanceBetween(b, state.playerCell))[0];
  if (nearest === undefined) return false;
  state.enemies.delete(nearest);
  return true;
}

function spendGold(cost) {
  if (state.gold < cost) {
    resultText.className = 'lose';
    resultText.textContent = 'G不足';
    return false;
  }
  state.gold -= cost;
  return true;
}

function healPets() {
  if (!spendGold(25)) return;
  healLivingPets(1);
  resultText.className = 'win';
  resultText.textContent = '♥ 全補';
  showMap();
}

function trainActivePet() {
  const pet = state.pets.find((item) => item.id === state.activePetId) || firstLiving(state.pets);
  if (!pet) return;
  if (pet.hp <= 0) {
    resultText.className = 'lose';
    resultText.textContent = '陣亡不可訓';
    showMap();
    return;
  }
  if (!spendGold(30)) return;
  pet.exp += 22;
  const leveled = levelUpIfNeeded(pet);
  resultText.className = 'win';
  resultText.textContent = leveled ? `${pet.name} Lv+` : `${pet.name} EXP+22`;
  showMap();
}

function buyItem(key, cost) {
  if (!spendGold(cost)) return;
  state.inventory[key] += 1;
  resultText.className = 'win';
  resultText.textContent = `${items[key].icon}+1`;
  showMap();
}

function serializeState() {
  return {
    petIdSeed,
    gold: state.gold,
    pets: state.pets,
    activePetId: state.activePetId,
    playerCell: state.playerCell,
    enemies: [...state.enemies],
    bosses: [...state.bosses],
    villagers: [...state.villagers],
    itemCells: [...state.itemCells],
    inventory: state.inventory,
    wardActive: state.wardActive,
    gameOver: state.gameOver,
    victory: state.victory,
    turn: state.turn,
  };
}

function saveGame(showMessage = true) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState()));
    if (showMessage) {
      resultText.className = 'win';
      resultText.textContent = '已存檔';
    }
  } catch {
    if (showMessage) {
      resultText.className = 'lose';
      resultText.textContent = '存檔失敗';
    }
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    petIdSeed = data.petIdSeed || 1;
    state.gold = data.gold ?? 60;
    state.pets = normalizePets(data.pets || []);
    state.activePetId = data.activePetId || state.pets[0]?.id || null;
    state.playerCell = data.playerCell ?? START_CELL;
    state.enemies = new Set(data.enemies || []);
    state.bosses = new Set(data.bosses || BOSS_CELLS);
    state.villagers = new Set(data.villagers || []);
    state.itemCells = new Set(data.itemCells || []);
    state.inventory = { herb: 0, ward: 0, snare: 0, whistle: 0, ...(data.inventory || {}) };
    state.wardActive = Boolean(data.wardActive);
    state.gameOver = Boolean(data.gameOver);
    state.victory = Boolean(data.victory);
    state.turn = data.turn || 1;
    state.mode = 'map';
    state.availableMoves.clear();
    showMap();
    resultText.textContent = '已讀檔';
    return true;
  } catch {
    return false;
  }
}

function normalizePets(pets) {
  return pets.map((pet, index) => {
    const fallback = petCatalog[index % petCatalog.length];
    return {
      ...pet,
      role: pet.role || fallback.role || 'attack',
      charge: pet.charge || 0,
      guard: pet.guard || 0,
      focus: pet.focus || 0,
      hp: Math.max(0, Math.min(pet.hp ?? pet.maxHp ?? fallback.maxHp, pet.maxHp ?? fallback.maxHp)),
    };
  });
}

function clearBattleEffects() {
  [playerPlayed, opponentPlayed].forEach((element) => {
    element.classList.remove('winner-card', 'loser-card');
    element.querySelectorAll('.confetti-piece').forEach((effect) => effect.remove());
  });
}

function addConfetti(target) {
  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement('span');
    const angle = (Math.PI * 2 * index) / 18;
    const distance = 56 + Math.random() * 42;
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--y', `${Math.sin(angle) * distance - 32}px`);
    piece.style.setProperty('--r', `${Math.random() * 360}deg`);
    piece.style.setProperty('--c', confettiColors[index % confettiColors.length]);
    target.append(piece);
  }
}

function resetGame() {
  stopBattleTimer();
  localStorage.removeItem(SAVE_KEY);
  petIdSeed = 1;
  state.mode = 'map';
  state.gold = 60;
  state.pets = [
    makePet(petCatalog[0], 1),
    makePet(petCatalog[1], 1),
    makePet(petCatalog[4], 1),
    makePet(petCatalog[2], 1),
    makePet(petCatalog[3], 1),
  ];
  state.activePetId = state.pets[0].id;
  state.enemyTeam = [];
  state.battle = null;
  state.playerCell = START_CELL;
  state.currentEncounter = null;
  state.availableMoves.clear();
  state.inventory = { herb: 1, ward: 0, snare: 0, whistle: 0 };
  state.wardActive = false;
  state.gameOver = false;
  state.victory = false;
  state.turn = 1;
  buildMapEntities();
  mapText.textContent = '10x10｜3 Boss';
  eventText.textContent = '村/物/敵/王';
  diceValue.textContent = '?';
  resultText.className = '';
  resultText.textContent = '新局';
  clearBattleEffects();
  showMap();
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      $(`#${button.dataset.tab}Tab`).classList.add('is-active');
    });
  });
}

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
continueButton.addEventListener('click', continueMap);
diceButton.addEventListener('click', rollDice);
saveButton.addEventListener('click', () => saveGame(true));
healButton.addEventListener('click', healPets);
trainButton.addEventListener('click', trainActivePet);
buyPotionButton.addEventListener('click', () => buyItem('herb', 15));
buyWardButton.addEventListener('click', () => buyItem('ward', 20));

setupTabs();
if (!loadGame()) resetGame();
