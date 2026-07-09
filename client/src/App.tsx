import { useEffect, useState, useCallback } from 'react';
import Confetti from 'react-confetti';
import './App.css';

type Participant = {
  id: string;
  name: string;
};

type PaymentLogEntry = {
  id: string;
  name: string;
  paidAt: string;
};

type ToastState = {
  message: string;
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

const formatLogTime = (paidAt: string) =>
  new Date(paidAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  
  const [paymentLog, setPaymentLog] = useState<PaymentLogEntry[]>([]);

  const [nameInput, setNameInput] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [windowSize, setWindowSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'log'>('roster');

  const fetchData = useCallback(async () => {
    try {
      const [partRes, stateRes, logRes] = await Promise.all([
        fetch(`${API_URL}/api/participants`),
        fetch(`${API_URL}/api/state`).catch(() => null),
        fetch(`${API_URL}/api/payment-log`).catch(() => null)
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
      if (logRes && logRes.ok) {
        const logData = await logRes.json();
        if (Array.isArray(logData)) setPaymentLog(logData);
      }

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
    if (!trimmed) { setToast({ message: '이름을 깜빡하셨네요!' }); return; }
    if (participants.some((p) => p.name === trimmed)) { setToast({ message: '이미 있는 이름입니다.' }); return; }

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
    if (!window.confirm(`${target.name}님을 명단에서 삭제할까요?`)) return;

    await fetch(`${API_URL}/api/participants/${id}`, { method: 'DELETE' });
    const nextOrder = currentOrder.filter((name) => name !== target.name);
    const nextCompleted = completed.filter((name) => name !== target.name);
    saveState(nextOrder, nextCompleted);
  };

  const logPayment = async (name: string) => {
    try {
      await fetch(`${API_URL}/api/payment-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      fetchData();
    } catch (error) {
      console.error('결제 로그 기록 실패:', error);
    }
  };

  const cancelPayment = async (logId: string) => {
    try {
      await fetch(`${API_URL}/api/payment-log/${logId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('결제 로그 취소 실패:', error);
    }
  };

  const cancelCompletion = (name: string) => {
    const latestLog = paymentLog.find((entry) => entry.name === name);
    const nextCompleted = completed.filter((item) => item !== name);
    const nextOrder = [...currentOrder, name];

    if (latestLog) cancelPayment(latestLog.id);
    setToast({ message: `${name}님의 결제를 취소했습니다.` });
    saveState(nextOrder, nextCompleted);
  };

  const completeParticipant = (name: string) => {
    const nextCompleted = [...completed, name];
    const nextOrder = currentOrder.filter((item) => item !== name);

    logPayment(name);
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1800);

    if (nextOrder.length === 0) {
      setToast({ message: '🎉 오늘도 하루 수고하셨습니다!  준비중...' });
      const resetOrder = shuffleArray(participants.map((p) => p.name));
      saveState(resetOrder, []);
    } else {
      saveState(nextOrder, nextCompleted);
    }
  };

  const handleSurprise = (name: string) => {
    if (completed.includes(name)) {
      cancelCompletion(name);
    } else {
      completeParticipant(name);
    }
  };

  return (
    <div className="app-container">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={260} />}
      {toast && <div className="toast-message">{toast.message}</div>}
      <div className="main-content">
        <header className="hero-section">
          <div className="logo-circle"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Hot%20Beverage.png" alt="Coffee Logo" className="animated-logo" /></div>
        </header>

        {participants.length > 0 && (
          <div className="stats-bar">
            <div className="stat-tile">
              <span className="stat-value">{participants.length}</span>
              <span className="stat-label">참가 인원</span>
            </div>
            <div className="stat-tile stat-tile-gauge">
              <span className="stat-value">{completed.length} / {participants.length}</span>
              <span className="stat-label">결제 완료</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(completed.length / participants.length) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        <section className="glass-card primary-card">
          <div className="card-header">
            <span className="card-icon">💳</span>
            <h2>결제하신 분의 이름을 눌러주세요</h2>
          </div>
          <div className="participant-grid">
            {participants.map((p) => (
              <button key={p.id} className={`action-btn ${completed.includes(p.name) ? 'btn-completed' : 'btn-active'}`} onClick={() => handleSurprise(p.name)}>{p.name}</button>
            ))}
          </div>
          {completed.length > 0 && (
            <div className="completed-strip">
              <span className="completed-strip-label">결제 완료</span>
              <div className="donator-tags">{completed.map(n => <span key={n} className="donator-tag">{n}</span>)}</div>
            </div>
          )}
        </section>

        <section className="glass-card">
          <div className="tab-header">
            <button className={`tab-btn ${activeTab === 'roster' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('roster')}>👥 명단 관리</button>
            <button className={`tab-btn ${activeTab === 'log' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('log')}>🧾 결제 로그</button>
          </div>

          {activeTab === 'roster' ? (
            <div>
              <div className="input-group">
                <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="새로운 멤버 이름 입력" onKeyDown={(e) => { if (e.key === 'Enter') addParticipant(); }} />
                <button className="btn-primary" onClick={addParticipant}>+ 합류</button>
              </div>
              <div className="roster-list">{participants.map((p) => (<div key={p.id} className="roster-item"><span>{p.name}</span><button className="btn-delete" onClick={() => removeParticipant(p.id)}>삭제</button></div>))}</div>
            </div>
          ) : (
            <div className="payment-log-list">
              {paymentLog.length > 0 ? paymentLog.map((entry) => (
                <div key={entry.id} className="payment-log-item">
                  <span>{entry.name}</span>
                  <span className="payment-log-time">{formatLogTime(entry.paidAt)}</span>
                </div>
              )) : <p className="empty-state">아직 결제 기록이 없습니다.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;