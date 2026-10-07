const socket = io();
let roomCode = null;
let currentRoom = null;
let questionBank = [];
let bombTargetTeamId = null;

document.getElementById('createRoomBtn').addEventListener('click', () => {
  const adminPin = document.getElementById('createPinInput').value.trim();
  socket.emit('admin_create_room', { adminPin }, (res) => {
    if (!res.ok) return alert(res.error);
    roomCode = res.room.code;
    localStorage.setItem('admin_code', roomCode);
    if (typeof adminPin !== 'undefined') localStorage.setItem('admin_pin', adminPin);
    onRoomJoined(res.room);
  });
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
  const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
  const adminPin = document.getElementById('joinPinInput').value.trim();
  if (!code) return;
  socket.emit('admin_join_room', { code, adminPin }, (res) => {
    if (!res.ok) return alert(res.error);
    roomCode = res.room.code;
    localStorage.setItem('admin_code', roomCode);
    if (typeof adminPin !== 'undefined') localStorage.setItem('admin_pin', adminPin);
    onRoomJoined(res.room);
  });
});

function onRoomJoined(room) {
  document.getElementById('setupCard').style.display = 'none';
  document.getElementById('roomInfo').style.display = 'block';
  document.getElementById('roomCodeLabel').textContent = room.code;
  renderRoom(room);
}

socket.on('room_updated', (room) => {
  if (!roomCode || room.code !== roomCode) return;
  renderRoom(room);
});

socket.on('game_finished', ({ ranking }) => {
  const msg = ranking.map((r, i) => `${i + 1}. ${r.name} — ${r.score}`).join('\n');
  alert('انتهت المباراة!\n' + msg);
});

function renderRoom(room) {
  currentRoom = room;
  document.getElementById('roomStatusLabel').textContent =
    room.status === 'setup' ? 'التوزيع' : room.status === 'playing' ? 'جارية' : 'منتهية';

  renderTeamsList(room);
  document.getElementById('startGameBtn').disabled = !canStart(room);

  const inPlay = room.status === 'playing';
  document.getElementById('playControls').style.display = inPlay ? 'block' : 'none';
  if (inPlay) {
    renderQuestionBank();
    renderActiveQuestion(room);
    renderTargetSelect(room); // Renders the manual bomb selector
    renderTeamsScoreRow(room);
  }
}

function canStart(room) {
  const teams = Object.values(room.teams);
  return teams.length >= 2 && teams.every((t) => t.distributed);
}

