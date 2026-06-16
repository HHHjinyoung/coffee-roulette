const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS 설정 (Vercel 주소)
const corsOptions = {
  origin: ['http://localhost:5173', 'https://coffee-roulette-liard.vercel.app'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schema 정의
const participantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Participant = mongoose.model('Participant', participantSchema);

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

// 참가자 API
app.post('/api/participants', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '이름을 입력해주세요' });
    
    const participant = new Participant({ name: name.trim() });
    await participant.save();
    
    // id를 프론트엔드와 맞추기 위해 _id를 id로 변환해서 보냄
    res.status(201).json({ id: participant._id, name: participant.name });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: '이미 존재하는 이름입니다' });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/participants', async (req, res) => {
  try {
    const participants = await Participant.find().sort({ createdAt: -1 });
    // SQLite 형식과 맞추기
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

// 게임 플레이 API
app.post('/api/game/play', async (req, res) => {
  try {
    const round = await getCurrentRound();
    
    // 이번 라운드에 이미 선택된 사람들의 ID 가져오기
    const paidResults = await GameResult.find({ roundId: round }).select('winnerId');
    const paidWinnerIds = paidResults.map(result => result.winnerId);

    // 아직 선택되지 않은 참가자 찾기
    const eligibleParticipants = await Participant.find({ _id: { $nin: paidWinnerIds } });

    if (eligibleParticipants.length === 0) {
      return res.status(400).json({ error: '현재 라운드에서 더 이상 선택 가능한 참가자가 없습니다. 라운드를 진행해주세요.' });
    }

    // 랜덤 선택
    const winner = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];

    const gameResult = new GameResult({
      winnerId: winner._id,
      roundId: round,
      status: 'pending'
    });
    await gameResult.save();

    res.json({
      id: gameResult._id,
      winner_id: winner._id,
      winner_name: winner.name,
      round_id: round,
      status: 'pending'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 결과 조회 API
app.get('/api/game/results', async (req, res) => {
  try {
    const results = await GameResult.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('winnerId', 'name'); // winnerId 참조해서 Participant의 name 가져옴

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

// 상태 업데이트 API
app.put('/api/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['paid', 'skipped'].includes(status)) return res.status(400).json({ error: '잘못된 상태' });

    const result = await GameResult.findById(id).populate('winnerId');
    if (!result) return res.status(404).json({ error: '결과를 찾을 수 없습니다' });
    if (result.status !== 'pending') return res.status(400).json({ error: '상태 전이는 pending에서만 허용됩니다' });

    result.status = status;
    await result.save();

    res.json({
      id: result._id,
      status: result.status,
      round_id: result.roundId,
      name: result.winnerId.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 라운드 정보 및 리셋 관련 API
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

app.get('/api/round/pending-winners', async (req, res) => {
  try {
    const round = await getCurrentRound();
    const results = await GameResult.find({ roundId: round, status: 'pending' }).populate('winnerId', 'name');
    
    res.json(results.map(r => ({
      id: r._id,
      participant_id: r.winnerId._id,
      name: r.winnerId.name
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/round/advance', async (req, res) => {
  try {
    const round = await getCurrentRound();
    const pendingCount = await GameResult.countDocuments({ roundId: round, status: 'pending' });
    
    if (pendingCount > 0) return res.status(400).json({ error: '처리되지 않은 pending 결과가 있습니다' });

    const totalResults = await GameResult.countDocuments({ roundId: round });
    const totalParticipants = await Participant.countDocuments();

    if (totalResults < totalParticipants) {
      return res.status(400).json({ error: '모든 참가자가 현재 라운드에서 처리되지 않았습니다' });
    }

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
    res.json({ message: '게임 데이터가 초기화되고 라운드가 1로 설정되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});