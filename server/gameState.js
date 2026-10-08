const { customAlphabet } = require('nanoid');
const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);

const DEFAULT_UNITS = {
  plane: { count: 10, value: 150, label: 'طائرة' },
  ship: { count: 15, value: 100, label: 'سفينة' },
  car: { count: 20, value: 50, label: 'سيارة' },
};

const rooms = new Map();

function createRoom({ unitConfig, adminPin } = {}) {
  let code;
  do {
    code = genCode();
  } while (rooms.has(code));

  const room = {
    code,
    adminPin,
    status: 'setup', // setup | playing | finished
    unitConfig: unitConfig || DEFAULT_UNITS,
    teams: {}, // teamId -> team
    currentQuestion: null,
    
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code);
}

function totalCells() {
  return 15;
}

function makeTeam(name) {
  const id = 't_' + Math.random().toString(36).slice(2, 10);
  return {
    id,
    name,
    secret: Math.floor(1000 + Math.random() * 9000).toString(),
    socketId: null,
    connected: false,
    board: Array.from({ length: 15 }, () => []), // كل مربع: قائمة وحدات {unit,value} سرية
    hitBoard: Array(15).fill(null), // revealed state: null | {units:[...], hit:true|false}
    remaining: JSON.parse(JSON.stringify(DEFAULT_UNITS)),
    distributed: false,
    score: 0,
  };
}

function addTeam(room, name) {
  const team = makeTeam(name);
  team.remaining = JSON.parse(JSON.stringify(room.unitConfig));
  const totalUnits = Object.values(room.unitConfig).reduce((s, u) => s + u.count, 0);
  team.score = Object.values(room.unitConfig).reduce((s, u) => s + u.count * u.value, 0);
  room.teams[team.id] = team;
  return team;
}

function distributeBoard(room, teamId, placements) {
  // placements: array of 25 entries, each an array of {unit} (can be empty, and a cell can hold multiple units)
  const team = room.teams[teamId];
  if (!team) throw new Error('فريق غير موجود');
  if (!Array.isArray(placements) || placements.length !== 15) {
    throw new Error('يجب تحديد 15 مربع');
  }
  const counts = {};
  for (const key of Object.keys(room.unitConfig)) counts[key] = 0;
  for (const cell of placements) {
    const units = cell || [];
    if (!Array.isArray(units)) throw new Error('صيغة المربع غير صالحة');
    for (const u of units) {
      if (!room.unitConfig[u.unit]) throw new Error('نوع وحدة غير صالح');
      counts[u.unit]++;
    }
  }
  for (const key of Object.keys(room.unitConfig)) {
    if (counts[key] !== room.unitConfig[key].count) {
      throw new Error(`عدد ${room.unitConfig[key].label} غير صحيح`);
    }
  }
  team.board = placements.map((cell) =>
    (cell || []).map((u) => ({ unit: u.unit, value: room.unitConfig[u.unit].value }))
  );
  team.distributed = true;
  return team;
}

function allDistributed(room) {
  const teams = Object.values(room.teams);
  return teams.length > 0 && teams.every((t) => t.distributed);
}

function startGame(room) {
  room.status = 'playing';
}

function showQuestion(room, question) {
  room.currentQuestion = question;
}

function clearQuestion(room) {
  room.currentQuestion = null;
}

function executeBomb(room, targetTeamId, cellIndex) {
  const team = room.teams[targetTeamId];
  if (!team) throw new Error('فريق غير موجود');
  if (cellIndex < 0 || cellIndex >= 15) throw new Error('مربع غير صالح');
  if (team.hitBoard[cellIndex]) throw new Error('تم قصف هذا المربع مسبقًا');

  const units = team.board[cellIndex] || [];
  if (units.length > 0) {
    const totalValue = units.reduce((s, u) => s + u.value, 0);
    team.hitBoard[cellIndex] = { units, value: totalValue, hit: true };
    team.score -= totalValue;
  } else {
    team.hitBoard[cellIndex] = { units: [], value: 0, hit: false };
  }
  return { team, result: team.hitBoard[cellIndex] };
}

function finishGame(room) {
  room.status = 'finished';
  const ranking = Object.values(room.teams)
    .map((t) => ({ id: t.id, name: t.name, score: t.score }))
    .sort((a, b) => b.score - a.score);
  return ranking;
}

function publicTeamsView(room, { revealBoards = false, isAdmin = false } = {}) {
  const out = {};
  for (const [id, t] of Object.entries(room.teams)) {
    out[id] = {
      id: t.id,
      name: t.name,
      connected: t.connected,
      distributed: t.distributed,
      score: t.score,
      hitBoard: t.hitBoard,
      board: revealBoards ? t.board : undefined,
      secret: isAdmin ? t.secret : undefined,
    };
  }
  return out;
}

function removeRoom(code) {
  rooms.delete(code);
}

module.exports = {
  DEFAULT_UNITS,
  createRoom,
  getRoom,
  addTeam,
  distributeBoard,
  allDistributed,
  startGame,
  showQuestion,
  clearQuestion,
  executeBomb,
  finishGame,
  publicTeamsView,
  removeRoom,
  totalCells,
};
