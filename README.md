# ☕ 커피값 게임

누가 커피를 사갈까요? 재미있는 게임으로 결정해보세요!

## 🎯 기능

- **참가자 관리**: 참가자 추가/삭제
- **게임 플레이**: 무작위로 커피를 사갈 사람 선택
- **중복 제거**: 이미 돈을 낸 사람은 자동으로 제외
- **통계**: 참가자별 당첨 횟수 및 지불 횟수 조회
- **히스토리**: 최근 게임 결과 기록

## 🛠 기술 스택

### Frontend

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빠른 빌드 도구
- **CSS3** - 반응형 디자인

### Backend

- **Node.js** - JavaScript 런타임
- **Express** - 웹 프레임워크
- **SQLite** - 경량 데이터베이스
- **CORS** - 크로스 오리진 요청 처리

## 📁 프로젝트 구조

```
coffee-roulette/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.tsx        # 메인 애플리케이션
│   │   ├── App.css        # 스타일
│   │   └── main.tsx       # 진입점
│   ├── vite.config.ts     # Vite 설정
│   ├── tsconfig.json      # TypeScript 설정
│   └── package.json       # 패키지 설정
│
├── server/                 # Node.js Express Backend
│   ├── server.js          # 메인 서버 파일
│   ├── .env               # 환경 변수
│   ├── coffee.db          # SQLite 데이터베이스
│   └── package.json       # 패키지 설정
│
└── README.md              # 이 파일
```

## 🚀 빠른 시작

### 1. 백엔드 실행

```bash
cd server
npm start
```

백엔드 서버가 `http://localhost:5000`에서 실행됩니다.

### 2. 프론트엔드 실행

새 터미널을 열고:

```bash
cd client
npm run dev
```

프론트엔드가 `http://localhost:5173`에서 실행됩니다.

### 3. 브라우저에서 열기

브라우저에서 `http://localhost:5173`을 열어 애플리케이션을 사용하세요.

## 📊 API 엔드포인트

### 참가자 관리

- `POST /api/participants` - 참가자 추가
- `GET /api/participants` - 모든 참가자 조회
- `DELETE /api/participants/:id` - 참가자 삭제

### 게임

- `POST /api/game/play` - 게임 실행 (무작위 선택)
- `GET /api/game/results` - 게임 결과 조회

### 통계

- `GET /api/statistics` - 참가자별 통계 조회

### 지불 관리

- `POST /api/payments` - 지불 기록 추가 (게임 제외)
- `DELETE /api/payments/:participant_id` - 지불 기록 삭제 (복구)

### 기타

- `POST /api/reset` - 전체 데이터 초기화
- `GET /health` - 서버 상태 확인

## 💾 데이터베이스 스키마

### participants (참가자)

```sql
id: INTEGER PRIMARY KEY
name: TEXT NOT NULL UNIQUE
created_at: DATETIME
```

### game_results (게임 결과)

```sql
id: INTEGER PRIMARY KEY
winner_id: INTEGER (외래키: participants.id)
game_date: DATETIME
```

### payments (지불 기록)

```sql
id: INTEGER PRIMARY KEY
participant_id: INTEGER (외래키: participants.id)
paid_date: DATETIME
```

## 🎮 사용 방법

### 1. 참가자 추가

- "참가자 추가" 탭에서 이름을 입력하고 추가 버튼 클릭
- 현재 참가자 목록을 확인할 수 있습니다

### 2. 게임 시작

- "게임 시작" 탭에서 "누가 커피를 사갈까요?" 버튼 클릭
- 무작위로 선택된 참가자가 표시됩니다
- 최근 게임 결과를 확인할 수 있습니다

### 3. 지불 처리

- "참가자 추가" 탭에서 "지불" 버튼 클릭
- 지불을 한 참가자는 다음 게임에서 제외됩니다
- "취소" 버튼으로 지불 기록을 삭제할 수 있습니다

### 4. 통계 확인

- "통계" 탭에서 참가자별 당첨 횟수와 지불 횟수를 확인할 수 있습니다

## 🔧 환경 변수

`server/.env` 파일:

```env
PORT=5000
NODE_ENV=development
```

## 📝 개발 팁

### 백엔드 수정 시

- `server.js`를 수정한 후 서버를 다시 시작하세요
- 데이터베이스 스키마를 변경하려면 `coffee.db`를 삭제하고 다시 시작하세요

### 프론트엔드 수정 시

- `client/src/App.tsx` 또는 `client/src/App.css`를 수정하면 자동으로 리로드됩니다 (Hot Module Replacement)

## 🐛 문제 해결

### CORS 에러

- 백엔드 `server.js`에서 CORS가 활성화되어 있는지 확인하세요
- Vite 프록시 설정을 확인하세요 (`client/vite.config.ts`)

### 데이터베이스 문제

- `server/coffee.db` 파일을 삭제하고 서버를 재시작하세요
- 새 데이터베이스가 자동으로 생성됩니다

### 포트 충돌

- 이미 포트가 사용 중이면 `server/.env`의 PORT를 변경하세요
- Vite 프록시 설정에서도 포트를 일치시키세요

## 🎨 커스터마이징

### 색상 변경

- `client/src/App.css`의 `:root` 색상 변수를 수정하세요

### 기능 추가

- `server/server.js`에 새로운 API 엔드포인트 추가
- `client/src/App.tsx`에 해당하는 UI 구성요소 추가

## 📦 배포

### Backend (Heroku, Railway 등)

```bash
cd server
git push heroku main
```

### Frontend (Vercel, Netlify 등)

```bash
cd client
npm run build
# build 폴더 배포
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 🤝 기여

버그 리포트나 기능 제안은 환영합니다!

---

즐거운 커피값 게임 되세요! ☕🎉
