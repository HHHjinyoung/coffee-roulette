# Coffee Roulette 프로젝트

## 프로젝트 개요
- **타입**: 풀스택 웹 애플리케이션
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + SQLite
- **기능**: 커피값 게임 (참가자 관리, 게임 결과 저장, 중복 제외)

## 프로젝트 구조
```
coffee-roulette/
├── client/                 # React Frontend
│   ├── src/
│   ├── vite.config.ts
│   └── package.json
├── server/                 # Node.js Backend
│   ├── src/
│   ├── package.json
│   └── database.sqlite
└── README.md
```

## 개발 가이드
- Frontend: `client/` 폴더에서 `npm run dev`로 실행 (http://localhost:5173)
- Backend: `server/` 폴더에서 `npm start`로 실행 (http://localhost:5000)

## 체크리스트

- [x] 프로젝트 요구사항 확인
- [ ] Frontend 프로젝트 스캐폴딩 (React + Vite)
- [ ] Backend 프로젝트 스캐폴딩 (Express)
- [ ] 데이터베이스 구조 생성 (SQLite)
- [ ] API 엔드포인트 구현
- [ ] Frontend 컴포넌트 작성
- [ ] 의존성 설치
- [ ] 프로젝트 테스트
- [ ] 문서화 완성
