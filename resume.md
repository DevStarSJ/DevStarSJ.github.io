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
- **LLM / AI**: LangChain, LangGraph, AWS Bedrock, Azure OpenAI, OpenAI, AI Agent Architecture
- **Backend**: FastAPI, Ruby on Rails, Nest.JS, Serverless-Express, ASP.NET, GraphQL(Apollo Federation), Prisma, TypeORM, Celery
- **Frontend**: Next.JS, React, React-Native, MobX State Tree, Recoil
- **Data Engineering**: Pandas, Spark, XGBoost, CatBoost, LightGBM, Scikit-Learn, Keras
- **Infrastructure**: AWS, Terraform, Kubernetes(EKS), Helm, GitHub Actions, Jenkins, OpenSearch/Elasticsearch, Redis, MySQL/Aurora
- **Parallelism**: CUDA, SIMD, OpenMP

## Experience

### DeepSearch

*2023.08 ~ 현재 · Tech Lead, SRE, LLM Engineer*

**SRE** (2023.08 ~ 현재)

- IaC(Terraform + AWS), Kubernetes(EKS), CI/CD(GitHub Actions + Helm Chart)
- 여러 리전에서 EC2로 직접 운영하던 인프라(Redis, Elasticsearch, Kubernetes)를 AWS managed service로 마이그레이션했습니다. 직접 운영하는 구조에서 리소스 관련 장애가 반복적으로 발생했고 대응도 어려웠기 때문에, managed service로 전환하면서 Seoul 리전으로 옮기는 작업을 진행했습니다. B2B 고객 대상 서비스라 무중단·무장애로 이전했으며, Elasticsearch는 기존 형태소분석기와 사용자정의 사전이 호환되지 않아 해당 부분을 새로 구현했습니다.
- 별도 repo에서 수동 배포하던 레거시를 포함해 모든 서비스에 GitHub Actions + EKS Helm Chart 배포 프로세스를 새로 구축했습니다.

**Tech Lead** (2023.11 ~ 현재)

- 문서가 남아있지 않은 레거시 서비스의 유지보수와 고객사 대응을 담당했습니다. 유지보수가 어려운 시스템에 의존하던 코드를 관리 가능한 환경으로 데이터 마이그레이션하고 신규 API를 만든 뒤, 기존 고객 요청은 하위호환 Gateway를 통해 신규 API가 응답하도록 전환했습니다. ([Strangler Fig Pattern](https://martinfowler.com/bliki/StranglerFigApplication.html))
- 구성원들과 2주 단위 1on1을 진행하며 성장을 위한 피드백을 제공했습니다.
- Engineering Day를 기획하여 스쿼드로 나뉜 엔지니어들이 주기적으로 모여 기술 활동을 하는 자리를 만들었습니다.
- LLM 마이그레이션을 여러 차례 수행했습니다(OpenAI → Azure OpenAI, 기존 파이프라인 → AWS Bedrock). Public Cloud LLM은 rate limit이 있으므로 쓰로틀링 오류 및 장애 상황에 대비해 여러 리전·모델에 대한 fallback 요청을 구현했습니다.
- Vibe Coding을 전사적으로 도입하여 생산성을 높이는 활동을 주관했습니다.

**Tech Product Team Lead & LLM Engineer** (2024.01 ~ 2025.06) — Python, FastAPI, Prisma, Celery, LangChain, LangGraph

- 기능조직에서 목적조직으로 개편되면서, 회사 매출을 담당하던 금융 데이터 조직의 Lead 역할을 수행했습니다.
- 해외 뉴스 및 토픽 인사이트 파이프라인을 구축하면서 LLM을 활용해 번역, 요약, 기업/시장 분석자료, ESG 분석 데이터를 생성했습니다.
- 주가/ETF의 가격 변동 원인을 설명하는 브리핑 컨텐츠를 LLM으로 생성했습니다.
- [ETF 스타디움](https://invest.zum.com)의 기획부터 배포·운영까지 전 과정에 참여하여 서비스를 런칭했습니다.
- 기존 API로 제공하던 기능을 자연어로 응답받을 수 있도록 AI Agent 아키텍처를 설계하고 구현했습니다.

**Financial AI Team Engineer** (2025.06 ~ 현재)

- LLM 기반 신규 파이프라인을 기획·구현했습니다: risk monitoring, 거시경제 브리핑, 증권사 리포트 요약 및 회사별 전망 정규화 데이터 추출, 기존 주가/ETF 브리핑 고도화.
- 신규 AI Agent 서비스 개발에 참여했습니다.

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
