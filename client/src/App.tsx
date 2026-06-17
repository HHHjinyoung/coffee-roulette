import { useEffect, useState, useCallback } from 'react';
import Confetti from 'react-confetti';
import './App.css';

type Participant = {
  id: string;
  name: string;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const shuffleArray = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  
  const [nameInput, setNameInput] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [windowSize, setWindowSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  // ✨ 포인트 1: 데이터 로딩 상태를 기억할 변수 추가! ✨
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [partRes, stateRes] = await Promise.all([
        fetch(`${API_URL}/api/participants`),
        fetch(`${API_URL}/api/state`).catch(() => null)
      ]);
      
      if (partRes.ok) {
        const data = await partRes.json();
        if (Array.isArray(data)) setParticipants(data);
      }
      if (stateRes && stateRes.ok) {
        const stateData = await stateRes.json();
        setCurrentOrder(stateData.currentOrder || []);
        setCompleted(stateData.completed || []);
      }
      
      // ✨ 포인트 2: 서버에서 데이터를 무사히 다 받아왔을 때만 로딩 완료로 체크! ✨
      setIsLoaded(true);
    } catch (error) {
      console.error('동기화 실패:', error);
    }
  }, []);

  const saveState = useCallback(async (newOrder: string[], newCompleted: string[]) => {
    try {
      await fetch(`${API_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentOrder: newOrder, completed: newCompleted })
      });
      fetchData();
    } catch (error) {
      console.error('상태 저장 실패:', error);
    }
  }, [fetchData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ✨ 포인트 3: isLoaded가 true일 때(로딩이 진짜 끝났을 때)만 초기화 판단! ✨
  useEffect(() => {
    if (isLoaded && participants.length > 0 && currentOrder.length === 0 && completed.length === 0) {
      const initialOrder = shuffleArray(participants.map((p) => p.name));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentOrder(initialOrder);
      saveState(initialOrder, []);
    }
  }, [isLoaded, participants, currentOrder.length, completed.length, saveState]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const addParticipant = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setToast('이름을 깜빡하셨네요!'); return; }
    if (participants.some((p) => p.name === trimmed)) { setToast('이미 있는 이름입니다.'); return; }

    const res = await fetch(`${API_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed })
    });

    if (res.ok) {
      setNameInput('');
      fetchData();
    }
  };

  const removeParticipant = async (id: string) => {
    const target = participants.find((p) => p.id === id);
    if (!target) return;
    
    await fetch(`${API_URL}/api/participants/${id}`, { method: 'DELETE' });
    const nextOrder = currentOrder.filter((name) => name !== target.name);
    const nextCompleted = completed.filter((name) => name !== target.name);
    saveState(nextOrder, nextCompleted);
  };

  const handleSurprise = (name: string) => {
    if (completed.includes(name)) return;
    const nextCompleted = [...completed, name];
    const nextOrder = currentOrder.filter((item) => item !== name);
    
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1800);

    if (nextOrder.length === 0) {
      setToast('🎉 오늘도 하루 수고하셨습니다!  준비중...');
      const resetOrder = shuffleArray(participants.map((p) => p.name));
      saveState(resetOrder, []);
    } else {
      saveState(nextOrder, nextCompleted);
    }
  };

  return (
    <div className="app-container">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={260} />}
      {toast && <div className="toast-message">{toast}</div>}
      <div className="main-content">
        <header className="hero-section">
          <div className="logo-circle"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Hot%20Beverage.png" alt="Coffee Logo" className="animated-logo" /></div>
        </header>
        <section className="glass-card">
          <div className="card-header">
            <span className="card-icon">💳</span>
            <h2>결제하신 분의 이름을 눌러주세요:</h2>
          </div>
          <div className="participant-grid">
            {participants.map((p) => (
              <button key={p.id} className={`action-btn ${completed.includes(p.name) ? 'btn-disabled' : 'btn-active'}`} onClick={() => handleSurprise(p.name)} disabled={completed.includes(p.name)}>{p.name}</button>
            ))}
          </div>
        </section>
        <section className="glass-card">
          <div className="card-header"><span className="card-icon">✅</span><h2>결제 완료 명단</h2></div>
          <div className="donators-list">{completed.length > 0 ? <div className="donator-tags">{completed.map(n => <span key={n} className="donator-tag">{n}</span>)}</div> : <p className="empty-state">아직 결제한 사람이 없습니다.</p>}</div>
        </section>
        <section className="glass-card roster-card">
          <div className="card-header flex-header">
            <div><span className="card-icon">👥</span><h2>팀원 명단 관리</h2><p>멤버를 추가하거나 관리해 주세요.</p></div>
            <div className="member-count">총 {participants.length}명 함께하는 중</div>
          </div>
          <div className="input-group">
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="새로운 멤버 이름 입력" onKeyPress={(e) => { if(e.key === 'Enter') addParticipant(); }} />
            <button className="btn-primary" onClick={addParticipant}>+ 합류</button>
          </div>
          <div className="roster-list">{participants.map((p) => (<div key={p.id} className="roster-item"><span>{p.name}</span><button className="btn-delete" onClick={() => removeParticipant(p.id)}>삭제</button></div>))}</div>
        </section>
      </div>
    </div>
  );
}

export default App;