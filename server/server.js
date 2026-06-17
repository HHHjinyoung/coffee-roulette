const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// 1. Participant (참가자 명단)
const participantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Participant = mongoose.model('Participant', participantSchema);

// 2. GameResult (결과 저장용 - 나중을 위해 유지)
const gameResultSchema = new mongoose.Schema({
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  roundId: { type: Number, required: true, default: 1 },
  status: { type: String, enum: ['pending', 'paid', 'skipped'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const GameResult = mongoose.model('GameResult', gameResultSchema);

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
});
const Setting = mongoose.model('Setting', settingSchema);

// 3. ✨ [추가됨] GameState (실시간 동기화를 위한 영구 저장소) ✨
const stateSchema = new mongoose.Schema({
  key: { type: String, default: 'mainState', unique: true },
  currentOrder: { type: [String], default: [] },
  completed: { type: [String], default: [] }
});
const GameState = mongoose.model('GameState', stateSchema);

// 헬퍼 함수
async function getCurrentRound() {
  const setting = await Setting.findOne({ key: 'current_round' });
  return setting ? parseInt(setting.value, 10) : 1;
}

async function setCurrentRound(round) {
  await Setting.findOneAndUpdate(
    { key: 'current_round' },
    { value: round.toString() },
    { upsert: true, new: true }
  );
}

// --- API 라우터들 ---

// ✨ [수정됨] 메모리 변수 대신 DB에서 읽고 쓰기 ✨
app.get('/api/state', async (req, res) => {
  try {
    let state = await GameState.findOne({ key: 'mainState' });
    if (!state) {
      state = await GameState.create({ key: 'mainState', currentOrder: [], completed: [] });
    }
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/state', async (req, res) => {
  try {
    const { currentOrder, completed } = req.body;
    const state = await GameState.findOneAndUpdate(
      { key: 'mainState' },
      { currentOrder, completed },
      { upsert: true, new: true }
    );
    res.json({ success: true, gameState: state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 참가자 API
app.post('/api/participants', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '이름을 입력해주세요' });
    
    const participant = new Participant({ name: name.trim() });
    await participant.save();
    res.status(201).json({ id: participant._id, name: participant.name });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: '이미 존재하는 이름입니다' });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/participants', async (req, res) => {
  try {
    const participants = await Participant.find().sort({ createdAt: -1 });
    res.json(participants.map(p => ({ id: p._id, name: p.name, created_at: p.createdAt })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Participant.findByIdAndDelete(id);
    res.json({ message: '참가자가 삭제되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 게임 플레이 및 결과 API
app.post('/api/game/play', async (req, res) => {
  try {
    const round = await getCurrentRound();
    const paidResults = await GameResult.find({ roundId: round }).select('winnerId');
    const paidWinnerIds = paidResults.map(result => result.winnerId);
    const eligibleParticipants = await Participant.find({ _id: { $nin: paidWinnerIds } });

    if (eligibleParticipants.length === 0) {
      return res.status(400).json({ error: '현재 라운드에서 더 이상 선택 가능한 참가자가 없습니다.' });
    }

    const winner = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
    const gameResult = new GameResult({ winnerId: winner._id, roundId: round, status: 'pending' });
    await gameResult.save();

    res.json({ id: gameResult._id, winner_id: winner._id, winner_name: winner.name, round_id: round, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/game/results', async (req, res) => {
  try {
    const results = await GameResult.find().sort({ createdAt: -1 }).limit(50).populate('winnerId', 'name');
    res.json(results.map(r => ({
      id: r._id,
      winner_id: r.winnerId ? r.winnerId._id : null,
      name: r.winnerId ? r.winnerId.name : 'Unknown',
      round_id: r.roundId,
      status: r.status,
      created_at: r.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['paid', 'skipped'].includes(status)) return res.status(400).json({ error: '잘못된 상태' });

    const result = await GameResult.findById(id).populate('winnerId');
    if (!result) return res.status(404).json({ error: '결과를 찾을 수 없습니다' });
    
    result.status = status;
    await result.save();
    res.json({ id: result._id, status: result.status, round_id: result.roundId, name: result.winnerId.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 라운드 관리 API
app.get('/api/round', async (req, res) => {
  try {
    const round = await getCurrentRound();
    const totalParticipants = await Participant.countDocuments();
    const paidCount = await GameResult.countDocuments({ roundId: round, status: 'paid' });
    res.json({ current_round: round, total_participants: totalParticipants, paid_count: paidCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/round/advance', async (req, res) => {
  try {
    const round = await getCurrentRound();
    const pendingCount = await GameResult.countDocuments({ roundId: round, status: 'pending' });
    if (pendingCount > 0) return res.status(400).json({ error: '처리되지 않은 pending 결과가 있습니다' });
    
    const next = round + 1;
    await setCurrentRound(next);
    res.json({ message: '라운드가 증가되었습니다', next_round: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    await GameResult.deleteMany({});
    await setCurrentRound(1);
    
    // ✨ [추가됨] 리셋 시 DB 상태도 함께 비우기 ✨
    await GameState.findOneAndUpdate(
      { key: 'mainState' },
      { currentOrder: [], completed: [] },
      { upsert: true }
    );
    
    res.json({ message: '게임 데이터가 초기화되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});