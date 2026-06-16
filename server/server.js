const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dbFile = path.join(__dirname, 'coffee.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('DB open error', err);
    process.exit(1);
  }
  initializeDatabase((initErr) => {
    if (initErr) {
      console.error('Database initialization failed:', initErr);
      process.exit(1);
    }
    startServer();
  });
});

function initializeDatabase(callback) {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) return callback(err);

        db.run(
          `CREATE TABLE IF NOT EXISTS game_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            winner_id INTEGER NOT NULL,
            round_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (winner_id) REFERENCES participants(id)
          )`,
          (err) => {
            if (err) return callback(err);

            migrateOldGameResultsSchema((migrateErr) => {
              if (migrateErr) return callback(migrateErr);

              db.run(
                `CREATE TABLE IF NOT EXISTS settings (
                  key TEXT PRIMARY KEY,
                  value TEXT
                )`,
                (err) => {
                  if (err) return callback(err);

                  db.get("SELECT value FROM settings WHERE key = 'current_round'", (err, row) => {
                    if (err) return callback(err);
                    if (!row) {
                      db.run("INSERT INTO settings (key, value) VALUES ('current_round', '1')", (err) => {
                        if (err) return callback(err);
                        callback(null);
                      });
                    } else {
                      callback(null);
                    }
                  });
                }
              );
            });
          }
        );
      }
    );
  });
}

function migrateOldGameResultsSchema(callback) {
  db.all(`PRAGMA table_info(game_results)`, (err, rows) => {
    if (err) return callback(err);
    const columns = rows.map((row) => row.name);

    if (columns.includes('game_date') && !columns.includes('round_id')) {
      db.serialize(() => {
        db.run(`DROP TABLE IF EXISTS game_results_new`, (dropErr) => {
          if (dropErr) return callback(dropErr);

          db.run(
            `CREATE TABLE IF NOT EXISTS game_results_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              winner_id INTEGER NOT NULL,
              round_id INTEGER NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (winner_id) REFERENCES participants(id)
            )`,
            (createErr) => {
              if (createErr) return callback(createErr);

              db.run(
                `INSERT INTO game_results_new (winner_id, round_id, status, created_at)
                 SELECT winner_id, 1, 'pending', game_date FROM game_results`,
                (insertErr) => {
                  if (insertErr) return callback(insertErr);

                  db.run('DROP TABLE IF EXISTS game_results', (dropOldErr) => {
                    if (dropOldErr) return callback(dropOldErr);

                    db.run('ALTER TABLE game_results_new RENAME TO game_results', (renameErr) => {
                      if (renameErr) return callback(renameErr);
                      callback(null);
                    });
                  });
                }
              );
            }
          );
        });
      });
    } else {
      const tasks = [];
      if (!columns.includes('round_id')) {
        tasks.push((done) => db.run(`ALTER TABLE game_results ADD COLUMN round_id INTEGER NOT NULL DEFAULT 1`, done));
      }
      if (!columns.includes('status')) {
        tasks.push((done) => db.run(`ALTER TABLE game_results ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`, done));
      }
      if (!columns.includes('created_at')) {
        tasks.push((done) => db.run(`ALTER TABLE game_results ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, done));
      }

      if (tasks.length === 0) return callback(null);

      let completed = 0;
      for (const task of tasks) {
        task((taskErr) => {
          if (taskErr) return callback(taskErr);
          completed += 1;
          if (completed === tasks.length) callback(null);
        });
      }
    }
  });
}

function getCurrentRound(cb) {
  db.get("SELECT value FROM settings WHERE key = 'current_round'", (err, row) => {
    if (err) return cb(err);
    const r = row ? parseInt(row.value, 10) : 1;
    cb(null, r);
  });
}

function setCurrentRound(next, cb) {
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('current_round', ?)", [String(next)], (err) => cb(err));
}

// Participants
app.post('/api/participants', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '이름을 입력해주세요' });
  db.run('INSERT INTO participants (name) VALUES (?)', [name.trim()], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: '이미 존재하는 이름입니다' });
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name });
  });
});

app.get('/api/participants', (req, res) => {
  db.all('SELECT * FROM participants ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM participants WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '참가자가 삭제되었습니다' });
  });
});

// Play a game: pick random participant excluding those who already PAID in current round
app.post('/api/game/play', (req, res) => {
  getCurrentRound((err, round) => {
    if (err) return res.status(500).json({ error: err.message });
    const sql = `SELECT p.* FROM participants p
                 WHERE p.id NOT IN (
                   SELECT winner_id FROM game_results WHERE round_id = ?
                 )
                 ORDER BY RANDOM() LIMIT 1`;
    db.get(sql, [round], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(400).json({ error: '현재 라운드에서 더 이상 선택 가능한 참가자가 없습니다. 라운드를 진행해주세요.' });
      const winner = row;
      db.run('INSERT INTO game_results (winner_id, round_id, status) VALUES (?, ?, ?)', [winner.id, round, 'pending'], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, winner_id: winner.id, winner_name: winner.name, round_id: round, status: 'pending' });
      });
    });
  });
});

// Get recent results
app.get('/api/game/results', (req, res) => {
  db.all(`SELECT gr.id, gr.winner_id, gr.round_id, IFNULL(gr.status, 'pending') AS status, IFNULL(gr.created_at, '') AS created_at, p.name
          FROM game_results gr JOIN participants p ON p.id = gr.winner_id
          ORDER BY gr.created_at DESC LIMIT 50`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(Array.isArray(rows) ? rows : []);
  });
});

// Update result status (pending -> paid | skipped)
app.put('/api/results/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['paid', 'skipped'].includes(status)) return res.status(400).json({ error: '잘못된 상태' });

  db.get('SELECT status, winner_id, round_id FROM game_results WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '결과를 찾을 수 없습니다' });
    if (row.status !== 'pending') return res.status(400).json({ error: '상태 전이는 pending에서만 허용됩니다' });

    db.run('UPDATE game_results SET status = ? WHERE id = ?', [status, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT gr.id, gr.status, gr.round_id, p.name FROM game_results gr JOIN participants p ON p.id=gr.winner_id WHERE gr.id = ?', [id], (err, updated) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(updated);
      });
    });
  });
});

// Statistics: count only status === 'paid'
app.get('/api/statistics', (req, res) => {
  db.all(`SELECT p.id, p.name,
          IFNULL((SELECT COUNT(*) FROM game_results gr WHERE gr.winner_id = p.id AND gr.status = 'paid'), 0) as game_count,
          p.created_at
          FROM participants p
          ORDER BY game_count DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Round info and progress
app.get('/api/round', (req, res) => {
  getCurrentRound((err, round) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT COUNT(*) as total FROM participants', (err, pRow) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT COUNT(*) as paidCount FROM game_results WHERE round_id = ? AND status = "paid"', [round], (err, paidRow) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ current_round: round, total_participants: pRow.total, paid_count: paidRow.paidCount });
      });
    });
  });
});

