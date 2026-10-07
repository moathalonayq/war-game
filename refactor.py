import os
import re

base_dir = r"C:\Users\Moath\OneDrive\Desktop\mosabaqa-game"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. gameState.js
p = os.path.join(base_dir, "server", "gameState.js")
c = read_file(p)
c = c.replace("function createRoom({ unitConfig } = {}) {", "function createRoom({ unitConfig, adminPin } = {}) {")
c = c.replace("code,\n    status: 'setup',", "code,\n    adminPin,\n    status: 'setup',")
c = c.replace("name,\n    socketId: null,", "name,\n    secret: Math.floor(1000 + Math.random() * 9000).toString(),\n    socketId: null,")
c = c.replace("function publicTeamsView(room, { revealBoards = false } = {}) {", "function publicTeamsView(room, { revealBoards = false, isAdmin = false } = {}) {")
c = c.replace("board: revealBoards ? t.board : undefined,\n    };", "board: revealBoards ? t.board : undefined,\n      secret: isAdmin ? t.secret : undefined,\n    };")
write_file(p, c)

# 2. socketHandlers.js
p = os.path.join(base_dir, "server", "socketHandlers.js")
c = read_file(p)
c = c.replace("function roomSummary(room) {", "function roomSummary(room, isAdmin = false) {")
c = c.replace("teams: gs.publicTeamsView(room),", "teams: gs.publicTeamsView(room, { isAdmin }),")
c = c.replace("io.to(room.code).emit('room_updated', roomSummary(room));", "io.to(room.code + '_admin').emit('room_updated', roomSummary(room, true));\n  io.to(room.code + '_public').emit('room_updated', roomSummary(room, false));")
c = c.replace("const room = gs.createRoom({ unitConfig: payload && payload.unitConfig });\n        socket.join(room.code);", "const adminPin = payload && payload.adminPin;\n        const room = gs.createRoom({ unitConfig: payload && payload.unitConfig, adminPin });\n        socket.join(room.code + '_admin');")
c = c.replace("cb && cb({ ok: true, room: roomSummary(room) });", "cb && cb({ ok: true, room: roomSummary(room, isAdmin) });")
c = c.replace("socket.on('admin_join_room', ({ code }, cb) => {\n      const room = gs.getRoom(code);\n      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });\n      socket.join(room.code);", "socket.on('admin_join_room', ({ code, adminPin }, cb) => {\n      const room = gs.getRoom(code);\n      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });\n      if (room.adminPin && room.adminPin !== adminPin) return cb && cb({ ok: false, error: 'كلمة المرور غير صحيحة' });\n      socket.join(room.code + '_admin');")
c = c.replace("socket.on('team_join_room', ({ code, teamId }, cb) => {\n      const room = gs.getRoom(code);\n      if (!room) return cb && cb({ ok: false, error: 'كود الغرفة غير صحيح' });\n      const team = room.teams[teamId];\n      if (!team) return cb && cb({ ok: false, error: 'الفريق غير موجود' });\n      socket.join(room.code);", "socket.on('team_join_room', ({ code, teamId, secret }, cb) => {\n      const room = gs.getRoom(code);\n      if (!room) return cb && cb({ ok: false, error: 'كود الغرفة غير صحيح' });\n      const team = room.teams[teamId];\n      if (!team) return cb && cb({ ok: false, error: 'الفريق غير موجود' });\n      if (team.secret && team.secret !== secret) return cb && cb({ ok: false, error: 'الرقم السري غير صحيح' });\n      socket.join(room.code + '_public');")
c = c.replace("socket.on('display_join_room', ({ code }, cb) => {\n      const room = gs.getRoom(code);\n      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });\n      socket.join(room.code);", "socket.on('display_join_room', ({ code }, cb) => {\n      const room = gs.getRoom(code);\n      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });\n      socket.join(room.code + '_public');")
write_file(p, c)

# 3. admin/index.html
p = os.path.join(base_dir, "public", "admin", "index.html")
c = read_file(p)
c = c.replace('<button id="createRoomBtn">إنشاء غرفة جديدة</button>', '<input id="createPinInput" placeholder="رقم سري للغرفة (اختياري)" />\n    <button id="createRoomBtn">إنشاء غرفة جديدة</button>')
c = c.replace('<input id="joinCodeInput" placeholder="كود غرفة موجودة" maxlength="4" style="text-transform:uppercase" />\n    <button id="joinRoomBtn" class="secondary">انضمام كمدير</button>', '<input id="joinCodeInput" placeholder="كود غرفة موجودة" maxlength="4" style="text-transform:uppercase" />\n    <input id="joinPinInput" placeholder="الرقم السري" />\n    <button id="joinRoomBtn" class="secondary">انضمام كمدير</button>')
write_file(p, c)

