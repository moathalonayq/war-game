const socket = io();
let roomCode = null;

document.getElementById('fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => console.log(err));
  } else {
    document.exitFullscreen();
  }
});

document.getElementById('joinBtn').addEventListener('click', () => {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!code) return;
  socket.emit('display_join_room', { code }, (res) => {
    if (!res.ok) { localStorage.removeItem('display_code'); return alert(res.error); }
    roomCode = code;
    localStorage.setItem('display_code', code);
    document.getElementById('joinBar').style.display = 'none';
    document.getElementById('gameArea').style.display = 'flex';
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
  
  finishArea.innerHTML = '<h1 style="text-align:center; font-size: 5rem; margin-top:20px; color:#fbbf24; text-shadow: 0 5px 15px rgba(0,0,0,0.8);">🎉 النتائج النهائية 🎉</h1><div style="text-align:center; margin-top: 20px;"><button id="revealBtn" style="font-size: 24px; padding: 15px 40px; background: #2563eb; color: white; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 15px rgba(37,99,235,0.5); transition: background 0.3s;">عرض المركز التالي</button></div><div id="podium" class="podium-container"></div>';
  
  const podium = document.getElementById('podium');
  
  const rank1 = ranking[0];
  const rank2 = ranking[1];
  const rank3 = ranking[2];
  
  const createStep = (rankInfo, rankNum, medal) => {
    if (!rankInfo) return '<div style="width:300px;"></div>';
    return `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div class="podium-medal" style="opacity:0; transition: opacity 1s" id="medal-${rankNum}">${medal}</div>
        <div class="podium-step rank-${rankNum}" id="step-${rankNum}">
          <div class="podium-name">${rankInfo.name}</div>
          <div class="podium-score">${rankInfo.score} نقطة</div>
        </div>
      </div>
    `;
  };


  // DOM Order: Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
  podium.innerHTML = `
    ${createStep(rank2, 2, '🥈')}
    ${createStep(rank1, 1, '🥇')}
    ${createStep(rank3, 3, '🥉')}
  `;

  // Control via Enter key
  window.podiumSteps = [{rankNum: 3, rankInfo: rank3}, {rankNum: 2, rankInfo: rank2}, {rankNum: 1, rankInfo: rank1}];
  window.currentRevealIndex = 0;
});


window.revealNext = function() {
  const finishArea = document.getElementById('finishArea');
  if (finishArea && finishArea.style.display === 'block') {
    if (window.podiumSteps && window.currentRevealIndex < window.podiumSteps.length) {
      const step = window.podiumSteps[window.currentRevealIndex];
      if (step.rankInfo) {
        const el = document.getElementById(`step-${step.rankNum}`);
        if (el) el.classList.add('revealed');
        const medalEl = document.getElementById(`medal-${step.rankNum}`);
        if (medalEl) setTimeout(() => medalEl.style.opacity = '1', 500);
      }
      window.currentRevealIndex++;
      if (window.currentRevealIndex >= window.podiumSteps.length) {
        const btn = document.getElementById('revealBtn');
        if (btn) btn.style.display = 'none';
      }
    }
  }
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') window.revealNext();
});

document.addEventListener('click', (e) => {
  if(e.target && e.target.id === 'revealBtn') window.revealNext();
});
 document.addEventListener('click', (e) => { if(e.target && e.target.id === 'revealBtn') window.revealNext(); });

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

  teamsRow.innerHTML = '';
  Object.values(room.teams).forEach((team) => {
    const panel = document.createElement('div');
    panel.className = 'team-panel card';
    
    const title = document.createElement('h2');
    title.style.fontSize = '3.5rem';
    title.style.margin = '10px 0 20px 0';
    title.textContent = team.name;
    
    // Points are NOT shown!
    
    const gridWrap = document.createElement('div');
    gridWrap.className = 'huge-grid';
    
    panel.appendChild(title);
    panel.appendChild(gridWrap);
    teamsRow.appendChild(panel);

    window.BoardUtils.buildBoardGrid({
      container: gridWrap,
      cellsData: team.hitBoard,
      mode: 'hit',
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const savedDisplayCode = localStorage.getItem('display_code');
  if (savedDisplayCode) {
    document.getElementById('roomCodeInput').value = savedDisplayCode;
    // document.getElementById("joinBtn").click();
  }
});


document.getElementById('leaveRoomBtn').addEventListener('click', () => {
  if(confirm('هل تريد الخروج من الغرفة؟')) {
    localStorage.removeItem('display_code');
    location.reload();
  }
});