// pending winners for current round
app.get('/api/round/pending-winners', (req, res) => {
  getCurrentRound((err, round) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(`SELECT gr.id, gr.winner_id as participant_id, p.name FROM game_results gr JOIN participants p ON p.id=gr.winner_id
            WHERE gr.round_id = ? AND gr.status = 'pending'`, [round], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });
});

// Advance round: only when no pending results
app.post('/api/round/advance', (req, res) => {
  getCurrentRound((err, round) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT COUNT(*) as pending FROM game_results WHERE round_id = ? AND status = "pending"', [round], (err, pendingRow) => {
      if (err) return res.status(500).json({ error: err.message });
      if (pendingRow.pending > 0) return res.status(400).json({ error: '처리되지 않은 pending 결과가 있습니다' });

      db.get('SELECT COUNT(*) as totalResults FROM game_results WHERE round_id = ?', [round], (err, totalRow) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT COUNT(*) as totalParticipants FROM participants', (err, partRow) => {
          if (err) return res.status(500).json({ error: err.message });
          if (totalRow.totalResults < partRow.totalParticipants) {
            return res.status(400).json({ error: '모든 참가자가 현재 라운드에서 처리되지 않았습니다' });
          }

          const next = round + 1;
          setCurrentRound(next, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: '라운드가 증가되었습니다', next_round: next });
          });
        });
      });
    });
  });
});

// Reset: clear game_results and reset round to 1
app.post('/api/reset', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM game_results', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      setCurrentRound(1, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '게임 데이터가 초기화되고 라운드가 1로 설정되었습니다' });
      });
    });
  });
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
