const gs = require('./gameState');

function roomSummary(room, isAdmin = false) {
  return {
    code: room.code,
    status: room.status,
    unitConfig: room.unitConfig,
    currentQuestion: room.currentQuestion,
    teams: gs.publicTeamsView(room, { isAdmin }),
  };
}

function broadcastRoom(io, room) {
  io.to(room.code + '_admin').emit('room_updated', roomSummary(room, true));
  io.to(room.code + '_public').emit('room_updated', roomSummary(room, false));
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedRoomCode = null;
    let joinedTeamId = null;
    let isAdmin = false;

    socket.on('admin_create_room', (payload, cb) => {
      try {
        const adminPin = payload && payload.adminPin;
        const room = gs.createRoom({ unitConfig: payload && payload.unitConfig, adminPin });
        socket.join(room.code + '_admin');
        joinedRoomCode = room.code;
        isAdmin = true;
        cb && cb({ ok: true, room: roomSummary(room, isAdmin) });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on('admin_join_room', ({ code, adminPin }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      if (room.adminPin && room.adminPin !== adminPin) return cb && cb({ ok: false, error: 'كلمة المرور غير صحيحة' });
      socket.join(room.code + '_admin');
      joinedRoomCode = room.code;
      isAdmin = true;
      cb && cb({ ok: true, room: roomSummary(room, isAdmin) });
    });

    socket.on('admin_add_team', ({ code, name }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      const team = gs.addTeam(room, name);
      broadcastRoom(io, room);
      cb && cb({ ok: true, team });
    });

    socket.on('get_room_teams', ({ code }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'كود الغرفة غير صحيح' });
      const teams = Object.values(room.teams).map((t) => ({ id: t.id, name: t.name, connected: t.connected }));
      cb && cb({ ok: true, teams, status: room.status });
    });

    socket.on('team_join_room', ({ code, teamId, secret }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'كود الغرفة غير صحيح' });
      const team = room.teams[teamId];
      if (!team) return cb && cb({ ok: false, error: 'الفريق غير موجود' });
      if (team.secret && team.secret !== secret) return cb && cb({ ok: false, error: 'الرقم السري غير صحيح' });
      socket.join(room.code + '_public');
      joinedRoomCode = room.code;
      joinedTeamId = teamId;
      team.socketId = socket.id;
      team.connected = true;
      broadcastRoom(io, room);
      cb && cb({
        ok: true,
        room: roomSummary(room),
        team: { id: team.id, name: team.name, distributed: team.distributed, board: team.board },
      });
    });

    socket.on('team_distribute_board', ({ code, teamId, placements }, cb) => {
      try {
        const room = gs.getRoom(code);
        if (!room) throw new Error('الغرفة غير موجودة');
        gs.distributeBoard(room, teamId, placements);
        broadcastRoom(io, room);
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on('admin_start_game', ({ code }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      gs.startGame(room);
      broadcastRoom(io, room);
      cb && cb({ ok: true });
    });

    socket.on('admin_show_question', ({ code, question }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      gs.showQuestion(room, question);
      broadcastRoom(io, room);
      cb && cb({ ok: true });
    });

    socket.on('admin_clear_question', ({ code }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      gs.clearQuestion(room);
      broadcastRoom(io, room);
      cb && cb({ ok: true });
    });

    socket.on('admin_execute_bomb', ({ code, targetTeamId, cellIndex }, cb) => {
      try {
        const room = gs.getRoom(code);
        if (!room) throw new Error('الغرفة غير موجودة');
        const { result } = gs.executeBomb(room, targetTeamId, cellIndex);
        broadcastRoom(io, room);
        cb && cb({ ok: true, result });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on('admin_finish_game', ({ code }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      const ranking = gs.finishGame(room);
      io.to(room.code).emit('game_finished', { ranking });
      broadcastRoom(io, room);
      cb && cb({ ok: true, ranking });
    });

    socket.on('display_join_room', ({ code }, cb) => {
      const room = gs.getRoom(code);
      if (!room) return cb && cb({ ok: false, error: 'الغرفة غير موجودة' });
      socket.join(room.code + '_public');
      joinedRoomCode = room.code;
      cb && cb({ ok: true, room: roomSummary(room, isAdmin) });
    });

    socket.on('disconnect', () => {
      if (joinedRoomCode && joinedTeamId) {
        const room = gs.getRoom(joinedRoomCode);
        if (room && room.teams[joinedTeamId]) {
          room.teams[joinedTeamId].connected = false;
          broadcastRoom(io, room);
        }
      }
    });
  });
}

module.exports = { registerSocketHandlers };
