const MAP_SIZE = 9;
const START_CELL = 72;
const BOSS_CELL = 8;
const ENEMY_COUNT = 10;
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
];

const state = {
  mode: 'map',
  gold: 40,
  pets: [],
  activePetId: null,
  enemyTeam: [],
  battleOver: false,
  playerCell: START_CELL,
  enemies: new Set(),
  currentEncounter: null,
  availableMoves: new Set(),
  currentRoll: 0,
  bossDefeated: false,
  gameOver: false,
};

const deckChoices = document.querySelector('#deckChoices');
const battleChoices = document.querySelector('#battleChoices');
const deckSlots = document.querySelector('#deckSlots');
const opponentHand = document.querySelector('#opponentHand');
const playerHand = document.querySelector('#playerHand');
const startButton = document.querySelector('#startButton');
const resetButton = document.querySelector('#resetButton');
const continueButton = document.querySelector('#continueButton');
const healButton = document.querySelector('#healButton');
const trainButton = document.querySelector('#trainButton');
const deckBuilder = document.querySelector('#deckBuilder');
const handArea = document.querySelector('#handArea');
const playerPlayed = document.querySelector('#playerPlayed');
const opponentPlayed = document.querySelector('#opponentPlayed');
const playerScore = document.querySelector('#playerScore');
const opponentScore = document.querySelector('#opponentScore');
const roundNumber = document.querySelector('#roundNumber');
const statusText = document.querySelector('#statusText');
const resultText = document.querySelector('#resultText');
const mapScreen = document.querySelector('#mapScreen');
const battleScreen = document.querySelector('#battleScreen');
const mapBoard = document.querySelector('#mapBoard');
const mapText = document.querySelector('#mapText');
const diceButton = document.querySelector('#diceButton');
const diceValue = document.querySelector('#diceValue');

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
  return makePet(petCatalog[Math.floor(Math.random() * petCatalog.length)], level);
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

function remainingEnemyCount() {
  return state.enemies.size + (state.bossDefeated ? 0 : 1);
}