# 4. admin/admin.js
p = os.path.join(base_dir, "public", "admin", "admin.js")
c = read_file(p)
c = c.replace("socket.emit('admin_create_room', {}, (res) => {", "const adminPin = document.getElementById('createPinInput').value.trim();\n  socket.emit('admin_create_room', { adminPin }, (res) => {")
c = c.replace("const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();\n  if (!code) return;\n  socket.emit('admin_join_room', { code }, (res) => {", "const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();\n  const adminPin = document.getElementById('joinPinInput').value.trim();\n  if (!code) return;\n  socket.emit('admin_join_room', { code, adminPin }, (res) => {")
c = c.replace("div.textContent = `${t.name} — ${t.connected ? '🟢 متصل' : '⚪ غير متصل'} — ${\n      t.distributed ? '✅ وزّع جيشه' : '⏳ لم يوزّع بعد'\n    }`;", "div.innerHTML = `<strong>${t.name}</strong> 🔑(الرقم السري: ${t.secret || 'بدون'}) — ${t.connected ? '🟢 متصل' : '⚪ غير متصل'} — ${t.distributed ? '✅ وزّع جيشه' : '⏳ لم يوزّع بعد'}`;")
c = c.replace("await fetch('/api/questions/' + q.id, { method: 'DELETE' });", "if(!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;\n      await fetch('/api/questions/' + q.id, { method: 'DELETE' });")
c = c.replace("renderTargetSelect(room);", "renderTargetSelect(room, t.id);")
c = c.replace("function renderTargetSelect(room) {\n  const select = document.getElementById('targetTeamSelect');\n  const prev = select.value;\n  select.innerHTML = '';\n  Object.values(room.teams).forEach((t) => {\n    const opt = document.createElement('option');\n    opt.value = t.id;\n    opt.textContent = t.name;\n    select.appendChild(opt);\n  });", "function renderTargetSelect(room, excludeTeamId = null) {\n  const select = document.getElementById('targetTeamSelect');\n  const prev = select.value;\n  select.innerHTML = '';\n  Object.values(room.teams).forEach((t) => {\n    if (t.id === excludeTeamId) return;\n    const opt = document.createElement('option');\n    opt.value = t.id;\n    opt.textContent = t.name;\n    select.appendChild(opt);\n  });")
write_file(p, c)

# 5. team/index.html
p = os.path.join(base_dir, "public", "team", "index.html")
c = read_file(p)
c = c.replace('<h3>اختر فريقك</h3>', '<h3>اختر فريقك</h3>\n    <input id="teamSecretInput" placeholder="الرقم السري للفريق" style="margin-bottom:10px; display:block; width:100%" />')
c = c.replace('<div id="unitPicker" class="unit-picker"></div>', '<div style="margin-bottom: 10px; display: flex; gap: 8px;">\n        <button id="randomBtn" class="secondary" style="flex:1">توزيع عشوائي 🎲</button>\n        <button id="clearBtn" class="danger" style="flex:1">مسح اللوحة 🗑️</button>\n      </div>\n      <div id="unitPicker" class="unit-picker"></div>')
write_file(p, c)

# 6. team/team.js
p = os.path.join(base_dir, "public", "team", "team.js")
c = read_file(p)
c = c.replace("socket.emit('team_join_room', { code, teamId: id }, (res) => {", "const secret = document.getElementById('teamSecretInput').value.trim();\n  socket.emit('team_join_room', { code, teamId: id, secret }, (res) => {")
c = c.replace("placements[i] = [];\n      document.getElementById('placementMsg').textContent = '';\n      renderUnitPicker();\n      renderPlacementGrid();\n      updateSubmitState();", "if(placements[i].length > 0) placements[i].pop();\n      document.getElementById('placementMsg').textContent = '';\n      renderUnitPicker();\n      renderPlacementGrid();\n      updateSubmitState();")
c = c.replace("hint.textContent = 'انقر على مربع لإضافة الوحدة المختارة (يمكن وضع أكثر من وحدة في نفس المربع) - انقر بالزر الأيمن لتفريغ المربع';", "hint.textContent = 'انقر لإضافة الوحدة - انقر بالزر الأيمن لإزالة وحدة واحدة من المربع';")

# Add random and clear buttons
extra_js = """
document.getElementById('randomBtn').addEventListener('click', () => {
  placements = Array.from({ length: 25 }, () => []);
  const pool = [];
  Object.entries(unitConfig).forEach(([key, cfg]) => {
    for(let i=0; i<cfg.count; i++) pool.push({ unit: key });
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  pool.forEach((u, i) => placements[i % 25].push(u));
  document.getElementById('placementMsg').textContent = '';
  renderUnitPicker();
  renderPlacementGrid();
  updateSubmitState();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  placements = Array.from({ length: 25 }, () => []);
  document.getElementById('placementMsg').textContent = '';
  renderUnitPicker();
  renderPlacementGrid();
  updateSubmitState();
});
"""
if "document.getElementById('randomBtn')" not in c:
    c = c + extra_js

write_file(p, c)

print("All modifications applied successfully.")

