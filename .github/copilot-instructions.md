# Coffee Roulette 프로젝트

## 프로젝트 개요
- **타입**: 풀스택 웹 애플리케이션
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **기능**: 팀 커피 정산 - 팀원 명단 관리, 이름 클릭으로 결제 완료 체크, 결제 로그 기록/취소, 여러 기기 실시간 동기화

## 프로젝트 구조
```
coffee-roulette/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.tsx
│   │   └── App.css
│   ├── vite.config.ts
│   └── package.json
├── server/                 # Node.js Backend
│   ├── server.js
│   ├── .env               # MONGODB_URI, CORS_ORIGIN 등
│   └── package.json
└── README.md
```

## 개발 가이드
- Frontend: `client/` 폴더에서 `npm run dev`로 실행 (http://localhost:5173)
- Backend: `server/` 폴더에서 `npm start`로 실행 (http://localhost:5000), `MONGODB_URI` 필요
