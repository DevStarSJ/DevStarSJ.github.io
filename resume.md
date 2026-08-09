---
layout: page
title: Resume
menu: true
order: 11
description: >
  SRE / DevOps / Backend / LLM Engineer 경력 정리
---

개인보다 팀 성과를 중요하게 생각하며, 동료들이 편하게 일할 수 있게 돕는 Agile Facilitator가 되고자 노력합니다.
팀에 도움이 되는 일이라면 Gray Zone이라도 마다하지 않는 해결사(Skunk Worker) 역할을 합니다.
생산성이 높고 이해하기 쉬운 코드를 지향하며, 누군가의 블로커가 되지 않도록 빠르게 업무를 진행합니다.

일하는 방식과 가치관에 대해서는 [About](/about/) 페이지를 참고해주세요.

## Skills

- **Soft Skills**: Facilitation, Scrum Master, Agile Coaching, 1on1 & 피드백
- **Programming Language**: Python, TypeScript, Ruby, JavaScript, C#, C++, Visual Basic, C (왼쪽일수록 최근에 사용한 기술입니다)
- **LLM / AI**: LangChain, LangGraph, AWS Bedrock, Azure OpenAI, OpenAI, AI Agent Architecture(Workflow/Agentic Loop), Prompt Engineering, LLM Observability
- **Backend**: FastAPI, Ruby on Rails, Nest.JS, Serverless-Express, ASP.NET, GraphQL(Apollo Federation), Prisma, TypeORM, Celery
- **Frontend**: Next.JS, React, React-Native, MobX State Tree, Recoil
- **Data Engineering**: Pandas, Spark, XGBoost, CatBoost, LightGBM, Scikit-Learn, Keras
- **Infrastructure**: AWS, Terraform, Kubernetes(EKS), Helm, GitHub Actions(self-hosted runner), Jenkins, OpenSearch/Elasticsearch, ElastiCache/Redis, Aurora Cluster/MySQL, ECR
- **Security & Observability**: AWS Secrets Manager, External Secrets Operator(ESO), GitHub App 기반 인증, OpenTelemetry, Grafana, Datadog
- **Parallelism**: CUDA, SIMD, OpenMP

## Experience

### DeepSearch

*2023.08 ~ 현재 · Cloud Infra Platform, SRE, Tech Lead, LLM/AI Agent Engineer*

**SRE** (2023.08 ~ 현재)

주요 기술: Terraform(IaC), AWS, Kubernetes(EKS), Helm, GitHub Actions

#### 프로젝트: Tokyo 리전 자체 운영 인프라 → Seoul 리전 Managed Service 전환 (2023.08 ~ 2023.12)

입사 후 첫 과제로, 회사 서비스 대부분이 올라가 있던 AWS Tokyo 리전 인프라를 Seoul 리전의 managed service로 이전하는 작업을 설계하고 수행했습니다.

- **문제**: Elasticsearch와 Redis를 EC2와 Kubernetes 위에서 직접 운영하고 있었고, 리소스 관련 장애가 주 단위로 반복 발생했습니다. 근본 대응 수단이 사실상 재기동뿐이라 같은 장애가 계속 재현되는 구조였습니다. 데이터베이스도 Aurora 단일 인스턴스로 구성되어 있어 확장 여력이 부족했습니다.
- **해결**: 각 컴포넌트를 AWS managed service로 전환하면서 리전을 함께 이전했습니다. — Elasticsearch → **OpenSearch**, Redis → **ElastiCache**, Aurora 단일 인스턴스 → **Aurora Cluster**, 자체 운영 Kubernetes → **EKS**
- **제약 조건**: B2B 고객사가 사용 중인 서비스였기 때문에 데이터 누락과 서비스 중단이 모두 허용되지 않았습니다. 데이터 정합성을 검증하며 **무중단·무손실로 전환**을 완료했습니다.
- **기술적 난점**: OpenSearch가 기존에 사용하던 형태소분석기 및 사용자정의 사전과 호환되지 않아, 한국어 검색 품질을 유지하기 위해 해당 부분을 새로 구현했습니다.
- **결과**: 반복되던 검색·캐시 장애를 managed service의 운영·복구 체계로 흡수했고, 데이터베이스는 클러스터 구성으로 전환해 읽기 확장이 가능한 구조를 확보했습니다. 리전 이전으로 국내 사용자 기준 네트워크 경로도 단축되었습니다.

