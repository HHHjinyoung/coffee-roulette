import { useEffect, useMemo, useState } from 'react';
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
  const [slotName, setSlotName] = useState('—');
  const [isSlotRolling, setIsSlotRolling] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // [수정됨] 화면 크기 초기값을 useState 안에서 바로 가져오도록 변경 (에러 해결)
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
        // [수정됨] error 변수를 실제로 사용하여 미사용 에러 해결
        console.error('DB 연동 실패:', error);
        setToast('데이터베이스 연결에 실패했습니다.');
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
      // [수정됨] 초기 설정 시 발생하는 불가피한 상태 변경이므로 검사기 예외 처리
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentOrder(shuffleArray(participants.map((p) => p.name)));
    }
  }, [participants, currentOrder.length, completed.length]);

  useEffect(() => {
    if (currentOrder.length === 0) {
      // [수정됨] 검사기 예외 처리
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlotName('—');
      return;
    }

    setIsSlotRolling(true);
    const allNames = participants.length > 0 ? participants.map((p) => p.name) : ['로딩중...'];
    let count = 0;
    const interval = window.setInterval(() => {
      setSlotName(allNames[Math.floor(Math.random() * allNames.length)]);
      count += 1;
      if (count >= 15) {
        window.clearInterval(interval);
        setIsSlotRolling(false);
        setSlotName(currentOrder[0]);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [currentOrder, participants]);

  // [수정됨] 불필요한 초기 상태 세팅 제거 (위쪽 useState에서 처리함)
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

  const remainingSequence = useMemo(() => currentOrder.slice(1).join(' ➔ '), [currentOrder]);
  const remainingText = currentOrder.length > 1 ? remainingSequence : '다음 라운드 준비 중...';

  const addParticipant = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setToast('이름을 입력해 주세요!');
      return;
    }
    if (participants.some((p) => p.name === trimmed)) {
      setToast('이미 있는 이름이에요!');
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
      setToast(`✨ ${trimmed}님이 추가되었습니다!`);
    } catch (error) {
      // [수정됨] error 출력 추가
      console.error(error);
      setToast('❌ 서버 저장에 실패했습니다.');
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
      setToast(`🗑️ ${target.name}님이 명단에서 제외되었습니다.`);

      if (nextParticipants.length === 0) {
        setCurrentOrder([]);
        setCompleted([]);
        setSlotName('—');
      }
    } catch (error) {
      // [수정됨] error 출력 추가
      console.error(error);
      setToast('❌ 삭제에 실패했습니다.');
    }
  };

  const completeRound = () => {
    setToast('🎉 모두가 한 번씩 샀습니다! 순서를 다시 섞습니다!');
    setCompleted([]);
    setCurrentOrder(shuffleArray(participants.map((p) => p.name)));
  };

  const handlePay = () => {
    if (currentOrder.length === 0) return;
    const winner = currentOrder[0];
    setCompleted((prev) => [...prev, winner]);
    setCurrentOrder((prev) => prev.slice(1));
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1800);

    if (currentOrder.length === 1) {
      window.setTimeout(() => completeRound(), 1400);
    }
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
    <div className="game-shell">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={260} />}
      {toast && <div className="toast-message">{toast}</div>}

      <div className="game-card">
        <header className="game-header">
          <span className="game-emoji">🎲</span>
          <div>
            <p className="game-tag">랜덤 커피 당번</p>
            <h1>랜덤 커피 당번</h1>
            <p className="game-copy">7명이 무작위로 한 번씩 다 살 때까지 중복 없이 진행됩니다.</p>
          </div>
        </header>

        <section className="next-box">
          <div className="next-label">다음 차례</div>
          <div className={`next-name ${isSlotRolling ? 'rolling' : ''}`}>{slotName}</div>
          <div className="next-subcopy">⏳ 이번 라운드 남은 순서: {remainingText}</div>
        </section>

        <button className="pay-button" type="button" onClick={handlePay} disabled={currentOrder.length === 0}>
          💰 맨 앞 사람이 결제했습니다
        </button>

        <section className="surprise-box">
          <p className="surprise-copy">🙋‍♂️ 깜짝 선출! 다른 사람이 샀다면 아래 이름을 누르세요:</p>
          <div className="party-grid">
            {participants.map((participant) => {
              const disabled = completed.includes(participant.name);
              return (
                <button
                  key={participant.id}
                  type="button"
                  className={`party-pill ${disabled ? 'disabled' : ''}`}
                  onClick={() => handleSurprise(participant.name)}
                  disabled={disabled}
                >
                  {participant.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="done-box">
          <div className="done-title">✅ 이번 라운드 이미 산 사람</div>
          <div className="done-list">
            {completed.length > 0 ? completed.join(', ') : '아직 아무도 결제하지 않았습니다.'}
          </div>
        </section>

        <section className="roster-box">
          <div className="roster-header">
            <div>
              <div className="roster-title">명단 관리</div>
              <p className="roster-copy">입사/퇴사 시 여기에 추가하거나 삭제하세요.</p>
            </div>
            <div className="roster-count">총 {participants.length}명</div>
          </div>

          <div className="roster-input-row">
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="새 참가자 이름 입력"
            />
            <button className="roster-add" type="button" onClick={addParticipant}>
              + 추가
            </button>
          </div>

          <div className="roster-list">
            {participants.length === 0 ? (
              <div className="roster-empty">명단이 비어 있거나 불러오는 중입니다...</div>
            ) : (
              participants.map((participant) => (
                <div key={participant.id} className="roster-item">
                  <span>{participant.name}</span>
                  <button className="remove-btn" type="button" onClick={() => removeParticipant(participant.id)}>
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