function renderTeamsList(room) {
  const list = document.getElementById('teamsList');
  list.innerHTML = '';
  Object.values(room.teams).forEach((t) => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${t.name}</strong> 🔑(الرقم السري: ${t.secret || 'بدون'}) — ${t.connected ? '🟢 متصل' : '⚪ غير متصل'} — ${t.distributed ? '✅ وزّع جيشه' : '⏳ لم يوزّع بعد'}`;
    list.appendChild(div);
  });
}

document.getElementById('addTeamBtn').addEventListener('click', () => {
  const name = document.getElementById('newTeamName').value.trim();
  if (!name) return;
  socket.emit('admin_add_team', { code: roomCode, name }, (res) => {
    if (!res.ok) return alert(res.error);
    document.getElementById('newTeamName').value = '';
  });
});

document.getElementById('startGameBtn').addEventListener('click', () => {
  socket.emit('admin_start_game', { code: roomCode }, (res) => {
    if (!res.ok) alert(res.error);
  });
});

document.getElementById('finishGameBtn').addEventListener('click', () => {
  if (!confirm('هل تريد إنهاء المباراة وإظهار النتائج النهائية؟')) return;
  socket.emit('admin_finish_game', { code: roomCode }, (res) => {
    if (!res.ok) alert(res.error);
  });
});

// ---- بنك الأسئلة ----
async function loadQuestionBank() {
  const res = await fetch('/api/questions');
  questionBank = await res.json();
  renderFullQuestionList();
  if (currentRoom && currentRoom.status === 'playing') renderQuestionBank();
}

function renderFullQuestionList() {
  const ul = document.getElementById('fullQuestionList');
  ul.innerHTML = '';
  questionBank.forEach((q) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = `[${q.type === 'team' ? 'فريق' : 'جماعي'}] ${q.text}`;
    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.textContent = 'حذف';
    delBtn.addEventListener('click', async () => {
      if(!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
      await fetch('/api/questions/' + q.id, { method: 'DELETE' });
      loadQuestionBank();
    });
    li.appendChild(span);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
}

document.getElementById('addQuestionBtn').addEventListener('click', async () => {
  const text = document.getElementById('qText').value.trim();
  const type = document.getElementById('qType').value;
  const answer = document.getElementById('qAnswer').value.trim();
  if (!text) return;
  await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, type, answer }),
  });
  document.getElementById('qText').value = '';
  document.getElementById('qAnswer').value = '';
  loadQuestionBank();
});

function renderQuestionBank() {
  const area = document.getElementById('questionBankArea');
  area.innerHTML = '';
  if (questionBank.length === 0) {
    area.innerHTML = '<p>لا توجد أسئلة في البنك بعد. أضف أسئلة من الأسفل.</p>';
    return;
  }
  questionBank.forEach((q) => {
    const row = document.createElement('div');
    row.className = 'bank-item';
    const label = document.createElement('span');
    label.textContent = `[${q.type === 'team' ? 'فريق' : 'جماعي'}] ${q.text}`;
    const btn = document.createElement('button');
    btn.textContent = 'عرض هذا السؤال';
    btn.addEventListener('click', () => {
      socket.emit('admin_show_question', { code: roomCode, question: { id: q.id, text: q.text, type: q.type, answer: q.answer } });
    });
    row.appendChild(label);
    row.appendChild(btn);
    area.appendChild(row);
  });
}

function renderActiveQuestion(room) {
  const area = document.getElementById('activeQuestionArea');
  if (!room.currentQuestion) {
    area.innerHTML = '<p>لا يوجد سؤال معروض حاليًا.</p>';
    return;
  }
  area.innerHTML = '';
  const qText = document.createElement('div');
  qText.className = 'question-banner';
  qText.textContent = room.currentQuestion.text;
  area.appendChild(qText);

  if (room.currentQuestion.answer) {
    const ans = document.createElement('p');
    ans.textContent = 'الإجابة الصحيحة: ' + room.currentQuestion.answer;
    ans.style.color = '#4ade80';
    area.appendChild(ans);
  }

  const label = document.createElement('p');
  label.textContent = 'من أجاب صح؟ اختر الفريق الفائز بالسؤال (سيصبح هو من يقصف):';
  area.appendChild(label);

  const btnRow = document.createElement('div');
  Object.values(room.teams).forEach((t) => {
    const b = document.createElement('button');
    b.textContent = t.name;
    b.style.margin = '4px';
    b.addEventListener('click', () => {
      socket.emit('admin_assign_bomber', { code: roomCode, teamId: t.id }, (res) => {
        if(res.ok) alert(`تم إعطاء صلاحية القصف للفريق: ${t.name}`);
      });
    });
    btnRow.appendChild(b);
  });
  const noOne = document.createElement('button');
  noOne.className = 'secondary';
  noOne.textContent = 'لا أحد أجاب';
  noOne.style.margin = '4px';
  noOne.addEventListener('click', () => {
    socket.emit('admin_clear_question', { code: roomCode });
  });
  btnRow.appendChild(noOne);
  area.appendChild(btnRow);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'secondary';
  clearBtn.textContent = 'إخفاء السؤال';
  clearBtn.style.marginTop = '10px';
  clearBtn.addEventListener('click', () => {
    socket.emit('admin_clear_question', { code: roomCode });
  });
  area.appendChild(clearBtn);
}

function renderTargetSelect(room) {
  const select = document.getElementById('targetTeamSelect');
  if (!select) return;
  const prev = select.value;
  select.innerHTML = '';
  Object.values(room.teams).forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });
  if (prev && select.querySelector(`option[value="${prev}"]`)) select.value = prev;
  select.onchange = renderBombGrid;
  renderBombGrid();
}

function renderBombGrid() {
  const select = document.getElementById('targetTeamSelect');
  if (!select) return;
  const teamId = select.value;
  const team = currentRoom.teams[teamId];
  const container = document.getElementById('bombGrid');
  if (!team) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = '';
  window.BoardUtils.buildBoardGrid({
    container,
    cellsData: team.hitBoard,
    mode: 'hit',
    onCellClick: (i) => {
      if (team.hitBoard[i]) return;
      if (!confirm(`تأكيد قصف مربع رقم ${i + 1} في فريق ${team.name}؟`)) return;
      socket.emit('admin_execute_bomb', { code: roomCode, targetTeamId: teamId, cellIndex: i }, (res) => {
        if (!res.ok) return alert(res.error);
        
        const log = document.getElementById('bombResultLog');
        if (res.result.units.length === 0) {
          log.style.color = '#ef4444';
          log.textContent = `🎯 نتيجة آخر قصف: المربع فارغ! (لا توجد وحدات)`;
        } else {
          log.style.color = '#4ade80';
          const unitsString = res.result.units.map(u => window.BoardUtils.unitIcon(u.unit)).join(' ');
          log.textContent = `🎯 نتيجة آخر قصف: تم تدمير [ ${unitsString} ] وخسارة ${res.result.value} نقطة!`;
        }
      });
    },
  });
}

function renderTeamsScoreRow(room) {
  const row = document.getElementById('teamsScoreRow');
  row.innerHTML = '';
  Object.values(room.teams).forEach((t) => {
    const panel = document.createElement('div');
    panel.className = 'team-panel card';
    panel.innerHTML = `<h3>${t.name}</h3><div class="score">${t.score} نقطة</div>`;
    row.appendChild(panel);
  });
}

loadQuestionBank();

window.addEventListener('DOMContentLoaded', () => {
  const savedAdminCode = localStorage.getItem('admin_code');
  const savedAdminPin = localStorage.getItem('admin_pin');
  if (savedAdminCode) {
    document.getElementById('joinCodeInput').value = savedAdminCode;
    if (savedAdminPin) document.getElementById('joinPinInput').value = savedAdminPin;
    document.getElementById('joinRoomBtn').click();
  }
});


socket.on('admin_bomb_log', ({ sourceName, targetName, cellIndex, result }) => {
  const log = document.getElementById('bombResultLog');
  if (result.units.length === 0) {
    log.style.color = '#ef4444';
    log.textContent = `🎯 قام فريق [${sourceName}] بقصف [${targetName}] (مربع ${cellIndex + 1}): المربع فارغ!`;
  } else {
    log.style.color = '#4ade80';
    const unitsString = result.units.map(u => window.BoardUtils.unitIcon(u.unit)).join(' ');
    log.textContent = `🎯 قام فريق [${sourceName}] بقصف [${targetName}] (مربع ${cellIndex + 1}): تم تدمير [ ${unitsString} ] وخسارة ${result.value} نقطة!`;
  }
});
