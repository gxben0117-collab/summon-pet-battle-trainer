const MAP_SIZE = 10;
const START_CELL = 90;
const BOSS_CELLS = [9, 0, 99];
const ENEMY_COUNT = 20;
const VILLAGER_COUNT = 7;
const ITEM_COUNT = 9;
const confettiColors = ['#f5b84b', '#4bc6a8', '#ef6b6b', '#67a7ff', '#f5f7fb'];
let petIdSeed = 1;

const elements = {
  wood: { name: '木', icon: '木', beats: 'earth' },
  fire: { name: '火', icon: '火', beats: 'metal' },
  earth: { name: '土', icon: '土', beats: 'water' },
  metal: { name: '金', icon: '金', beats: 'wood' },
  water: { name: '水', icon: '水', beats: 'fire' },
};

const petCatalog = [
  { name: '芽靈', element: 'wood', icon: '芽', power: 8, maxHp: 30, speed: 7 },
  { name: '炎尾', element: 'fire', icon: '炎', power: 10, maxHp: 24, speed: 9 },
  { name: '岩甲', element: 'earth', icon: '岩', power: 7, maxHp: 38, speed: 4 },
  { name: '鋼爪', element: 'metal', icon: '鋼', power: 9, maxHp: 28, speed: 6 },
  { name: '浪鰭', element: 'water', icon: '浪', power: 8, maxHp: 32, speed: 6 },
  { name: '藤鹿', element: 'wood', icon: '藤', power: 9, maxHp: 29, speed: 8 },
  { name: '燼狐', element: 'fire', icon: '燼', power: 11, maxHp: 23, speed: 10 },
  { name: '泥衛', element: 'earth', icon: '泥', power: 8, maxHp: 36, speed: 5 },
  { name: '鏡狼', element: 'metal', icon: '鏡', power: 10, maxHp: 27, speed: 7 },
  { name: '霧龜', element: 'water', icon: '霧', power: 7, maxHp: 40, speed: 3 },
  { name: '森貓', element: 'wood', icon: '森', power: 7, maxHp: 34, speed: 9 },
  { name: '焰鷹', element: 'fire', icon: '焰', power: 12, maxHp: 22, speed: 11 },
  { name: '晶蛇', element: 'earth', icon: '晶', power: 10, maxHp: 33, speed: 5 },
  { name: '銀獅', element: 'metal', icon: '銀', power: 11, maxHp: 30, speed: 7 },
  { name: '潮蛙', element: 'water', icon: '潮', power: 9, maxHp: 31, speed: 8 },
];

const items = {
  herb: { name: '藥草', icon: '藥', description: '回復全隊未陣亡寵物 35% HP' },
  ward: { name: '守護符', icon: '符', description: '下一次敵方追殺回合無效' },
  snare: { name: '捕網', icon: '網', description: '移除距離 2 格內最近的一名敵人' },
  whistle: { name: '呼哨', icon: '哨', description: '召喚一隻 Lv.1 隨機寵物' },
};