#### 프로젝트: 배포 파이프라인 통합 및 전면 자동화 (2023.08 ~ 2023.12)

리전 이전과 병행하여, 흩어져 있던 배포 체계를 단일 저장소 기반의 자동화 파이프라인으로 재구축했습니다.

- **문제**: 컨테이너 이미지는 GitHub Container Registry(GHCR)에 두고, Kubernetes manifest는 **별도 저장소에 모아 수동으로 배포**하는 구조였습니다. 코드와 배포 정의가 분리되어 있어 변경 이력 추적이 어렵고, 배포마다 사람의 개입이 필요했습니다.
- **해결**: GitHub Actions **self-hosted runner**를 구축하고 `kubectl`, `helm` 등 배포 도구를 통합한 뒤, 이미지 저장소를 **AWS ECR**로, 배포 방식을 **Helm release** 기반으로 전환했습니다. 이를 통해 애플리케이션 코드와 배포 정의를 단일 저장소에서 관리하고, 빌드부터 배포까지 전 과정을 자동화했습니다.
- **적용 범위**: 신규 서비스뿐 아니라 그동안 수동 배포에 의존하던 레거시 서비스까지 **모든 서비스**를 동일한 파이프라인으로 편입시켰습니다.
- **결과**: 배포가 코드 변경에 따라 자동으로 이루어지는 구조가 되면서, 배포 자체가 특정 담당자에게 의존하지 않게 되었습니다.

#### 상시 업무

- Terraform 기반 IaC로 인프라를 코드로 관리하고 변경 이력을 추적합니다.
- EKS 클러스터 및 AWS 리소스 운영, 모니터링, 장애 대응을 담당합니다.

**Tech Lead** (2023.11 ~ 현재)

수습 기간 종료 시점에 Tech Lead 역할을 맡게 되었습니다.

