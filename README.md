# Solar RAG 챗봇

Solar LLM과 Pinecone을 사용한 현대적인 React 기반 RAG(검색 증강 생성) 챗봇, Netlify에 배포

## 주요 기능

- 📄 PDF 문서 업로드 및 처리
- 🤖 Solar LLM 통합 채팅 완성
- 🔍 Pinecone 벡터 데이터베이스로 의미적 검색
- ⚡ Netlify Functions를 이용한 서버리스 아키텍처
- 🎨 Tailwind CSS와 shadcn/ui로 구현한 현대적 UI
- 📱 반응형 디자인

## 기술 스택

### 프론트엔드
- **Next.js 15** App Router 사용
- **TypeScript** 타입 안전성
- **Tailwind CSS** 스타일링
- **shadcn/ui** UI 컴포넌트
- **Lucide React** 아이콘

### 백엔드
- **Netlify Functions** (서버리스)
- **Solar LLM** (Upstage) 임베딩 및 채팅
- **Pinecone** 벡터 저장소
- **PDF-Parse** 문서 처리

## 설치 및 설정

### 1. 프로젝트 클론 및 설치

```bash
git clone <repository-url>
cd solar-rag-chatbot
npm install
```

### 2. 환경 변수 설정

`.env.example`를 `.env.local`로 복사하고 API 키를 입력하세요:

```bash
cp .env.example .env.local
```

필수 환경 변수:
- `UPSTAGE_API_KEY`: Upstage에서 발급받은 Solar LLM API 키
- `PINECONE_API_KEY`: Pinecone API 키
- `PINECONE_INDEX`: Pinecone 인덱스 이름

### 3. Pinecone 설정