const state = {
  mode: 'map',
  gold: 60,
  pets: [],
  activePetId: null,
  enemyTeam: [],
  battleOver: false,
  playerCell: START_CELL,
  enemies: new Set(),
  bosses: new Set(BOSS_CELLS),
  villagers: new Set(),
  itemCells: new Set(),
  currentEncounter: null,
  availableMoves: new Set(),
  currentRoll: 0,
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
const healButton = $('#healButton');
const trainButton = $('#trainButton');
const buyPotionButton = $('#buyPotionButton');
const buyWardButton = $('#buyWardButton');
const bagActions = $('#bagActions');
const teamSummary = $('#teamSummary');
const eventText = $('#eventText');
const deckBuilder = $('#deckBuilder');
const handArea = $('#handArea');
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

function rowOf(cell) {
  return Math.floor(cell / MAP_SIZE);
}

function colOf(cell) {
  return cell % MAP_SIZE;
}

function cellOf(row, col) {
  return row * MAP_SIZE + col;
}

function distanceBetween(a, b) {
  return Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makePet(template, level = 1) {
  const pet = {
    id: `pet-${petIdSeed}`,
    name: template.name,
    element: template.element,
    icon: template.icon,
    level,
    exp: 0,
    power: template.power + (level - 1) * 2,
    maxHp: template.maxHp + (level - 1) * 7,
    speed: template.speed + Math.floor((level - 1) / 2),
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

function petPowerLevel() {
  return Math.max(1, ...state.pets.map((pet) => pet.level));
}

function livingPets() {
  return state.pets.filter((pet) => pet.hp > 0);
}

function livingEnemies() {
  return state.enemyTeam.filter((pet) => pet.hp > 0);
}

function teamText() {
  return `${livingPets().length}/${state.pets.length}`;
}

function threatText() {
  return `${state.enemies.size}+${state.bosses.size}`;
}

function occupiedCells() {
  return new Set([
    START_CELL,
    ...state.bosses,
    ...state.enemies,
    ...state.villagers,
    ...state.itemCells,
  ]);
}

function placeSet(count, blocked, minStartDistance = 0) {
  const placed = new Set();
  const candidates = [];
  for (let cell = 0; cell < MAP_SIZE * MAP_SIZE; cell += 1) {
    if (!blocked.has(cell) && distanceBetween(cell, START_CELL) >= minStartDistance) {
      candidates.push(cell);
    }
  }
  while (placed.size < count && candidates.length > 0) {
    const index = Math.floor(Math.random() * candidates.length);
    const cell = candidates.splice(index, 1)[0];
    placed.add(cell);
    blocked.add(cell);
  }
  return placed;
}

function buildMapEntities() {
  state.bosses = new Set(BOSS_CELLS);
  state.enemies = new Set();
  state.villagers = new Set();
  state.itemCells = new Set();
  const blocked = occupiedCells();
  state.enemies = placeSet(ENEMY_COUNT, blocked, 3);
  state.villagers = placeSet(VILLAGER_COUNT, blocked, 2);
  state.itemCells = placeSet(ITEM_COUNT, blocked, 2);
}

function getAvailableMoves(roll) {
  const moves = new Set();
  for (let cell = 0; cell < MAP_SIZE * MAP_SIZE; cell += 1) {
    const distance = distanceBetween(state.playerCell, cell);
    if (distance > 0 && distance <= roll) {
      moves.add(cell);
    }
  }
  return moves;
}

function renderPetCard(pet, note = '') {
  const element = elements[pet.element];
  const hp = `${pet.hp}/${pet.maxHp}`;
  return `
    <span class="pet-icon element-${pet.element}">${pet.icon}</span>
    <strong>${pet.name}</strong>
    <small class="stat-line"><span>${element.icon}</span><span>Lv.${pet.level}</span><span>♥ ${hp}</span></small>
    <small class="stat-line"><span>拳 ${pet.power}</span><span>速 ${pet.speed}</span><span>EXP ${pet.exp}/${nextExp(pet)}</span></small>
    ${note ? `<small>${note}</small>` : ''}
  `;
}

function renderRoster() {
  deckChoices.innerHTML = '';
  state.pets.forEach((pet) => {
    const button = document.createElement('button');
    button.className = pet.id === state.activePetId ? 'pet-card selected-pet' : 'pet-card';
    if (pet.hp <= 0) button.classList.add('fainted-pet');
    button.type = 'button';
    button.innerHTML = renderPetCard(pet, pet.hp <= 0 ? '陣亡' : '訓練目標');
    button.addEventListener('click', () => {
      state.activePetId = pet.id;
      renderRoster();
      resultText.textContent = `${pet.name} 成為訓練目標。`;
    });
    deckChoices.append(button);
  });
  teamSummary.textContent = `Lv.${petPowerLevel()}｜${teamText()} 存活`;
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
  state.mode = 'map';
  mapScreen.classList.remove('is-hidden');
  battleScreen.classList.add('is-hidden');
  continueButton.classList.add('is-hidden');
  diceButton.disabled = state.gameOver || state.victory || state.availableMoves.size > 0;
  playerScore.textContent = teamText();
  opponentScore.textContent = threatText();
  roundNumber.textContent = `金幣 ${state.gold}`;
  renderRoster();
  renderInventory();
  renderMap();
}

function rollDice() {
  if (state.mode !== 'map' || state.gameOver || state.victory || state.availableMoves.size > 0) return;

  const roll = Math.floor(Math.random() * 6) + 1;
  state.currentRoll = roll;
  state.availableMoves = getAvailableMoves(roll);
  diceValue.textContent = roll;
  diceButton.disabled = true;
  resultText.className = '';
  resultText.textContent = `第 ${state.turn} 回合，骰出 ${roll} 點。`;
  mapText.textContent = '選擇亮起格子移動；移動後敵人會追殺一格。';
  renderMap();
}

function moveToCell(cell) {
  if (!state.availableMoves.has(cell) || state.gameOver || state.victory) return;
  state.playerCell = cell;
  state.availableMoves.clear();
  state.currentRoll = 0;
  renderMap();

  if (resolveCellEvent(cell)) return;
  finishPlayerMapMove();
}

function resolveCellEvent(cell) {
  if (state.bosses.has(cell)) {
    startEncounter('boss', cell);
    return true;
  }
  if (state.enemies.has(cell)) {
    startEncounter('enemy', cell);
    return true;
  }
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
  if (caughtCell !== null) {
    startEncounter('enemy', caughtCell);
    return;
  }
  resultText.className = '';
  resultText.textContent = hadWard ? '守護符生效，敵方追殺回合被跳過。' : '敵方已追殺一格，暫時安全。';
  mapText.textContent = `目前位置：第 ${rowOf(state.playerCell) + 1} 排，第 ${colOf(state.playerCell) + 1} 格。`;
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
  const candidates = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ]
    .filter(([nextRow, nextCol]) => nextRow >= 0 && nextRow < MAP_SIZE && nextCol >= 0 && nextCol < MAP_SIZE)
    .map(([nextRow, nextCol]) => cellOf(nextRow, nextCol))
    .filter((cell) => !occupied.has(cell) && !state.villagers.has(cell) && !state.itemCells.has(cell));

  candidates.sort((a, b) => distanceBetween(a, state.playerCell) - distanceBetween(b, state.playerCell));
  return candidates[0] || enemyCell;
}

function villagerHelp() {
  const roll = Math.floor(Math.random() * 5);
  let message = '';
  if (roll === 0) {
    healLivingPets(0.45);
    message = '村民替未陣亡寵物包紮。';
  } else if (roll === 1) {
    state.gold += 35;
    message = '村民送你 35G 旅費。';
  } else if (roll === 2) {
    const itemKey = randomFrom(Object.keys(items));
    state.inventory[itemKey] += 1;
    message = `村民給你 ${items[itemKey].name}。`;
  } else if (roll === 3) {
    livingPets().forEach((pet) => {
      pet.exp += 12;
      levelUpIfNeeded(pet);
    });
    message = '村民分享訓練心得，全隊獲得 12 EXP。';
  } else {
    removeNearestEnemy(3);
    message = '村民指出捷徑，最近的敵人被甩開。';
  }
  eventText.textContent = message;
  resultText.className = 'win';
  resultText.textContent = message;
}

function pickupItem() {
  const itemKey = randomFrom(Object.keys(items));
  state.inventory[itemKey] += 1;
  eventText.textContent = `撿到 ${items[itemKey].name}：${items[itemKey].description}`;
  resultText.className = 'win';
  resultText.textContent = `撿到 ${items[itemKey].name}。`;
}

function startEncounter(type, cell) {
  const enemyLevel = type === 'boss' ? petPowerLevel() + 2 + (3 - state.bosses.size) : Math.max(1, petPowerLevel() + Math.floor(Math.random() * 2));
  const enemyCount = type === 'boss' ? 4 : Math.random() < 0.22 ? 2 : 1;
  state.mode = 'battle';
  state.currentEncounter = { type, cell };
  state.enemyTeam = Array.from({ length: enemyCount }, (_, index) => {
    const pet = randomPet(enemyLevel + (type === 'boss' ? Math.floor(index / 2) : 0));
    pet.name = type === 'boss' ? `守關${pet.name}` : `野生${pet.name}`;
    if (type === 'boss') {
      pet.maxHp += 22;
      pet.hp = pet.maxHp;
    }
    return pet;
  });
  state.battleOver = false;
  clearBattleEffects();
  mapScreen.classList.add('is-hidden');
  battleScreen.classList.remove('is-hidden');
  continueButton.classList.add('is-hidden');
  deckBuilder.classList.remove('is-hidden');
  handArea.classList.add('is-hidden');
  renderBattleSetup();

  const encounterName = type === 'boss' ? '守關 Boss' : '追殺對手';
  statusText.textContent = `${encounterName} 出現。全隊寵物會自動上場。`;
  resultText.className = '';
  resultText.textContent = `遭遇 ${encounterName}！`;
}

function renderBattleSetup() {
  battleChoices.innerHTML = '';
  state.pets.forEach((pet) => {
    const card = document.createElement('article');
    card.className = pet.hp > 0 ? 'pet-card' : 'pet-card fainted-pet';
    card.innerHTML = renderPetCard(pet, pet.hp > 0 ? '自動上場' : '陣亡');
    battleChoices.append(card);
  });
  deckSlots.innerHTML = '<div class="rules-box">全隊自動戰鬥。五行相剋 1.2 倍。打輸也有 EXP/G；全隊陣亡且無復活時遊戲失敗。</div>';
  startButton.disabled = livingPets().length === 0;
  opponentHand.innerHTML = state.enemyTeam
    .map((pet) => `<article class="pet-card enemy-pet-card">${renderPetCard(pet, '敵方')}</article>`)
    .join('');
  setBattleCards();
}

function firstLivingPet(team) {
  return team.find((pet) => pet.hp > 0) || null;
}

function setBattleCards() {
  const pet = firstLivingPet(state.pets);
  const enemy = firstLivingPet(state.enemyTeam);
  playerPlayed.className = pet ? 'played-card pet-battle-card' : 'played-card empty-card';
  playerPlayed.innerHTML = pet ? renderPetCard(pet, '我方先鋒') : '<span class="card-mark">倒</span><small>全隊陣亡</small>';
  opponentPlayed.className = enemy ? 'played-card pet-battle-card' : 'played-card empty-card';
  opponentPlayed.innerHTML = enemy ? renderPetCard(enemy, '敵方先鋒') : '<span class="card-mark">勝</span><small>敵方倒下</small>';
}

function startGame() {
  if (livingPets().length === 0 || state.battleOver) return;
  deckBuilder.classList.add('is-hidden');
  handArea.classList.remove('is-hidden');
  statusText.textContent = '全隊寵物自動上場，直到一方全滅。';
  autoBattle();
}

function calculateDamage(attacker, defender) {
  const multiplier = elementMultiplier(attacker, defender);
  const raw = attacker.power + attacker.level * 2 + Math.floor(Math.random() * 5);
  return {
    amount: Math.max(1, Math.round(raw * multiplier)),
    advantage: multiplier > 1,
  };
}

function attackOnce(attacker, defender) {
  const damage = calculateDamage(attacker, defender);
  defender.hp = Math.max(0, defender.hp - damage.amount);
  return `${attacker.name} ${damage.amount}${damage.advantage ? ' x1.2' : ''}`;
}

function autoBattle() {
  const logs = [];
  let round = 1;

  while (livingPets().length > 0 && livingEnemies().length > 0 && round <= 50) {
    const fighters = [...livingPets(), ...livingEnemies()].sort((a, b) => b.speed - a.speed);
    logs.push(`R${round}`);
    for (const fighter of fighters) {
      if (fighter.hp <= 0) continue;
      const isPlayerPet = state.pets.includes(fighter);
      const target = isPlayerPet ? firstLivingPet(state.enemyTeam) : firstLivingPet(state.pets);
      if (!target) break;
      logs.push(attackOnce(fighter, target));
    }
    round += 1;
  }

  setBattleCards();
  playerHand.innerHTML = `<div class="battle-log-lines">${logs.slice(0, 26).join('｜')}${logs.length > 26 ? '｜...' : ''}</div>`;
  resultText.className = '';
  resultText.textContent = logs.slice(0, 12).join('｜') + (logs.length > 12 ? '｜...' : '');
  finishBattle(livingEnemies().length === 0 ? 'win' : 'lose');
}

function finishBattle(outcome) {
  state.battleOver = true;
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
  statusText.textContent = state.gameOver ? '全隊寵物陣亡，冒險失敗。' : '戰鬥結束，可以返回地圖。';
  continueButton.textContent = state.gameOver || state.victory ? '查看地圖' : '返回地圖';
  continueButton.classList.remove('is-hidden');
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
  return `全隊獲得 ${exp} EXP、${gold}G${levelUps ? `，${levelUps} 隻升級` : ''}。`;
}

function maybeDropPet(type) {
  if (type === 'boss' || Math.random() <= 0.35) {
    const pet = randomPet(Math.max(1, petPowerLevel()));
    state.pets.push(pet);
    return ` 掉落寵物：${pet.name} 加入。`;
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
      resultText.textContent += ` ${rewardText} Boss 擊破。${maybeDropPet(type)}`;
      if (state.bosses.size === 0) {
        state.victory = true;
        resultText.textContent += ' 三位 Boss 全部倒下，通關！';
      }
    } else {
      state.enemies.delete(cell);
      resultText.className = 'win';
      resultText.textContent += ` ${rewardText} 追殺對手已清除。${maybeDropPet(type)}`;
    }
    return;
  }

  resultText.className = 'lose';
  resultText.textContent += ` ${rewardText}`;
  if (livingPets().length === 0) {
    state.gameOver = true;
    resultText.textContent += ' 全隊寵物陣亡，且不能復活，冒險失敗。';
  }
}

function continueMap() {
  state.currentEncounter = null;
  clearBattleEffects();
  showMap();

  if (state.gameOver) {
    diceButton.disabled = true;
    resultText.className = 'lose';
    resultText.textContent = '冒險失敗。按重新開始再挑戰。';
    return;
  }

  if (state.victory) {
    diceButton.disabled = true;
    resultText.className = 'win';
    resultText.textContent = '通關完成！三位 Boss 已被擊敗。';
    return;
  }

  resultText.className = '';
  resultText.textContent = '回到地圖。規劃路線、利用村民和道具。';
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
    resultText.textContent = '使用藥草，未陣亡寵物回復 HP。';
  }
  if (key === 'ward') {
    state.wardActive = true;
    resultText.className = 'win';
    resultText.textContent = '守護符啟動：下一次敵方追殺無效。';
  }
  if (key === 'snare') {
    const removed = removeNearestEnemy(2);
    resultText.className = removed ? 'win' : 'lose';
    resultText.textContent = removed ? '捕網移除最近的敵人。' : '附近沒有可捕捉敵人。';
  }
  if (key === 'whistle') {
    const pet = randomPet(1);
    state.pets.push(pet);
    resultText.className = 'win';
    resultText.textContent = `呼哨召喚 ${pet.name} 加入隊伍。`;
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
    resultText.textContent = '金幣不足。';
    return false;
  }
  state.gold -= cost;
  return true;
}

function healPets() {
  if (!spendGold(25)) return;
  healLivingPets(1);
  resultText.className = 'win';
  resultText.textContent = '所有未陣亡寵物已完全回血。陣亡寵物不能復活。';
  showMap();
}

function trainActivePet() {
  const pet = state.pets.find((item) => item.id === state.activePetId) || firstLivingPet(state.pets);
  if (!pet) return;
  if (pet.hp <= 0) {
    resultText.className = 'lose';
    resultText.textContent = '陣亡寵物無法訓練或復活。';
    showMap();
    return;
  }
  if (!spendGold(30)) return;
  pet.exp += 22;
  const leveled = levelUpIfNeeded(pet);
  resultText.className = 'win';
  resultText.textContent = leveled ? `${pet.name} 訓練後升級！` : `${pet.name} 獲得 22 EXP。`;
  showMap();
}

function buyItem(key, cost) {
  if (!spendGold(cost)) return;
  state.inventory[key] += 1;
  resultText.className = 'win';
  resultText.textContent = `購買 ${items[key].name}。`;
  showMap();
}

function clearBattleEffects() {
  [playerPlayed, opponentPlayed].forEach((element) => {
    element.classList.remove('winner-card', 'loser-card', 'draw-card', 'champion-card');
    element.querySelectorAll('.confetti-piece, .crown-badge').forEach((effect) => effect.remove());
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
  petIdSeed = 1;
  state.mode = 'map';
  state.gold = 60;
  state.pets = [
    makePet(petCatalog[0], 1),
    makePet(petCatalog[1], 1),
    makePet(petCatalog[4], 1),
    makePet(petCatalog[2], 1),
  ];
  state.activePetId = state.pets[0].id;
  state.enemyTeam = [];
  state.battleOver = false;
  state.playerCell = START_CELL;
  state.currentEncounter = null;
  state.availableMoves.clear();
  state.currentRoll = 0;
  state.inventory = { herb: 1, ward: 0, snare: 0, whistle: 0 };
  state.wardActive = false;
  state.gameOver = false;
  state.victory = false;
  state.turn = 1;
  buildMapEntities();
  deckBuilder.classList.remove('is-hidden');
  handArea.classList.add('is-hidden');
  continueButton.classList.add('is-hidden');
  statusText.textContent = '全隊寵物會自動上場。';
  mapText.textContent = '10x10 地圖。擊敗 3 位 Boss 前，敵人會每回合追殺。';
  eventText.textContent = '找村民、撿道具、避開追殺。';
  diceValue.textContent = '?';
  resultText.className = '';
  resultText.textContent = '新地圖生成：20 敵人、3 Boss、村民與道具已配置。';
  clearBattleEffects();
  showMap();
}

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
continueButton.addEventListener('click', continueMap);
diceButton.addEventListener('click', rollDice);
healButton.addEventListener('click', healPets);
trainButton.addEventListener('click', trainActivePet);
buyPotionButton.addEventListener('click', () => buyItem('herb', 15));
buyWardButton.addEventListener('click', () => buyItem('ward', 20));

resetGame();
