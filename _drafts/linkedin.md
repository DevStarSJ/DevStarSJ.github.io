# LinkedIn 프로필 반영용 (https://www.linkedin.com/in/sjyun/)

블로그 `/resume/` 공개본 기준으로 작성. private docx의 상세 수치·벤더명은 포함하지 않음.
`_drafts/`는 Jekyll이 빌드하지 않으므로 사이트에는 게시되지 않음 (public repo에서는 파일 자체는 보임).

---

## 헤드라인 (220자 제한)

```
SRE · DevOps · LLM/AI Agent Engineer @ DeepSearch | Terraform · EKS · LangGraph | 금융 데이터 & AIGC 파이프라인
```

## 소개 (About)

```
개인보다 팀 성과를 중요하게 생각하며, 동료들이 편하게 일할 수 있게 돕는 Agile Facilitator가 되고자 노력합니다. 팀에 도움이 되는 일이라면 Gray Zone이라도 마다하지 않는 해결사(Skunk Worker) 역할을 합니다.

20년 넘게 임베디드 펌웨어, 국방 시뮬레이터(CUDA), 머신러닝 시세 모델, 서버리스 MSA, SRE, LLM 파이프라인까지 필요한 기술을 빠르게 익혀 적용해온 제너럴리스트입니다. 최근에는 금융 도메인에서 LLM 기반 AIGC 파이프라인과 AI Agent(LangGraph/LangChain)를 설계·구축하고, 전사 인프라·보안 기반(시크릿 관리, 배포 파이프라인, 관측성)을 담당하고 있습니다.

주요 관심사: SRE/DevOps 자동화, AI Agent 아키텍처, LLM Observability, 조직의 Agile 문화

상세 경력: https://devstarsj.github.io/resume/
```

## DeepSearch 경력 — 직책 4개로 분리 입력

LinkedIn은 한 회사 아래 여러 직책(position)을 등록할 수 있고, 기간이 겹쳐도 된다.

### ① SRE & Tech Lead — 2023.08 ~ 현재

```
• AWS Tokyo 리전에서 EC2/자체 k8s로 직접 운영하던 인프라(Elasticsearch, Redis, Aurora 단일 인스턴스)를 Seoul 리전 managed service(OpenSearch, ElastiCache, Aurora Cluster, EKS)로 무중단·무손실 이전. 주 단위로 반복되던 장애를 구조적으로 해소
• OpenSearch 전환 시 형태소분석기·사용자정의 사전 비호환 문제를 새로 구현하여 한국어 검색 품질 유지
• GHCR + 별도 manifest repo 수동 배포 체계를 GitHub Actions self-hosted runner + ECR + Helm release 기반 단일 저장소 자동화 파이프라인으로 재구축 (레거시 포함 전 서비스 적용)
• 레거시 벡터 검색엔진의 대외 API 의존성 제거: 데이터를 MySQL에 동일 적재하는 파이프라인과 신규 API를 구축하고, 고객사 인터페이스 변경 없이 공급 경로 교체
• LLM 마이그레이션(OpenAI → Azure OpenAI → AWS Bedrock) 및 멀티 리전·모델 fallback 구현
• 2주 단위 1on1, Engineering Day 운영. AI 코딩 도구 전사 도입 주도
```

### ② Tech Product Team Lead — 2024.01 ~ 2025.06

```
• 목적조직 개편과 함께 회사 매출의 근간인 금융 데이터 제품·파이프라인 조직의 Lead 수행
• ETF 스타디움(invest.zum.com) 기획부터 배포·운영까지 전 과정 참여, 서비스 런칭
• 팀에서 생산하는 모든 AIGC(AI 생성 컨텐츠)를 단독 설계·구현·운영: 해외 뉴스 번역·요약, 기업/시장 분석, ESG 분석, 주가·ETF 변동 원인 브리핑, 거시경제 브리핑, 증권사 리포트 정규화 (LangChain, Python)
• 2025.01 팀 분리 후 데이터 수집·정제 및 대외 API 공급 팀 Lead 담당. 이후 분리 구조의 비효율을 판단해 재통합을 직접 건의하고 Lead를 제품 담당자에게 이양
```

### ③ AI Agent Engineer, Financial AI Team — 2025.06 ~ 2026.05

```
• 금융 특화 AI Agent 설계·구현 (LangGraph, LangChain)
• Workflow형(DAG 기반 결정적 파이프라인)과 Agentic Loop형(tool 선택·조합) Agent를 목적에 따라 구분 설계
• 기존 API 기능을 자연어 질의·응답으로 제공하는 아키텍처 설계
```

### ④ Cloud Infra Platform Engineer — 2026.05 ~ 현재

```
• 전사 인프라·보안 기반 담당 (1인 팀)
• GitHub 평문 시크릿 전수 제거 → AWS Secrets Manager + External Secrets Operator 체계 구축
• 배포 파이프라인 고도화: runner AWS 계정별 분리, 공통 workflow template·Helm chart 표준화, PAT → GitHub App 토큰 전환
• APM을 dd-trace에서 OpenTelemetry로 전환하여 벤더 종속 제거, 관련 비용 완전 제거
• LLM 호출량·비용·지연·에러율 대시보드 구축, AI 코드리뷰 자동화 도입 및 분산 구조 전환
• EKS Graviton(arm64) 전환, cost allocation tag 표준 수립
```

## 기타 경력

Goodoc, 당근마켓, Kakao Enterprise 등 나머지 회사는 블로그 Resume(https://devstarsj.github.io/resume/)와 날짜·직함 일치 여부만 확인. 각 3~4줄 요약이면 충분.
