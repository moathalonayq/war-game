import os
import re

base_dir = r"C:\Users\Moath\OneDrive\Desktop\mosabaqa-game"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update display.css
p_css = os.path.join(base_dir, "public", "display", "display.css")
css_content = """
/* Make the display container huge and full height */
.display-container {
  max-width: 100% !important;
  width: 100vw;
  height: 100vh;
  padding: 10px 20px !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#gameArea {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.teams-row {
  display: flex !important;
  flex: 1;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: stretch;
  gap: 20px !important;
  width: 100%;
}

.team-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px !important;
  border-width: 3px !important;
}

.team-panel h2 {
  font-size: 3.5rem !important;
  margin: 0 0 15px 0 !important;
  flex-shrink: 0;
}

.huge-grid {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.huge-grid .board-grid {
  max-width: 100% !important;
  width: 100%;
  height: 100%;
  gap: 15px;
  grid-template-rows: repeat(3, 1fr) !important;
}

.huge-grid .board-cell {
  border-width: 4px;
  border-radius: 12px;
  aspect-ratio: auto !important;
}

.huge-grid .cell-number {
  font-size: 26px !important;
  top: 10px !important;
  right: 15px !important;
}

.huge-grid .cell-icon {
  font-size: clamp(30px, 5vw, 70px) !important;
}

/* Podium Styles */
.podium-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 30px;
  height: 65vh;
  margin-top: 50px;
}

.podium-step {
  width: 300px;
  background: linear-gradient(to top, #1e293b, #334155);
  border-top-left-radius: 25px;
  border-top-right-radius: 25px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 30px;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
  transition: all 1.5s cubic-bezier(0.25, 1, 0.5, 1);
  opacity: 0;
  transform: translateY(300px);
}

.podium-step.revealed {
  opacity: 1;
  transform: translateY(0);
}

.podium-step.rank-1 { height: 95%; background: linear-gradient(to top, #f59e0b, #b45309); }
.podium-step.rank-2 { height: 75%; background: linear-gradient(to top, #94a3b8, #475569); }
.podium-step.rank-3 { height: 55%; background: linear-gradient(to top, #b45309, #78350f); }

.podium-name { 
  font-size: 3rem; 
  font-weight: bold; 
  color: white; 
  text-shadow: 2px 2px 10px black; 
  text-align: center; 
  margin-bottom: 20px;
}

.podium-score { 
  font-size: 2.5rem; 
  color: #f1f5f9; 
  text-shadow: 1px 1px 5px black; 
}

.podium-medal { 
  font-size: 8rem; 
  margin-bottom: -40px; 
  z-index: 10; 
  filter: drop-shadow(0px 10px 10px rgba(0,0,0,0.8));
}
"""
write_file(p_css, css_content)

# 2. Update display.js
p_js = os.path.join(base_dir, "public", "display", "display.js")
c_js = read_file(p_js)

podium_replacement = """
  // DOM Order: Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
  podium.innerHTML = `
    ${createStep(rank2, 2, '🥈')}
    ${createStep(rank1, 1, '🥇')}
    ${createStep(rank3, 3, '🥉')}
  `;

  // Control via Enter key
  window.podiumSteps = [
    { rankNum: 3, rankInfo: rank3 },
    { rankNum: 1, rankInfo: rank1 },
    { rankNum: 2, rankInfo: rank2 }
  ];
  window.currentRevealIndex = 0;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
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
      }
    }
  }
});

function render(room) {
"""

# Remove old setTimeout logic
c_js = re.sub(r'  // DOM Order: Rank 2 \(Left\), Rank 1 \(Center\), Rank 3 \(Right\).*?function render\(room\) \{', podium_replacement, c_js, flags=re.DOTALL)
write_file(p_js, c_js)


# 3. Update server/socketHandlers.js
p_sh = os.path.join(base_dir, "server", "socketHandlers.js")
c_sh = read_file(p_sh)

bomb_logic_replacement = """
    socket.on('team_execute_bomb', ({ code, teamId, targetTeamId, cellIndex }, cb) => {
      try {
        const room = gs.getRoom(code);
        if (!room) throw new Error('الغرفة غير موجودة');
        if (room.bomberTeamId !== teamId) throw new Error('لست الفريق المخول بالقصف حالياً');
        
        const sourceTeam = room.teams[teamId];
        const targetTeam = room.teams[targetTeamId];
        
        const { result } = gs.executeBomb(room, targetTeamId, cellIndex);
        room.bomberTeamId = null; // سحب الصلاحية بعد القصف
        
        if (!result.hit) {
           io.to(room.code + '_public').emit('bomb_missed');
        }
        
        // Notify admin about the team's bomb result
        io.to(room.code + '_admin').emit('admin_bomb_log', {
           sourceName: sourceTeam.name,
           targetName: targetTeam.name,
           cellIndex,
           result
        });
        
        broadcastRoom(io, room);
        cb && cb({ ok: true, result });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });
"""

c_sh = re.sub(r"socket\.on\('team_execute_bomb',.*?\}\);", bomb_logic_replacement.strip(), c_sh, flags=re.DOTALL)
write_file(p_sh, c_sh)


# 4. Update admin.js to listen to admin_bomb_log
p_admin = os.path.join(base_dir, "public", "admin", "admin.js")
c_admin = read_file(p_admin)

admin_log_code = """
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
"""

if "socket.on('admin_bomb_log'" not in c_admin:
    c_admin += "\n" + admin_log_code

write_file(p_admin, c_admin)

print("Refactoring step 3 applied successfully.")
