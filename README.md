# ☕ 커피 정산

팀원 이름을 눌러 결제 여부를 체크하고, 명단과 결제 로그를 관리하는 앱입니다.

## 🎯 기능

- **팀원 명단 관리**: 멤버 추가/삭제
- **결제 체크**: 이름 버튼을 누르면 결제 완료 처리, 다시 누르면 취소
- **결제 완료 현황**: 참가 인원 대비 결제 완료 인원을 스탯 바에서 확인
- **결제 로그**: 누가 언제 결제했는지 시간과 함께 기록 (취소 시 로그도 함께 삭제)
- **실시간 동기화**: 3초 주기로 폴링하여 여러 기기에서 같은 상태 유지

## 🛠 기술 스택

### Frontend

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빠른 빌드 도구
- **CSS3** - 반응형 디자인

### Backend

- **Node.js / Express** - 웹 서버
- **MongoDB (Mongoose)** - 데이터 저장소
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
│   ├── .env               # 환경 변수 (MONGODB_URI 등)
│   └── package.json       # 패키지 설정
│
└── README.md
```

## 🚀 빠른 시작

### 1. 백엔드 실행

```bash
cd server
npm start
```

`server/.env`에 `MONGODB_URI`가 설정되어 있어야 합니다. 서버는 `http://localhost:5000`에서 실행됩니다.

### 2. 프론트엔드 실행

새 터미널을 열고:

```bash
cd client
npm run dev
```

프론트엔드가 `http://localhost:5173`에서 실행됩니다.

### 3. 브라우저에서 열기

`http://localhost:5173`을 열어 애플리케이션을 사용하세요.

## 📊 API 엔드포인트

### 상태 동기화

- `GET /api/state` - 현재 순서/결제 완료 상태 조회
- `POST /api/state` - 상태 저장

### 참가자 관리

- `POST /api/participants` - 참가자 추가
- `GET /api/participants` - 참가자 목록 조회
- `DELETE /api/participants/:id` - 참가자 삭제

### 결제 로그

- `GET /api/payment-log` - 결제 로그 조회 (최근 100건)
- `POST /api/payment-log` - 결제 로그 기록
- `DELETE /api/payment-log/:id` - 결제 로그 취소

### 기타

- `GET /health` - 서버 상태 확인

## 🔧 환경 변수

`server/.env` 파일:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
CORS_ORIGIN=https://your-frontend-domain.com   # 선택, 미설정 시 전체 허용
```

## 📝 개발 팁

- `server.js`를 수정한 후에는 서버를 다시 시작하세요.
- `client/src/App.tsx` 또는 `App.css`를 수정하면 Vite의 HMR로 자동 반영됩니다.

## 📦 배포

### Backend

```bash
cd server
npm start
```

### Frontend

```bash
cd client
npm run build
# dist 폴더 배포
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
