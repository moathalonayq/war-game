import os
import re

base_dir = r"C:\Users\Moath\OneDrive\Desktop\mosabaqa-game"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. 15 Cells everywhere
# shared/board.js
p = os.path.join(base_dir, "public", "shared", "board.js")
c = read_file(p)
c = c.replace("i < 25;", "i < 15;")
write_file(p, c)

# server/gameState.js
p = os.path.join(base_dir, "server", "gameState.js")
c = read_file(p)
c = c.replace("totalCells() {\n  return 25;", "totalCells() {\n  return 15;")
c = c.replace("Array.from({ length: 25 }", "Array.from({ length: 15 }")
c = c.replace("Array(25).fill(null)", "Array(15).fill(null)")
c = c.replace("placements.length !== 25", "placements.length !== 15")
c = c.replace("يجب تحديد 25 مربع", "يجب تحديد 15 مربع")
c = c.replace("cellIndex >= 25", "cellIndex >= 15")
c = c.replace("currentQuestion: null,", "currentQuestion: null,\n    bomberTeamId: null,")
write_file(p, c)

# server/socketHandlers.js
p = os.path.join(base_dir, "server", "socketHandlers.js")
c = read_file(p)
c = c.replace("currentQuestion: room.currentQuestion,", "currentQuestion: room.currentQuestion,\n    bomberTeamId: room.bomberTeamId,")

# Add admin_assign_bomber and team_execute_bomb
admin_bomber_code = """
    socket.on('admin_assign_bomber', ({ code, teamId }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      room.bomberTeamId = teamId;
      room.currentQuestion = null; // إخفاء السؤال عند القصف
      broadcastRoom(io, room);
      cb && cb({ ok: true });
    });

    socket.on('team_execute_bomb', ({ code, teamId, targetTeamId, cellIndex }, cb) => {
      try {
        const room = gs.getRoom(code);
        if (!room) throw new Error('الغرفة غير موجودة');
        if (room.bomberTeamId !== teamId) throw new Error('لست الفريق المخول بالقصف حالياً');
        const { result } = gs.executeBomb(room, targetTeamId, cellIndex);
        room.bomberTeamId = null; // سحب الصلاحية بعد القصف
        if (!result.hit) {
           io.to(room.code + '_public').emit('bomb_missed');
        }
        broadcastRoom(io, room);
        cb && cb({ ok: true, result });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });
"""
c = c.replace("socket.on('admin_execute_bomb', ({ code, targetTeamId, cellIndex }, cb) => {", admin_bomber_code + "\n    socket.on('admin_execute_bomb', ({ code, targetTeamId, cellIndex }, cb) => {")
write_file(p, c)

# public/admin/index.html
p = os.path.join(base_dir, "public", "admin", "index.html")
c = read_file(p)
# Remove the old bomb target select and grid from admin
c = re.sub(r'<h3>تنفيذ قصف</h3>.*?<div class="teams-row" id="teamsScoreRow"></div>', '<h3>لوحة النقاط والفرق</h3>\n    <div class="teams-row" id="teamsScoreRow"></div>', c, flags=re.DOTALL)
write_file(p, c)

# public/admin/admin.js
p = os.path.join(base_dir, "public", "admin", "admin.js")
c = read_file(p)
# LocalStorage saving
c = c.replace("roomCode = res.room.code;\n    onRoomJoined(res.room);", "roomCode = res.room.code;\n    localStorage.setItem('admin_code', roomCode);\n    if (typeof adminPin !== 'undefined') localStorage.setItem('admin_pin', adminPin);\n    onRoomJoined(res.room);")
# Modify renderActiveQuestion to assign bomber
c = c.replace("bombTargetTeamId = null;\n      renderTargetSelect(room, t.id);\n      alert(`${t.name} أجاب صح! اختر الآن الفريق المستهدف والمربع بالأسفل لتنفيذ القصف.`);", "socket.emit('admin_assign_bomber', { code: roomCode, teamId: t.id }, (res) => {\n        if(res.ok) alert(`تم إعطاء صلاحية القصف للفريق: ${t.name}`);\n      });")
# Remove renderTargetSelect and renderBombGrid calls from renderRoom
c = c.replace("renderTargetSelect(room);\n    renderBombGrid();", "")
# Auto-load on end of file
c = c + """
window.addEventListener('DOMContentLoaded', () => {
  const savedAdminCode = localStorage.getItem('admin_code');
  const savedAdminPin = localStorage.getItem('admin_pin');
  if (savedAdminCode) {
    document.getElementById('joinCodeInput').value = savedAdminCode;
    if (savedAdminPin) document.getElementById('joinPinInput').value = savedAdminPin;
    document.getElementById('joinRoomBtn').click();
  }
});
"""
write_file(p, c)