function buildEnemies() {
  const candidates = [];
  for (let cell = 0; cell < MAP_SIZE * MAP_SIZE; cell += 1) {
    const tooCloseToStart = distanceBetween(cell, START_CELL) <= 2;
    if (cell !== START_CELL && cell !== BOSS_CELL && !tooCloseToStart) {
      candidates.push(cell);
    }
  }

  state.enemies = new Set();
  while (state.enemies.size < ENEMY_COUNT && candidates.length > 0) {
    const pick = Math.floor(Math.random() * candidates.length);
    state.enemies.add(candidates.splice(pick, 1)[0]);
  }
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

function renderPetCard(pet, extraClass = '') {
  const element = elements[pet.element];
  const hp = `${pet.hp}/${pet.maxHp}`;
  return `
    <span class="pet-icon element-${pet.element}">${pet.icon}</span>
    <strong>${pet.name}</strong>
    <small class="stat-line"><span>${element.icon}</span><span>Lv.${pet.level}</span><span>♥ ${hp}</span></small>
    <small class="stat-line"><span>拳 ${pet.power}</span><span>速 ${pet.speed}</span><span>EXP ${pet.exp}/${nextExp(pet)}</span></small>
    ${extraClass ? `<small>${extraClass}</small>` : ''}
  `;
}

function renderRoster() {
  deckChoices.innerHTML = '';
  state.pets.forEach((pet) => {
    const button = document.createElement('button');
    button.className = pet.id === state.activePetId ? 'pet-card selected-pet' : 'pet-card';
    button.type = 'button';
    button.innerHTML = renderPetCard(pet, pet.hp <= 0 ? '陣亡' : '訓練目標');
    button.addEventListener('click', () => {
      state.activePetId = pet.id;
      renderRoster();
      resultText.textContent = `${pet.name} 成為訓練目標。`;
    });
    deckChoices.append(button);
  });
}

function renderMap() {
  mapBoard.innerHTML = '';

  for (let cell = 0; cell < MAP_SIZE * MAP_SIZE; cell += 1) {
    const tile = document.createElement('button');
    tile.className = 'map-tile';
    tile.type = 'button';
    tile.disabled = !state.availableMoves.has(cell);

    if (cell === START_CELL) {
      tile.classList.add('start-tile');
      tile.innerHTML = '<span>起</span>';
    }

    if (cell === BOSS_CELL) {
      tile.classList.add('boss-tile');
      tile.innerHTML = state.bossDefeated ? '<span>♛</span>' : '<span>王</span>';
    }

    if (state.enemies.has(cell)) {
      tile.classList.add('enemy-tile');
      tile.innerHTML = '<span>敵</span>';
    }

    if (state.availableMoves.has(cell)) {
      tile.classList.add('move-tile');
      tile.addEventListener('click', () => moveToCell(cell));
    }

    if (cell === state.playerCell) {
      tile.classList.add('player-tile');
      tile.innerHTML = '<span class="hero-token">訓</span>';
      tile.disabled = true;
    }

    mapBoard.append(tile);
  }
}

function showMap() {
  state.mode = 'map';
  mapScreen.classList.remove('is-hidden');
  battleScreen.classList.add('is-hidden');
  continueButton.classList.add('is-hidden');
  diceButton.disabled = state.gameOver || state.bossDefeated || state.availableMoves.size > 0;
  playerScore.textContent = teamText();
  opponentScore.textContent = remainingEnemyCount();
  roundNumber.textContent = `金幣 ${state.gold}`;
  renderRoster();
  renderMap();
}

function rollDice() {
  if (state.mode !== 'map' || state.gameOver || state.bossDefeated || state.availableMoves.size > 0) return;

  const roll = Math.floor(Math.random() * 6) + 1;
  state.currentRoll = roll;
  state.availableMoves = getAvailableMoves(roll);
  diceValue.textContent = roll;
  diceButton.disabled = true;
  resultText.className = '';
  resultText.textContent = `骰出 ${roll} 點。請點選亮起的格子移動。`;
  mapText.textContent = `你移動後，敵方會往你靠近一格。五行相剋有 1.2 倍傷害。`;
  renderMap();
}

function moveToCell(cell) {
  if (!state.availableMoves.has(cell) || state.gameOver) return;
  state.playerCell = cell;
  state.availableMoves.clear();
  state.currentRoll = 0;
  renderMap();

  if (cell === BOSS_CELL && !state.bossDefeated) {
    startEncounter('boss', cell);
    return;
  }

  if (state.enemies.has(cell)) {
    startEncounter('enemy', cell);
    return;
  }

  const caughtCell = moveEnemies();
  if (caughtCell !== null) {
    startEncounter('enemy', caughtCell);
    return;
  }

  resultText.className = '';
  resultText.textContent = '敵方已移動，暫時沒有被追上。可以繼續丟骰子。';
  mapText.textContent = `目前座標：第 ${rowOf(state.playerCell) + 1} 排，第 ${colOf(state.playerCell) + 1} 格。`;
  diceButton.disabled = false;
  renderMap();
}

function moveEnemies() {
  const occupied = new Set();
  const movedEnemies = new Set();
  const sortedEnemies = [...state.enemies].sort((a, b) => distanceBetween(a, state.playerCell) - distanceBetween(b, state.playerCell));

  for (let index = 0; index < sortedEnemies.length; index += 1) {
    const enemyCell = sortedEnemies[index];
    const nextCell = bestEnemyStep(enemyCell, occupied);
    if (nextCell === state.playerCell) {
      movedEnemies.add(nextCell);
      for (let rest = index + 1; rest < sortedEnemies.length; rest += 1) {
        movedEnemies.add(sortedEnemies[rest]);
      }
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
    .filter((cell) => cell !== BOSS_CELL && !occupied.has(cell));

  candidates.sort((a, b) => distanceBetween(a, state.playerCell) - distanceBetween(b, state.playerCell));
  return candidates[0] || enemyCell;
}

function startEncounter(type, cell) {
  const enemyLevel = type === 'boss' ? petPowerLevel() + 2 : Math.max(1, petPowerLevel() + Math.floor(Math.random() * 2));
  const enemyCount = type === 'boss' ? 3 : 1;
  state.mode = 'battle';
  state.currentEncounter = { type, cell };
  state.enemyTeam = Array.from({ length: enemyCount }, (_, index) => {
    const pet = randomPet(enemyLevel + (type === 'boss' ? index : 0));
    pet.name = type === 'boss' ? `守關${pet.name}` : `野生${pet.name}`;
    if (type === 'boss') {
      pet.maxHp += 18;
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
  statusText.textContent = `${encounterName} 逼近。整隊寵物將自動上場。`;
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
  deckSlots.innerHTML = '<div class="rules-box">全隊自動戰鬥。木克土、土克水、水克火、火克金、金克木，克制時傷害 1.2 倍。全隊陣亡且不能復活時，遊戲失敗。</div>';
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
  if (!pet) {
    playerPlayed.className = 'played-card empty-card';
    playerPlayed.innerHTML = '<span class="card-mark">倒</span><small>全隊陣亡</small>';
  } else {
    playerPlayed.className = 'played-card pet-battle-card';
    playerPlayed.innerHTML = renderPetCard(pet, '我方先鋒');
  }

  if (!enemy) {
    opponentPlayed.className = 'played-card empty-card';
    opponentPlayed.innerHTML = '<span class="card-mark">勝</span><small>敵方倒下</small>';
  } else {
    opponentPlayed.className = 'played-card pet-battle-card';
    opponentPlayed.innerHTML = renderPetCard(enemy, '敵方先鋒');
  }
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

  while (livingPets().length > 0 && livingEnemies().length > 0 && round <= 40) {
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
  resultText.className = '';
  resultText.textContent = logs.slice(0, 18).join('｜') + (logs.length > 18 ? '｜...' : '');

  if (livingEnemies().length === 0) {
    finishBattle('win');
  } else {
    finishBattle('lose');
  }
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
  continueButton.textContent = state.gameOver ? '查看地圖' : '返回地圖';
  continueButton.classList.remove('is-hidden');
  playerHand.innerHTML = '';
}

function giveTeamRewards(type, outcome) {
  const win = outcome === 'win';
  const exp = win ? (type === 'boss' ? 55 : 24) : 10;
  const gold = win ? (type === 'boss' ? 70 : 18) : 6;
  state.gold += gold;

  let levelUps = 0;
  state.pets.forEach((pet) => {
    pet.exp += exp;
    if (levelUpIfNeeded(pet)) levelUps += 1;
  });

  return `全隊獲得 ${exp} EXP、${gold} 金幣${levelUps ? `，${levelUps} 隻寵物升級` : ''}。`;
}

function maybeDropPet() {
  if (Math.random() > 0.35) return '';
  const pet = randomPet(Math.max(1, petPowerLevel()));
  state.pets.push(pet);
  return ` 掉落寵物：${pet.name} 加入隊伍。`;
}

function resolveEncounter(outcome) {
  if (!state.currentEncounter) return;
  const { type, cell } = state.currentEncounter;
  const rewardText = giveTeamRewards(type, outcome);

  if (type === 'boss' && outcome === 'win') {
    state.bossDefeated = true;
    mapText.textContent = '你擊敗守關 Boss，皇冠已插在終點。';
    resultText.className = 'win';
    resultText.textContent += ` ${rewardText} Boss 被擊敗，地圖通關！`;
    return;
  }

  if (type === 'enemy' && outcome === 'win') {
    state.enemies.delete(cell);
    resultText.className = 'win';
    resultText.textContent += ` ${rewardText} 追殺對手已清除。${maybeDropPet()}`;
    return;
  }

  if (outcome === 'lose') {
    resultText.className = 'lose';
    resultText.textContent += ` ${rewardText}`;
    if (livingPets().length === 0) {
      state.gameOver = true;
      resultText.textContent += ' 全隊寵物陣亡，且不能復活，冒險失敗。';
    }
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

  if (state.bossDefeated) {
    diceButton.disabled = true;
    resultText.className = 'win';
    resultText.textContent = '通關完成！皇冠在 Boss 格上閃閃發亮。';
    return;
  }

  resultText.className = '';
  resultText.textContent = '回到地圖。你移動後，敵方會再追殺一格。';
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
  if (!spendGold(20)) return;
  state.pets.forEach((pet) => {
    if (pet.hp > 0) pet.hp = pet.maxHp;
  });
  resultText.className = 'win';
  resultText.textContent = '所有未陣亡寵物已回血。陣亡寵物無法復活。';
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
  if (!spendGold(25)) return;
  pet.exp += 18;
  const leveled = levelUpIfNeeded(pet);
  resultText.className = 'win';
  resultText.textContent = leveled ? `${pet.name} 訓練後升級了！` : `${pet.name} 獲得 18 EXP。`;
  showMap();
}

function resetGame() {
  state.mode = 'map';
  state.gold = 40;
  state.pets = [
    makePet(petCatalog[0], 1),
    makePet(petCatalog[1], 1),
    makePet(petCatalog[4], 1),
  ];
  state.activePetId = state.pets[0].id;
  state.enemyTeam = [];
  state.battleOver = false;
  state.playerCell = START_CELL;
  state.currentEncounter = null;
  state.availableMoves.clear();
  state.currentRoll = 0;
  state.bossDefeated = false;
  state.gameOver = false;
  buildEnemies();
  deckBuilder.classList.remove('is-hidden');
  handArea.classList.add('is-hidden');
  continueButton.classList.add('is-hidden');
  continueButton.textContent = '返回地圖';
  statusText.textContent = '整隊寵物會自動上場。';
  mapText.textContent = '你移動後敵方會追殺。遇到敵人就整隊寵物自動戰鬥。';
  diceValue.textContent = '?';
  resultText.className = '';
  resultText.textContent = '地圖已生成：10 位追殺對手和 1 位守關 Boss。';
  clearBattleEffects();
  showMap();
}

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
continueButton.addEventListener('click', continueMap);
diceButton.addEventListener('click', rollDice);
healButton.addEventListener('click', healPets);
trainButton.addEventListener('click', trainActivePet);

resetGame();
