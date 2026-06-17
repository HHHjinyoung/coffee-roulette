import { useEffect, useState } from 'react';
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
  
  const [currentOrder, setCurrentOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('coffee_currentOrder');
    return saved ? JSON.parse(saved) : [];
  });
  const [completed, setCompleted] = useState<string[]>(() => {
    const saved = localStorage.getItem('coffee_completed');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [nameInput, setNameInput] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [windowSize, setWindowSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await fetch(`${API_URL}/api/participants`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setParticipants(data);
        }
      } catch (error) {
        console.error('DB 연동 실패:', error);
        setToast('앗, 데이터베이스 연결에 실패했어요. 🥲');
      }
    };
    fetchParticipants();
  }, []);

  useEffect(() => {
    localStorage.setItem('coffee_currentOrder', JSON.stringify(currentOrder));
  }, [currentOrder]);

  useEffect(() => {
    localStorage.setItem('coffee_completed', JSON.stringify(completed));
  }, [completed]);

  useEffect(() => {
    const hasSavedState = localStorage.getItem('coffee_currentOrder') || localStorage.getItem('coffee_completed');
    if (participants.length > 0 && currentOrder.length === 0 && completed.length === 0 && (!hasSavedState || hasSavedState === '[]')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentOrder(shuffleArray(participants.map((p) => p.name)));
    }
  }, [participants, currentOrder.length, completed.length]);

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
    if (!trimmed) {
      setToast('이름을 깜빡하셨네요! 다시 확인해 주세요. 😊');
      return;
    }
    if (participants.some((p) => p.name === trimmed)) {
      setToast('이미 명단에 계신 분이에요! 혹시 동명이인인가요? 👀');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });

      if (!res.ok) throw new Error('추가 실패');
      const newParticipant = await res.json();

      setParticipants((prev) => [newParticipant, ...prev]);
      setCurrentOrder((prev) => [...prev, trimmed]);
      setNameInput('');
      setToast(`✨ ${trimmed}님, 환영합니다!`);
    } catch (error) {
      console.error(error);
      setToast('❌ 명단 저장에 실패했습니다.');
    }
  };

  const removeParticipant = async (id: string) => {
    const target = participants.find((p) => p.id === id);
    if (!target) return;

    try {
      const res = await fetch(`${API_URL}/api/participants/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('삭제 실패');

      const nextParticipants = participants.filter((p) => p.id !== id);
      setParticipants(nextParticipants);
      setCurrentOrder((prev) => prev.filter((name) => name !== target.name));
      setCompleted((prev) => prev.filter((name) => name !== target.name));
      setToast(`👋 ${target.name}님이 명단에서 제외되었습니다.`);

      if (nextParticipants.length === 0) {
        setCurrentOrder([]);
        setCompleted([]);
      }
    } catch (error) {
      console.error(error);
      setToast('❌ 삭제에 실패했습니다.');
    }
  };

  const completeRound = () => {
    setToast('🎉 오늘도 하루 수고하셨습니다!  준비중...');
    setCompleted([]);
    setCurrentOrder(shuffleArray(participants.map((p) => p.name)));
  };

  const handleSurprise = (name: string) => {
    if (completed.includes(name)) return;
    setCompleted((prev) => [...prev, name]);
    setCurrentOrder((prev) => prev.filter((item) => item !== name));
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1800);

    if (currentOrder.length === 1) {
      window.setTimeout(() => completeRound(), 1400);
    }
  };

  return (
    <div className="app-container">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={260} />}
      {toast && <div className="toast-message">{toast}</div>}

      <div className="main-content">
        
        {/* ✨ 중앙 로고 애니메이션 영역 ✨ */}
        <header className="hero-section">
          <div className="logo-circle">
            <img 
              src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Hot%20Beverage.png" 
              alt="Coffee Logo" 
              className="animated-logo"
            />
          </div>
        </header>

        {/* 결제자 선택 섹션 */}
        <section className="glass-card">
          <div className="card-header">
            <span className="card-icon">💳</span>
            <h2>결제하신 분의 이름을 눌러주세요:</h2>
          </div>
          
          <div className="participant-grid">
            {participants.map((participant) => {
              const disabled = completed.includes(participant.name);
              return (
                <button
                  key={participant.id}
                  type="button"
                  className={`action-btn ${disabled ? 'btn-disabled' : 'btn-active'}`}
                  onClick={() => handleSurprise(participant.name)}
                  disabled={disabled}
                >
                  {participant.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* 완료된 사람 목록 */}
        <section className="glass-card">
          <div className="card-header">
            <span className="card-icon">✅</span>
            <h2>결제 완료 명단</h2>
          </div>
          <div className="donators-list">
            {completed.length > 0 ? (
              <div className="donator-tags">
                {completed.map(name => <span key={name} className="donator-tag">{name}</span>)}
              </div>
            ) : (
              <p className="empty-state">아직 결제한 사람이 없습니다.</p>
            )}
          </div>
        </section>

        {/* 명단 관리 섹션 */}
        <section className="glass-card roster-card">
          <div className="card-header flex-header">
            <div>
              <span className="card-icon">👥</span>
              <h2>팀원 명단 관리</h2>
              <p>멤버를 추가하거나 관리해 주세요.</p>
            </div>
            <div className="member-count">총 {participants.length}명 함께하는 중</div>
          </div>

          <div className="input-group">
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="새로운 멤버 이름 입력"
              onKeyPress={(e) => { if(e.key === 'Enter') addParticipant(); }}
            />
            <button className="btn-primary" type="button" onClick={addParticipant}>
              + 합류
            </button>
          </div>

          <div className="roster-list">
            {participants.length === 0 ? (
              <p className="empty-state">명단이 비어 있거나 불러오는 중입니다...</p>
            ) : (
              participants.map((participant) => (
                <div key={participant.id} className="roster-item">
                  <span className="roster-name">{participant.name}</span>
                  <button className="btn-delete" type="button" onClick={() => removeParticipant(participant.id)}>
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

export default App;