# public/display/index.html
p = os.path.join(base_dir, "public", "display", "index.html")
c = read_file(p)
# Add funnyMessageOverlay and bigQuestionArea
replacement = """
  <div id="questionBanner"></div>
  <div id="bigQuestionArea" style="display:none; flex-direction:column; justify-content:center; align-items:center; height: 70vh; font-size:4rem; color:white; background:#1e3a8a; border-radius:15px; padding:40px; margin-top:20px; text-align:center;"></div>
  
  <div id="funnyMessageOverlay" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); font-size:5rem; font-weight:bold; z-index:100; background:rgba(0,0,0,0.85); color:#facc15; padding:60px; border-radius:30px; text-align:center; text-shadow: 2px 2px 8px #000; box-shadow: 0 0 30px rgba(0,0,0,0.8);"></div>
  
  <div class="teams-row" id="teamsRow"></div>
"""
c = re.sub(r'<div id="questionBanner"></div>\s*<div class="teams-row" id="teamsRow"></div>', replacement, c)
write_file(p, c)

# public/display/display.js
p = os.path.join(base_dir, "public", "display", "display.js")
c = read_file(p)
c = c.replace("roomCode = code;\n    document.getElementById('joinBar')", "roomCode = code;\n    localStorage.setItem('display_code', code);\n    document.getElementById('joinBar')")
# Hide teams when question is active
render_repl = """
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
"""
c = re.sub(r"if \(room\.currentQuestion\).*?\} else \{.*?\}", render_repl, c, flags=re.DOTALL)
# Add funny message socket listener and auto login
c = c + """
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
"""
write_file(p, c)

# public/team/index.html
p = os.path.join(base_dir, "public", "team", "index.html")
c = read_file(p)
bombing_html = """
    <div id="bombingArea" style="display:none; margin-top:20px; background:#475569; padding:15px; border-radius:8px;">
      <h3 style="color:#4ade80">أنت من سيقصف الآن! 🚀</h3>
      <label>اختر الفريق المستهدف:</label>
      <select id="teamTargetSelect" style="margin-bottom:15px; font-size:1.1rem; padding:8px;"></select>
      <div id="bombGrid" class="board-grid"></div>
      <p id="bombMsg" style="color:#ef4444; margin-top:10px; font-weight:bold;"></p>
    </div>
"""
c = c.replace('<div id="questionArea"></div>', bombing_html)
write_file(p, c)

# public/team/team.js
p = os.path.join(base_dir, "public", "team", "team.js")
c = read_file(p)
c = c.replace("Array(25)", "Array(15)")
c = c.replace("length: 25", "length: 15")
c = c.replace("i % 25", "i % 15")

# localStorage
c = c.replace("teamId = id;\n    unitConfig = res.room.unitConfig;", "teamId = id;\n    localStorage.setItem('team_code', code);\n    localStorage.setItem('team_id', id);\n    localStorage.setItem('team_secret', secret);\n    unitConfig = res.room.unitConfig;")

c = c.replace("if (room.status === 'playing' && room.currentQuestion) {\n    showQuestion(room.currentQuestion);\n  } else if (room.status === 'playing') {\n    document.getElementById('questionArea').innerHTML = '<p>بانتظار السؤال التالي...</p>';\n  }", "if(room.status === 'playing') { renderBombingArea(room); }")

c = c.replace("function showQuestion(q) {\n  const area = document.getElementById('questionArea');\n  area.innerHTML = `<div class=\"question-banner\">${q.text}</div>`;\n}", "")

# Add renderBombingArea and auto-login
render_bombing_js = """
function renderBombingArea(room) {
  const area = document.getElementById('bombingArea');
  if (room.bomberTeamId !== teamId) {
    area.style.display = 'none';
    return;
  }
  area.style.display = 'block';
  const select = document.getElementById('teamTargetSelect');
  const prev = select.value;
  select.innerHTML = '';
  Object.values(room.teams).forEach(t => {
    if(t.id === teamId) return;
    select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
  });
  if (prev && select.querySelector(`option[value="${prev}"]`)) select.value = prev;

  const grid = document.getElementById('bombGrid');
  grid.innerHTML = '';
  for(let i=0; i<15; i++) {
    const cell = document.createElement('div');
    cell.className = 'board-cell';
    cell.innerHTML = `<span class="cell-number">${i+1}</span>`;
    cell.addEventListener('click', () => {
      document.getElementById('bombMsg').textContent = 'جاري القصف...';
      socket.emit('team_execute_bomb', { code: roomCode, teamId, targetTeamId: select.value, cellIndex: i }, (res) => {
        if (!res.ok) {
           document.getElementById('bombMsg').textContent = res.error;
           setTimeout(()=> document.getElementById('bombMsg').textContent='', 2000);
        } else {
           document.getElementById('bombMsg').textContent = '';
        }
      });
    });
    grid.appendChild(cell);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const sc = localStorage.getItem('team_code');
  const st = localStorage.getItem('team_id');
  const ss = localStorage.getItem('team_secret');
  if (sc && st && ss) {
     socket.emit('team_join_room', { code: sc, teamId: st, secret: ss }, (res) => {
        if(res.ok) {
            roomCode = sc;
            teamId = st;
            unitConfig = res.room.unitConfig;
            document.getElementById('teamNameLabel').textContent = res.team.name;
            joinScreen.style.display = 'none';
            renderForStatus(res.room);
        } else {
            // invalid session
            localStorage.removeItem('team_code');
            localStorage.removeItem('team_id');
            localStorage.removeItem('team_secret');
        }
     });
  }
});
"""
c = c + render_bombing_js
write_file(p, c)

print("Refactoring step 2 applied successfully.")