- 문서가 남아있지 않은 레거시 서비스의 유지보수와 고객사 대응을 담당했습니다. 유지보수가 어려운 시스템에 의존하던 코드를 관리 가능한 환경으로 데이터 마이그레이션하고 신규 API를 만든 뒤, 기존 고객 요청은 하위호환 Gateway를 통해 신규 API가 응답하도록 전환했습니다. ([Strangler Fig Pattern](https://martinfowler.com/bliki/StranglerFigApplication.html))
- 구성원들과 2주 단위 1on1을 진행하며 성장을 위한 피드백을 제공했습니다.
- Engineering Day를 기획하여 스쿼드로 나뉜 엔지니어들이 주기적으로 모여 기술 활동을 하는 자리를 만들었습니다.
- LLM 마이그레이션을 여러 차례 수행했습니다(OpenAI → Azure OpenAI, 기존 파이프라인 → AWS Bedrock). Public Cloud LLM은 rate limit이 있으므로 쓰로틀링 오류 및 장애 상황에 대비해 여러 리전·모델에 대한 fallback 요청을 구현했습니다.
- Vibe Coding을 전사적으로 도입하여 생산성을 높이는 활동을 주관했습니다.

**Tech Product Team Lead** (2024.01 ~ 2025.06) — Python, FastAPI, Prisma, Celery

2024년 1월 회사가 기능조직에서 목적조직으로 개편되었습니다. 신규 파일럿 프로젝트 두 개(기업 M&A 플랫폼, 미디어 트래픽 플랫폼)가 분리되고, 기존 본업에 해당하는 금융 데이터 영역이 Tech Product 팀으로 편성되면서 해당 팀의 Lead를 맡았습니다. (이후 조직 변화에 따라 팀 명칭은 몇 차례 변경되었습니다.)

- 회사 매출의 근간이 되는 금융 데이터 제품과 데이터 파이프라인 전반을 책임졌습니다.
- [ETF 스타디움](https://invest.zum.com)의 기획부터 배포·운영까지 전 과정에 참여하여 서비스를 런칭했습니다.
- **2025년 1월 팀 분리**: 조직이 제품·세일즈 팀과 데이터 팀으로 나뉘면서, **데이터 수집·정제 및 대외 API 제공**을 담당하는 후자의 Lead를 맡았습니다. 자사 제품뿐 아니라 외부 고객사에 데이터를 API로 공급하는 영역 전반을 책임졌습니다.
- **2025년 6월 팀 재통합 건의**: 두 팀으로 나눈 구조가 실보다 득이 적다고 판단하여 재통합을 건의했고, 통합된 Financial AI 팀의 Lead 자리는 제품 담당자에게 넘겼습니다. SRE와 Tech Lead 역할을 병행하는 상황에서 세일즈·제품 영역까지 함께 책임지는 것이 적절하지 않다고 판단했습니다.

**LLM 기반 AIGC 파이프라인 단독 구축 · 운영** (2024.01 ~ 2025.10) — LangChain, LangGraph, Python

팀에서 생산하는 **모든 AIGC(AI 생성 컨텐츠)를 단독으로 설계·구현·운영**했으며, 이를 API 형태로 제공하는 전 과정을 담당했습니다.

- 사내에 축적된 이종 데이터를 결합하고, 생성 목적에 필요한 정보만 선별·추출한 뒤, 목적에 맞는 system prompt와 user prompt를 설계하는 파이프라인을 구축했습니다.
- 생성한 컨텐츠: 해외 뉴스 번역·요약, 토픽 인사이트, 기업/시장 분석자료, ESG 분석, 주가·ETF 가격 변동 원인 브리핑, 거시경제 브리핑, 증권사 리포트 요약 및 회사별 전망 정규화 데이터 추출, risk monitoring.
- **인수인계**: 특정 개인에게 도메인 컨텍스트가 집중되는 것보다 여러 구성원이 함께 이해하는 편이 조직에 유리하다고 판단하여, 소속 변경 시점에 해당 업무 전반을 이관했습니다.

**Financial AI Team — AI Agent Engineer** (2025.06 ~ 2026.05) — LangGraph, LangChain

금융 도메인에 특화된 AI Agent를 설계하고 구현했습니다.

- **Workflow형 Agent**: LangGraph를 활용해 처리 흐름을 DAG로 구성하고, 특정 작업에 특화된 결정적(deterministic) 파이프라인으로 동작하도록 설계했습니다.
- **Agentic Loop형 Agent**: 다수의 tool을 부여하고, 사용자 질의의 의도를 스스로 판단해 적절한 tool을 선택·조합하여 응답하도록 구현했습니다.
- 기존에 API로만 제공하던 기능들을 자연어로 질의·응답할 수 있도록 하는 아키텍처를 설계했습니다.

**프로젝트: 레거시 벡터 검색엔진 의존성 제거** (2025.11 ~ 2025.12) — 사전 운영은 2023.08부터

사내에는 기업정보와 국내 거래소 주가 데이터를 자체 수집·보관하며 벡터 검색으로 제공하는 자체 개발 검색엔진이 있었습니다. 이 시스템에 대한 대외 서비스의 의존성을 제거하는 프로젝트를 단독으로 수행했습니다.

- **배경**: 해당 엔진은 설계 당시 현재 수준의 부하를 전제하지 않아, 트래픽 증가에 따라 장애가 반복되는 상태였습니다. C++로 구현되었으나 빌드 환경이 유실되어 재빌드·재배포가 불가능했고, 사실상 손댈 수 없는 단일 장애점으로 남아 있었습니다.
- **운영 및 지식 문서화** (2023.08 ~): 입사 시점부터 이 시스템의 운영을 단독으로 담당하며 데이터 백업 전략과 장애 시 복구 절차를 정립했습니다. 복구 레시피를 사내 문서로 상세히 남긴 결과, **담당자가 부재한 상황에서 장애가 발생했을 때 다른 구성원이 해당 문서만으로 복구를 완료**한 사례가 있었습니다.
- **문제 정의**: 이 엔진이 멈추면 고객사에 데이터를 공급하지 못하는 구조였기 때문에, 대외 API 경로에서 해당 의존성을 완전히 제거하기로 결정했습니다.
- **해결**: 기업정보 데이터를 기존 엔진뿐 아니라 **MySQL에도 동일한 형태로 적재하는 별도 파이프라인**을 구축했습니다. 이를 기반으로 신규 API를 구현한 뒤, 기존 검색엔진을 직접 조회하던 v1 API가 신규 API를 통해 응답하도록 전환했습니다. 고객사 입장에서는 인터페이스 변경 없이 데이터 공급 경로만 교체되었습니다.
- **결과**: 고객사 대상 데이터 제공 경로에서 단일 장애점 의존성을 제거하여, 해당 엔진의 장애가 대외 서비스 중단으로 이어지지 않는 구조를 확보했습니다.

**Cloud Infra Platform** (2026.05 ~ 현재) — Terraform, EKS, AWS Secrets Manager, GitHub Actions, OpenTelemetry, Grafana

2026년 초 신임 CTO 부임 이후 보안과 인프라의 중요성이 재평가되면서 신설된 조직입니다. 난이도와 요구되는 책임 범위가 커서 외부 채용을 검토하던 자리였으나, 사내 시스템 전반에 대한 이해를 근거로 제가 맡게 되었습니다. **1인 팀으로 전사 인프라·보안 기반 작업을 담당**하고 있습니다.

**시크릿 관리 체계 전환**

- GitHub 저장소에 `.env`, `conf`, `toml` 등으로 **평문 저장되어 있던 credential과 API key를 전수 조사하여 AWS Secrets Manager로 이관**했습니다.
- EKS에서는 **External Secrets Operator(ESO)**와 연동하여 런타임에 시크릿을 주입하도록 구성했습니다.
- 로컬 개발 환경 역시 개인 access key로 Secrets Manager에 직접 연동하도록 만들어, **개발자 PC에 credential을 두지 않고도 실행 가능한 구조**를 확보했습니다.

**배포 파이프라인 고도화 및 권한 최소화**

- self-hosted runner를 **AWS 계정(개발/운영)별로 분리**하여 각 runner가 보유해야 하는 credential 범위를 최소화했습니다.
- CI/CD workflow를 **재사용 가능한 공통 template**(build → ECR push → helm upgrade)으로 표준화하고, 공용 Helm chart 라이브러리를 구축했습니다.
- runner 등록 및 배포 인증을 **개인 PAT 기반에서 GitHub App 토큰 기반으로 전환**하여 보안 수준을 높였습니다. 공용 GitHub 계정을 폐지하고 개인 계정 체계로 정리하는 작업도 함께 진행했습니다.

**관측성(Observability) 스택 전환**

- 로그 기반이 Datadog에서 Grafana로 이전된 데 이어, 남아 있던 **APM 계측(dd-trace)을 OpenTelemetry 기반으로 전환**하여 벤더 종속을 제거했습니다.
- 전 서비스 계측 전환을 완료하고 Datadog Agent와 구독을 정리하여 **해당 비용을 완전히 제거**했습니다.

**LLM 관측성 및 비용 가시화**

- 서비스 전반의 **LLM 호출 로그·토큰 사용량·비용·응답 지연·에러율을 내부에 적재하고 대시보드로 구성**했습니다.
- 애플리케이션 코드 수정을 최소화하기 위해 계측 자동 주입(auto-injection) 방식을 적용했습니다.

**인프라 비용 최적화 및 IaC 정비**

- EKS 워커 노드의 **Graviton(arm64) 전환**을 확대하고, 팀·서비스별 비용 추적이 가능하도록 **cost allocation tag 표준**을 수립했습니다.
- Terraform CLI 및 AWS provider를 최신 버전으로 업그레이드하고, 미사용 환경 정의 코드를 정리하여 IaC 저장소를 단일 기준으로 통합했습니다.

### 당근마켓

*2023.03 ~ 2023.06 · Backend*

- 중고거래실에서 Ruby on Rails 서버 개발

### Goodoc

*2021.11 ~ 2023.03 · SRE, Squad Scrum Master & Tech Lead, Backend Lead Architect*

**SRE** (2021.11 ~ 2023.03)

- IaC(Terraform + AWS), Kubernetes(EKS), CI/CD(Jenkins + AWS CodeBuild)
- 여러 AWS 계정과 리전에 흩어져 운영되던 레거시 시스템(4개 계정, 980여 개 Lambda function, 28종 RDS, 500여 대 EC2, DynamoDB, Elasticsearch, Redis, S3)을 신규 계정으로 통합·정리하는 과정을 설계하고 진행했습니다. 4시간의 downtime으로 장애 없이 마이그레이션을 완료했으며, **인프라 운영 비용을 약 80% 절감**했습니다.
  - Lambda function을 Flask 서버로 이식하여 EKS에서 가동
  - 여러 서버군을 하나의 Nest.JS 서버로 통합
- Data Engineering(Pandas + Python): 병원 정보 최신화 파이프라인
- Squad 조직에서 발생한 Gray Zone 업무들을 마무리했고, 개발자들이 반복적으로 처리하던 CS 작업을 시스템화했습니다.
- Release Manager로서 모든 Squad 제품의 통합 테스트와 배포 과정을 관리했습니다.
- On Call Engineer 제도를 도입하여 백엔드 개발자 모두가 장애 감지 및 대응에 익숙해지도록 했습니다.

**병원찾기 Squad — Scrum Master & Backend** (2022.01 ~ 2022.08) — Nest.JS + TypeORM + GraphQL

- 스쿼드에 2주 단위 Scrum Process가 정착하도록 교육과 각종 미팅을 설계·진행했습니다. (Daily Scrum, Technical Review, Sprint 회고, Sprint 기획미팅)
- 구성원들과 2주 단위 1on1을 진행하며 성장을 위한 피드백을 제공했습니다.
- 개인과 기술군에 맞춰 업무를 분배하되, 소외되는 사람이 없도록 필요할 때 업무를 재조정했습니다.
- 인증, 병원 예약, 리뷰 개선 기능을 개발했습니다.
- 스쿼드 업무보다 SRE로서의 전사 공통 업무량이 커지면서 Platform Cell로 이동했습니다.

**Backend Tech Lead & Lead Architect** (2022.04 ~ 2023.03)

- 사내 Backend 코드 품질 관리(Node.JS, Nest.JS, TypeORM, GraphQL)
- 거대한 Monolith GraphQL 서비스로 구현되어 있던 Backend를 Apollo Federation을 사용해 MSA로 전환했습니다.

### Kakao Enterprise

*2021.03 ~ 2021.11 · Backend*

- 아지트, 카카오워크 보드 서버개발 총괄 (Ruby on Rails, Kubernetes)
- 12년이 넘은 레거시 시스템을 최신 버전으로 업그레이드하고 Kubernetes에서 배포·운영하도록 개선했습니다.
- GraphDB 의존성으로 인한 장애 포인트를 줄이기 위해, RDB에 최소한의 저장소만 사용하면서 동일한 역할을 하도록 기능을 재구현했습니다.

### Genoplan

*2020.08 ~ 2021.03 · DevOps, Backend, Agile Coach*

- 신규 서비스 Backend: Ruby on Rails + GraphQL, Nest.JS
- 신규 서비스 Infrastructure: AWS + Terraform, EKS(Kubernetes)
- CI/CD 구축 및 운영: Jenkins + AWS CodeBuild
- 개발팀 내 Agile Coach: Daily Scrum, Sprint Meeting, Kick-off Workshop 설계 및 진행

### JTNet

*2019.01 ~ 2020.05 · SRE, Backend Tech Lead*

- POS 서비스 Backend 구축: Ruby on Rails + GraphQL + MySQL
- SRE & DevOps: Jenkins + AWS CodeBuild 배포 자동화, Kubernetes(EKS) 배포·운영, IaC(Terraform)
  - 배포환경 구축 및 관리(Development, RC, Staging, Production)와 환경별 SLA 관리
  - LoadTest(Locust)를 이용한 Capacity Planning
  - Metric & Monitoring: AWS CloudWatch, Loggly, Sentry, NewRelic
- 매출 통계 Batch: Python on AWS Batch
- Frontend: 사장님 Page, 대리점 Page, 내부 Admin 개발 (Next.JS, React, React-Native + MobX State Tree)
- Electron UI Test Automation: Spectron + Cucumber.JS
- 인프라 세팅, CI, 서버 개발까지 아무것도 없는 상태에서 from scratch로 구축했습니다. 개발 중이던 RESTful API를 GraphQL로 전환하고, MobX State Tree 구조를 단일 tree 계층으로 리팩토링하는 등 코드베이스를 지속적으로 개선했습니다.
- Agile Process 전체를 경험했습니다.

### 직방

*2016.10 ~ 2019.01 · Machine Learning Engineer, Data Engineer, Backend*

- 아파트 시세 생성 + 머신러닝 적용 (Python, XGBoost on AWS EC2): 반나절 이상 걸리던 시세 생성을 파이프라인 작업과 병렬 데이터프레임 적용으로 10분 이내로 단축했습니다. 머신러닝을 도입하여 기존 로직으로는 제대로 산출되지 않던 시세의 정확도를 높였습니다.
- Data Engineering: AWS Batch, EMR(Spark)을 활용한 시세 생성 Pipeline 구축
- B2B(부동산 사장님, 내부 어드민) Part Lead: Backend 개발 및 관련 업무 매니징
- Binary Response Serverless API(Image Converter 외 2종): Node.JS(Serverless Express, ImageMagick, Phantom.JS) on AWS Lambda
- Legacy Monolith ASP.NET 서버 전체 API의 97%를 serverless-express를 활용해 AWS Lambda Node.JS MSA로 컨버팅했습니다. 나머지는 외부 이미지 컨버팅 서비스를 사용하던 API였는데, 이 또한 실시간 이미지 컨버터로 대체했습니다.

### WareValley

*2014.07 ~ 2016.04 · Windows Application Developer*

- Orange DB Management Tool 개발: MFC를 이용한 UI 개발
- Oracle, DB2, Tibero, Altibase, MS-SQL, SybaseASE/IQ, PetaSQL 등 내부 Dictionary 관련 SQL 작성

### JS-System

*2010.10 ~ 2014.07 · PM, Software Architect, Lead Developer*

- **국방기술 연구팀** — 차세대 잠수함 Sonar Simulator 개발 (MFC, CUDA, OpenMP, SIMD)
  - Sonar Simulator 계산 시간을 목표 스펙에 맞추기 위해 CUDA 도입을 건의하고 개발하여, CPU 멀티스레딩 대비 120배 성능을 향상시켰습니다. (해당 분야 국내 최초)
- **공장자동화팀** — SQC(통계적 공정관리), CAD Rendering (C#/VB, MS-SQL/Oracle)
  - 회로기판 CAD 파일(ODB++)을 파싱해 벡터 기반 도면 이미지에 설비에서 수집한 불량 좌표를 매핑하여, 수천 배 확대해도 정확한 위치를 볼 수 있는 시스템을 기획·개발했습니다. (해당 분야 국내 최초)
  - PCB 생산공장 수율 관리

### 삼성전자

*2003.01 ~ 2004.11 · Firmware Engineer*

- Washer & Dryer Microprocessor 개발 (Ansi C, Toshiba chip)
- 1만 라인이 넘는 단일 C 파일을 폴더 구조로 리팩토링하고 State Machine 형태로 재구성했습니다. Makefile로 빌드했으며, 모바일 개발에서 경험한 REX OS에서 영감을 얻었습니다.

### BND

*2001.12 ~ 2002.07 · 산학연합 인턴십 (샌드위치 교육생)*

- Samsung Cellphone UI & Browser Porting (Ansi C, Sprint Mobile in U.S.)
- 해당 회사는 샌드위치 제도를 운영하지 않았지만, 직접 담당자에게 연락해 진행하게 되었습니다.

## Education

**경북대학교** — Computer Science, Bachelor (1996.03 ~ 2003.02)

- 졸업작품: 재무회계 프로그램 MyAsset (Visual Basic + MS-Access)

## 발표 & 커뮤니티

- **데이터야 놀자 2018** — [아파트 시세, 어쩌다 머신러닝까지](https://datayanolja.github.io/speakers/seokjoonyun.html) ([slide](https://www.slideshare.net/seokjoonyun9/ss-119941642))
- **AWS DevDays 2017 Serverless 트랙** — Image Converter on AWS Serverless Express, 윤석찬님과 공동발표 ([slide](https://www.slideshare.net/seokjoonyun9/aws-dev-day-seoul-2017-buliding-serverless-web-app-image-converter), [영상](https://youtu.be/ose1VIo213k))
- **Microsoft Melting Pot Session** — [Deploy serverless Tensorflow predict service on Microsoft Azure](https://onoffmix.com/event/110570) ([글](https://devstarsj.github.io/cloud/2017/07/27/AzureFunction.TensorflowPredict))
- **Pycon 2016 APAC 튜토리얼** — [파이썬으로 기초 산수 풀기](https://www.pycon.kr/2016apac/program/tutorial/7) (심상진님과 공동진행)
- **한국군사과학기술학회 2014.06** — Performance Improvement for Cylindrical Array Sonar Simulator Beam Pattern Generation Stave Status Changes, Using CUDA 논문 발표 ([slide](https://www.slideshare.net/seokjoonyun9/cuda-33834381))
- **Facebook C++ Korea** 임원진 활동 (2014.12 ~ 2017.07)
  - [C++ 핵심 가이드라인](https://github.com/CppKorea/CppCoreGuidelines) 번역 활동 (2015.09 ~ 2015.12)
- 사내 Project Kick-off Workshop 설계 및 진행 — 찐 개발자의 퍼실리테이션 도전기
- 데이터야 놀자 외 데이터·파이썬 관련 컨퍼런스 자원봉사단 및 조교 참여 다수

## Soft Skill 교육

- Daily Meeting Skill (링크컨설팅) — 2020.06.24 (8h)
- Kanban Workshop (조승빈 코치) — 2021.01.28 (8h)
- Sociocracy Foundation (링크컨설팅) — 2021.03.28 (8h)
- Sociocracy 초급 공개과정 — 2022.07.01 ~ 07.02 (16h)
- BossaNova: 우아하고 경쾌하게 조직 혁신하기 (링크컨설팅, John Buck 초빙) — 2022.09.20 ~ 09.22 ([관련 영상](https://youtu.be/aYT2NC9eYqM))
- 한국코치협회 KAC 과정 수료 (PMA 코칭센터) — 2024.03 ~ 2024.05
