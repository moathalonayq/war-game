const socket = io();
let roomCode = null;

document.getElementById('joinBtn').addEventListener('click', () => {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!code) return;
  socket.emit('display_join_room', { code }, (res) => {
    if (!res.ok) return alert(res.error);
    roomCode = code;
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
  if (room.currentQuestion) {
    banner.innerHTML = `<div class="question-banner">${room.currentQuestion.text}</div>`;
  } else {
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
