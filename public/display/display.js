const socket = io();
let roomCode = null;

document.getElementById('joinBtn').addEventListener('click', () => {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!code) return;
  socket.emit('display_join_room', { code }, (res) => {
    if (!res.ok) return alert(res.error);
    roomCode = code;
    localStorage.setItem('display_code', code);
    document.getElementById('joinBar').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    render(res.room);
  });
});

socket.on('room_updated', (room) => {
  if (!roomCode || room.code !== roomCode) return;
  render(room);
});

socket.on('game_finished', ({ ranking }) => {
  document.getElementById('gameArea').style.display = 'none';
  const finishArea = document.getElementById('finishArea');
  finishArea.style.display = 'block';
  const list = document.getElementById('rankingList');
  list.innerHTML = '';
  ranking.forEach((r, idx) => {
    const li = document.createElement('li');
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
    li.textContent = `${medal} ${r.name} — ${r.score} نقطة`;
    list.appendChild(li);
  });
});

function render(room) {
  const banner = document.getElementById('questionBanner');
  
  const bigQ = document.getElementById('bigQuestionArea');
  const teamsRow = document.getElementById('teamsRow');
  if (room.currentQuestion) {
    banner.innerHTML = '';
    teamsRow.style.display = 'none';
    bigQ.style.display = 'flex';
    bigQ.innerHTML = `<div>🤔 ${room.currentQuestion.text}</div>`;
  } else {
    bigQ.style.display = 'none';
    teamsRow.style.display = 'flex';
    banner.innerHTML = '';
  }


  const teamsRow = document.getElementById('teamsRow');
  teamsRow.innerHTML = '';
  Object.values(room.teams).forEach((team) => {
    const panel = document.createElement('div');
    panel.className = 'team-panel card';
    const title = document.createElement('h3');
    title.textContent = team.name;
    const score = document.createElement('div');
    score.className = 'score';
    score.textContent = team.score + ' نقطة';
    const gridWrap = document.createElement('div');
    panel.appendChild(title);
    panel.appendChild(score);
    panel.appendChild(gridWrap);
    teamsRow.appendChild(panel);

    window.BoardUtils.buildBoardGrid({
      container: gridWrap,
      cellsData: team.hitBoard,
      mode: 'hit',
    });
  });
}

socket.on('bomb_missed', () => {
  const msgs = ["ههههههه ضيعتها! 🤣", "قصف في الهواء الطلق 😂", "جبت العيد 🤡", "يا خسارة الصاروخ 💥", "في البحر ولا فيهم 🌊", "شكل الرادار خربان 📡"];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  const overlay = document.getElementById('funnyMessageOverlay');
  overlay.textContent = msg;
  overlay.style.display = 'block';
  setTimeout(() => overlay.style.display = 'none', 4000);
});

window.addEventListener('DOMContentLoaded', () => {
  const savedDisplayCode = localStorage.getItem('display_code');
  if (savedDisplayCode) {
    document.getElementById('roomCodeInput').value = savedDisplayCode;
    document.getElementById('joinBtn').click();
  }
});
