const socket = io();

let roomCode = null;
let teamId = null;
let unitConfig = null;
let placements = Array(15).fill(null);
let selectedUnit = null;
let remaining = {};

const joinScreen = document.getElementById('joinScreen');
const waitScreen = document.getElementById('waitScreen');
const placementScreen = document.getElementById('placementScreen');
const playScreen = document.getElementById('playScreen');

document.getElementById('fetchTeamsBtn').addEventListener('click', () => {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!code) return;
  socket.emit('get_room_teams', { code }, (res) => {
    const area = document.getElementById('teamSelectArea');
    area.innerHTML = '';
    if (!res.ok) {
      area.textContent = res.error;
      return;
    }
    if (res.teams.length === 0) {
      area.textContent = 'لا توجد فرق بعد، انتظر المدير حتى يضيف فريقك.';
      return;
    }
    res.teams.forEach((t) => {
      const btn = document.createElement('button');
      btn.textContent = t.name + (t.connected ? ' (متصل)' : '');
      btn.addEventListener('click', () => joinTeam(code, t.id));
      area.appendChild(btn);
    });
  });
});

function joinTeam(code, id) {
  const secret = document.getElementById('teamSecretInput').value.trim();
  socket.emit('team_join_room', { code, teamId: id, secret }, (res) => {
    if (!res.ok) {
        localStorage.removeItem('team_code');
        localStorage.removeItem('team_id');
        localStorage.removeItem('team_secret');
        return alert(res.error);
      }
    roomCode = code;
    teamId = id;
    localStorage.setItem('team_code', code);
    localStorage.setItem('team_id', id);
    localStorage.setItem('team_secret', secret);
    unitConfig = res.room.unitConfig;
    document.getElementById('teamNameLabel').textContent = res.team.name;
    joinScreen.style.display = 'none';
      document.getElementById('leaveRoomBtn').style.display = 'block';
    renderForStatus(res.room);
              document.getElementById('leaveRoomBtn').style.display = 'block';
  });
}

socket.on('room_updated', (room) => {
  if (!roomCode || room.code !== roomCode) return;
  unitConfig = room.unitConfig;
  renderForStatus(room);
  
  const myTeam = room.teams[teamId];
  if (myTeam) {
    document.getElementById('playScore').textContent = myTeam.score;
  }
});

function renderForStatus(room) {
  const myTeam = room.teams[teamId];
  joinScreen.style.display = 'none';
      document.getElementById('leaveRoomBtn').style.display = 'block';
  waitScreen.style.display = 'none';
  placementScreen.style.display = 'none';
  playScreen.style.display = 'none';

  if (room.status === 'setup') {
    if (myTeam && myTeam.distributed) {
      waitScreen.style.display = 'block';
    } else {
      placementScreen.style.display = 'block';
      initPlacement();
    }
  } else if (room.status === 'playing' || room.status === 'finished') {
    playScreen.style.display = 'block';
    document.getElementById('playTeamName').textContent = myTeam ? myTeam.name : '';
    document.getElementById('playScore').textContent = myTeam ? myTeam.score : '';
  }
}

function initPlacement() {
  placements = Array.from({ length: 15 }, () => []);
  selectedUnit = Object.keys(unitConfig)[0];
  renderUnitPicker();
  renderPlacementGrid();
  updateSubmitState();
}

function countUsed(key) {
  return placements.reduce((s, cell) => s + cell.filter((u) => u.unit === key).length, 0);
}

function renderUnitPicker() {
  const picker = document.getElementById('unitPicker');
  picker.innerHTML = '';
  Object.entries(unitConfig).forEach(([key, cfg]) => {
    const left = cfg.count - countUsed(key);
    const btn = document.createElement('div');
    btn.className = 'unit-btn' + (selectedUnit === key ? ' active' : '');
    btn.innerHTML = `${window.BoardUtils.unitIcon(key)} ${cfg.label}<span class="count">متبقي: ${left}</span>`;
    btn.addEventListener('click', () => {
      selectedUnit = key;
      renderUnitPicker();
    });
    picker.appendChild(btn);
  });
  const hint = document.createElement('p');
  hint.style.textAlign = 'center';
  hint.style.color = '#94a3b8';
  hint.style.width = '100%';
  hint.textContent = 'انقر لإضافة الوحدة - انقر بالزر الأيمن لإزالة وحدة واحدة من المربع';
  picker.appendChild(hint);
}

function renderPlacementGrid() {
  const container = document.getElementById('placementGrid');
  window.BoardUtils.buildBoardGrid({
    container,
    cellsData: placements,
    mode: 'placement',
    onCellClick: (i) => {
      const cfg = unitConfig[selectedUnit];
      const used = countUsed(selectedUnit);
      if (used >= cfg.count) {
        document.getElementById('placementMsg').textContent = `لا يوجد ${cfg.label} متبقية`;
        return;
      }
      placements[i].push({ unit: selectedUnit });
      document.getElementById('placementMsg').textContent = '';
      renderUnitPicker();
      renderPlacementGrid();
      updateSubmitState();
    },
  });
  // زر يمين لتفريغ المربع بالكامل
  container.querySelectorAll('.board-cell').forEach((cellEl, i) => {
    cellEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if(placements[i].length > 0) placements[i].pop();
      document.getElementById('placementMsg').textContent = '';
      renderUnitPicker();
      renderPlacementGrid();
      updateSubmitState();
    });
  });
}

function updateSubmitState() {
  const allPlaced = Object.entries(unitConfig).every(([key, cfg]) => countUsed(key) === cfg.count);
  document.getElementById('submitBoardBtn').disabled = !allPlaced;
}

document.getElementById('submitBoardBtn').addEventListener('click', () => {
  socket.emit(
    'team_distribute_board',
    { code: roomCode, teamId, placements },
    (res) => {
      if (!res.ok) {
        document.getElementById('placementMsg').textContent = res.error;
        return;
      }
    }
  );
});



document.getElementById('randomBtn').addEventListener('click', () => {
  placements = Array.from({ length: 15 }, () => []);
  const pool = [];
  Object.entries(unitConfig).forEach(([key, cfg]) => {
    for(let i=0; i<cfg.count; i++) pool.push({ unit: key });
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  pool.forEach((u, i) => placements[i % 15].push(u));
  document.getElementById('placementMsg').textContent = '';
  renderUnitPicker();
  renderPlacementGrid();
  updateSubmitState();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  placements = Array.from({ length: 15 }, () => []);
  document.getElementById('placementMsg').textContent = '';
  renderUnitPicker();
  renderPlacementGrid();
  updateSubmitState();
});

window.addEventListener('DOMContentLoaded', () => {
  const sc = localStorage.getItem('team_code');
  const ss = localStorage.getItem('team_secret');
  if (sc && ss) {
    document.getElementById('roomCodeInput').value = sc;
    document.getElementById('teamSecretInput').value = ss;
  }
});

document.getElementById('leaveRoomBtn').addEventListener('click', () => {
  if(confirm('هل متأكد من الخروج من الغرفة؟')) {
    localStorage.removeItem('team_code');
    localStorage.removeItem('team_id');
    localStorage.removeItem('team_secret');
    location.reload();
  }
});