1. [pinecone.io](https://pinecone.io)에서 계정 생성
2. 새 인덱스 생성:
   - **차원(Dimensions)**: 1024 (Solar 임베딩용)
   - **메트릭(Metric)**: cosine
   - **클라우드(Cloud)**: AWS (권장)
   - **지역(Region)**: us-east-1 (권장)

### 4. Solar LLM 설정

1. [Upstage Console](https://console.upstage.ai)에서 API 키 발급
2. 사용 모델:
   - `solar-1-mini-embedding`: 문서 임베딩용
   - `solar-1-mini-chat`: 채팅 완성용

### 5. 로컬 개발 환경

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 개발 서버 시작
netlify dev
```

실행되는 서비스:
- Next.js 앱: `http://localhost:3000`
- Netlify Functions: `http://localhost:8888/.netlify/functions/`

### 6. Netlify 배포

1. **Git 연결**: 코드를 GitHub/GitLab에 푸시
2. **Netlify 가져오기**: 
   - [Netlify](https://netlify.com)로 이동
   - "New site from Git" 클릭
   - 저장소 선택
3. **빌드 설정 구성**:
   - 빌드 명령: `npm run build`
   - 게시 디렉토리: `out`
   - Functions 디렉토리: `netlify/functions`
4. **환경 변수 설정**:
   - Site Settings > Environment Variables로 이동
   - `.env.local`의 모든 환경 변수 추가

## 사용법

### 1. 문서 업로드
- 사이드바의 "Files" 탭 클릭
- PDF 파일을 드래그 & 드롭하거나 클릭하여 선택
- 처리 완료까지 대기

### 2. 문서와 채팅
- 채팅 인터페이스에서 질문 입력
- 시스템이 관련 문서 청크 검색
- 문서 기반 AI 답변 생성

### 3. 사용량 모니터링
- "Settings" 탭에서 토큰 사용량 및 비용 확인
- 청크 크기, top-k 결과 등 RAG 매개변수 조정

## 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │───▶│ Netlify Functions│───▶│   Solar LLM     │
│                 │    │                 │    │   (Upstage)     │
│  - PDF 업로드   │    │  - chat.js      │    │                 │
│  - 채팅 UI      │    │  - upload.js    │    └─────────────────┘
│  - 파일 관리    │    │                 │    
└─────────────────┘    │  - PDF 처리     │    ┌─────────────────┐
                       │  - 임베딩       │───▶│   Pinecone      │
                       │  - 벡터 DB      │    │  Vector Store   │
                       │  - RAG 로직     │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## 데이터 플로우

### 문서 업로드 플로우
1. 사용자 PDF 업로드 → 프론트엔드
2. PDF를 `/api/upload`로 전송 → Netlify Function
3. PDF에서 텍스트 추출 → pdf-parse
4. 텍스트를 청크로 분할 → 커스텀 청킹 로직
5. 임베딩 생성 → Solar LLM API
6. 벡터 저장 → Pinecone
7. 성공 응답 → 프론트엔드

### 채팅 플로우
1. 사용자 질문 → 프론트엔드
2. 질문을 `/api/chat`으로 전송 → Netlify Function
3. 쿼리 임베딩 생성 → Solar LLM API
4. 유사 청크 검색 → Pinecone
5. 검색된 청크로 컨텍스트 구축
6. 응답 생성 → Solar LLM API
7. 답변 + 출처 반환 → 프론트엔드

## 비용 최적화

- **청크 크기**: 1000자 (설정 가능)
- **오버랩**: 컨텍스트 보존을 위한 200자
- **Top-K**: 가장 관련성 높은 5개 청크
- **임베딩 캐싱**: 동일 문서 재처리 방지
- **배치 처리**: 효율적인 API 사용

## 커스터마이징

### RAG 매개변수
서버리스 함수를 수정하여 조정:
- 청크 크기 및 오버랩
- 검색 문서 수 (top-k)
- 유사도 임계값
- 응답 생성 온도

### UI 커스터마이징
- `src/components/`의 컴포넌트 수정
- `src/app/globals.css`의 스타일 업데이트
- 사이드바 탭에 새 기능 추가

## 문제 해결

### 일반적인 문제

1. **빌드 실패**
   - 모든 환경 변수가 설정되었는지 확인
   - Node.js 버전이 18+ 인지 확인

2. **Function 오류**
   - Netlify function 로그 확인
   - API 키가 올바른지 검증
   - Pinecone 인덱스 존재 및 접근 가능 여부 확인

3. **PDF 업로드 문제**
   - 파일 크기 확인 (10MB 제한)
   - 유효한 PDF 파일인지 확인
   - 텍스트 추출이 작동하는지 검증

### 개발 팁

- 로컬 함수 테스트에 `netlify dev` 사용
- 프론트엔드 오류는 브라우저 콘솔 확인
- 백엔드 문제는 Netlify function 로그 모니터링
- 작은 PDF 파일로 먼저 테스트

## 주요 파일 구조

```
solar-rag-chatbot/
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind + shadcn/ui 스타일
│   │   ├── layout.tsx
│   │   └── page.tsx             # 메인 채팅 인터페이스
│   ├── components/
│   │   ├── ui/                  # shadcn/ui 컴포넌트
│   │   ├── ChatInterface.tsx    # 채팅 UI
│   │   ├── FileUploader.tsx     # PDF 업로드
│   │   └── Sidebar.tsx          # 사이드바
│   └── lib/
│       └── utils.ts             # 유틸리티 함수
├── netlify/
│   └── functions/
│       ├── chat.js              # 채팅 API
│       ├── upload.js            # PDF 처리
│       └── package.json         # 함수 의존성
├── netlify.toml                 # Netlify 설정
├── next.config.ts               # Next.js 정적 내보내기 설정
└── .env.example                 # 환경 변수 템플릿
```

## 기능 설명

### 1. PDF 업로드 및 처리
- 드래그 & 드롭 인터페이스
- 여러 파일 동시 업로드
- 실시간 처리 상태 표시
- 텍스트 추출 및 청킹

### 2. 의미적 검색
- Solar 임베딩을 이용한 벡터 검색
- Pinecone 코사인 유사도 검색
- 상위 5개 관련 문서 청크 검색
- 유사도 점수 표시

### 3. 채팅 인터페이스
- 실시간 메시지 표시
- 로딩 애니메이션
- 출처 문서 표시
- 메시지 히스토리 관리

### 4. 사이드바 기능
- 파일 관리 탭
- 모델 설정 탭
- 사용량 및 비용 모니터링
- RAG 매개변수 설정

## 성능 최적화

- **청킹 전략**: 의미적 경계에서 텍스트 분할
- **배치 임베딩**: API 요청 최적화
- **벡터 인덱싱**: Pinecone 고성능 검색
- **응답 캐싱**: 중복 요청 방지
- **점진적 로딩**: 대용량 문서 처리

## 보안 고려사항

- 환경 변수로 API 키 보호
- 파일 타입 검증 (PDF만 허용)
- 파일 크기 제한 (10MB)
- CORS 설정으로 도메인 제한
- 서버리스 함수 타임아웃 설정

## 향후 개선 사항

- [ ] 다국어 지원
- [ ] 이미지 OCR 처리
- [ ] 문서 요약 기능
- [ ] 사용자 인증
- [ ] 문서 카테고리 분류
- [ ] 채팅 내역 저장
- [ ] 음성 입력/출력

## 기여하기

1. 저장소 포크
2. 기능 브랜치 생성
3. 변경사항 작성
4. 철저한 테스트
5. Pull Request 제출

## 라이선스

MIT License - 자세한 내용은 LICENSE 파일 참조

## 지원 및 문의

- 이슈 리포트: GitHub Issues
- 문서: README-SETUP.md
- 설계 문서: React-Solar-RAG-Chatbot-설계도.md

---

**개발자 노트**: 이 프로젝트는 설계도의 모든 요구사항을 구현하며, Netlify 배포에 최적화되어 있습니다. 서버리스 아키텍처로 확장성과 비용 효율성을 보장합니다.
