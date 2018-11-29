---
layout: post
title: "Kaggle Tip 및 대회 후기"
subtitle: "Kaggle Tip 및 대회 후기"
categories: data
tags: kaggle
comments: true
---

Coursera 강의인 How to Win a Data Science Competition: Learn from Top Kaggler Week4~5 내용을  정리한 내용입니다  


## Tips and tricks
---

- 5명의 강사분들이 경험한 내용을 전달!
- 누군가에겐 필요없는 내용일 수 있지만 도움이 되는 내용이 더 많을 듯
- 섹션별로 다른 강사가 이야기한 내용


### 대회에 참여하기 전
- 목표 설정하기
	- 참여해서 얻고싶은 것은 무엇인가?
	- 1) 흥미로운 문제에 대해 배우고 싶다
		- 포럼에 토론이 많은 대회 추천!
		- 주 관심사에 맞는 대회가 나오면 추천! 
	- 2) 새로운 software 툴을 사용하고 싶다
		- Tutorial이 있는 대회 추천! 
	- 3) 메달을 취득하고 싶다
		- 참가자들의 제출 횟수를 파악
		- 100회가 넘으면 아마 inconsistency of validation
		- 횟수가 적으면 시도해볼 가치가 있음! 
	- 이 목표에 따라 참여할 대회를 결정할 수 있음 

### 아이디어를 토대로 작업
- 1) 아이디어를 구조화
	- 포럼을 읽고 흥미로운 것을 모아두기
- 2) 가장 중요하고 유망한 아이디어 선택
- 3) 왜 그것이 되거나(되지 않거나)를 이해해보기

### 하이퍼 파라미터
- 모든 것이 하이퍼 파라미터
	- Feature의 개수, 그라디언트 부스팅의 depth, cnn의 layer 수 등... 
- 모든 파라미터를 아래 항목으로 정렬
- 1) 중요도
- 2) 실행 가능도
- 3) 이해도

---

### Data loading
- csv/txt 파일을 ```hdf5/npy```로 변경(빠르게 로딩하기 위해)
- default data는 64-bit array로 저장되어있음! 
	- ```32-bits```로 downcast해서 메모리를 2배 절약!
- 거대한 데이터셋은 ```chunks```로 작업을 할 수 있음 
	- chunks 사용시 메모리를 많이 사용하지 않음

### Performacne 평가
- 추가적인 validation이 항상 필요한 것은 아님
	- 처음엔 full cross validation loop 대신 simple split
	- Full cv는 정말 필요할 때 진행 
- 가장 빠른 모델로 시작(LightGBM)
- 모델 튜닝, 샘플링, 스태킹 등은 FEature engineering이 만족한 후에 진행
- <img src="https://www.dropbox.com/s/9cdi4f0tetkpe1m/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-03%2001.58.07.png?raw=1"> 

### 빠르고 더럽지만 항상 좋은 방법
- 코드 퀄리티에 신경쓰지 말기
- Simple을 유지하기 : 중요한 것을 아끼기
- 컴퓨팅 리소스가 불편하면 큰 서버를 빌리기

---

### 초기 파이프라인
- 간단한(심지어 원시적인) solution부터 시작
- 전체 파이프라인을 디버깅
	- read data ~ writing submission
- 커널 또는 대회 주최자가 제공한 baseline을 읽고 완벽하게 숙지
- From simple to complex
	- 처음 시작할 땐 GBDT보다 파라미터를 튜닝할 필요가 없는 랜덤 포레스트를 선호
	
### Best Practices from Software Development
- 좋은 변수 이름을 사용
	- 코드가 읽기 어려우면 조만간 문제가 생길 수 있음
- 연구를 재생산 가능하도록 유지
	- 랜덤 Seed 고정
	- Feature를 어떻게 생성했는지 작성하기
	- 버전관리하기
- 코드 재사용  	
	- Train과 Test에서 feature 생성시 같은 코드를 사용하기  
	 
### Read papers
- ML과 관련된 아이디어
	- ex) How to optimize AUC
- 도메인과 친해질 방법
	- 특히 feature 생성시 유용함   

---

### My pipeline
- 포럼을 읽고 커널을 검사
	- 항상 토론이 발생!
	- 데이터의 버그가 있어 데이터가 모두 바뀔 수 있음. 그래서 대회 초창기에 참여하지 않는다고 함
- EDA과 베이스라인 시작
	- 데이터를 정확하게 load
	- validation score가 안정한지 check
- Feature 추가
	- 처음엔 만든 모든 변수를 추가
	- 모든 변수를 한번에 평가함  
- 하이퍼파라미터 최적화
	- 처음엔 트레인 데이터를 오버피팅할 수 있는 파라미터를 찾음
	- 그리고 모델을 다듬음

### 코드 관리
- 가장 중요한 것은 재생산!
	- 코드를 깔끔하게 유지
- 긴 실행 history 피하기
	- global variables가 있을 수 있음
	- 주기적으로 노트북 재부팅
- 변수 이름을 잘 정하기
- One notebook per submission
	- 그리고 git 사용하기
- submission을 만들기 전에 커널을 restart  
- test/val
	- 처음에 train, test를 read한 후, train, val로 나누고 그 파일을 로컬에 저장해두기
- 매크로 사용
	- import numpy 같은 것을 귀찮으니 매크로로 편하게 사용
	- [참고 노트북](https://hub.coursera-notebooks.org/user/ynvomuepahfsgzmplvnxhw/notebooks/Reading%20materials/Macros.ipynb)
- Custom library
	- 직접 구현해야 하는 경우
	- Out-of-fold predictions
	- Averaging
	  
---

### The Pipeline
- Understand the problem (1 day)
- Exploratory analysis (1-2 days)
- Define cs strategy
- Feature engineering (unitl last 3-4 days)
- Modeling (until last 3-4 days)
- Ensembling(lasy 3-4 days)
- 처음엔 커널이나 외부 정보를 전혀 받지 않고 스스로 문제해결 시도
	- 그 후 다른 사람들의 커널을 보면 더 새로운 결과를 얻을 수 있음 

### 문제를 넓게 이해하기
- 문제의 유형
	- 이미지 인식, 음성 인식, 최적화 문제, tabular, 타임시리즈 등
- 데이터가 얼마나 큰가?
	- 데이터가 얼마나 필요한가?
- 필요한 하드웨어
	- CPU, GPU, RAM, Disk space
	- 딥러닝의 경우 GPU 필요   
- 필요한 소프트웨어
	- TF, sklearn, Lightgbm, xgboost
	- 아나콘다, virtual 환경 생성
- 테스트할 metric이 무엇인가?
	- regression, classification, rmse, mae, ...
	- 유사한 대회를 찾아 정보를 찾아봄 

### EDA
- 변수들을 plot
	- Train과 test에서 유사한 feature를 check
- 시간대별 feature, target별 feature plot
	- 시간이 지나며 target이 변하는지 check
- Feature와 Target의 연관성 탐색
- Feature간의 상호 관계 파악 

### Cross validation 전략
- 매우 중요
- Time 관련 데이터가 중요하면 시간으로 데이터 나누기! Time-based validation
	- 항상 과거 데이터로 미래를 예측해야 함
- train보다 다른 entity가 있는 경우 Stratified validation
- 완벽하게 데이터가 random일 경우 Random validation(random K-fold)
- 위 사례의 Combination

### Feature engineering
<img src="https://www.dropbox.com/s/r1glvl4rz6b5gfo/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-03%2023.25.35.png?raw=1">

- Data cleaning and preparation
- Handle missing value
- Generate new feature
- 다른 문제들은 다른 feature engineering이 필요!
- 계속 하다보면 반복되는 패턴도 있어, 자동화를 어느정도 할 수 있음

### Modeling
<img src="https://www.dropbox.com/s/5tl6ylkllh9e6wh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-03%2023.31.39.png?raw=1">

- reference로 참고할 뿐 이게 진리는 아님!!

### Ensembling
<img src="https://www.dropbox.com/s/qg2hd7dcsvxaqtl/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-03%2023.46.00.png?raw=1">

- 단순 평균 ~ 멀티레이어 스태킹 등 다양한 방법으로 결합

### 협업 팁
<img src="https://www.dropbox.com/s/crd345coq0w035m/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-03%2023.46.27.png?raw=1">

## 대회 후기
## Crowdflower Competition
---

- 최종 등수 : 2위
- 대회 목표 : 검색 결과의 적절성을 측정
- <img src="https://www.dropbox.com/s/8fs0dzbwnlook3b/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.26.01.png?raw=1">
- Metric
	- Quadratic weighted kappa
	- Typical valu range 0 ~ 1
	- <img src="https://www.dropbox.com/s/gbgdux8svsvry85/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.29.10.png?raw=1">
	- <img src="https://www.dropbox.com/s/nmlu1drb8e7fyfw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.29.19.png?raw=1"> 
	- <img src="https://www.dropbox.com/s/iwqomg8j1hp5gmo/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.29.29.png?raw=1">
	- <img src="https://www.dropbox.com/s/tzr582jm29wiy5s/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.29.40.png?raw=1">
- 3 important points about data
	- query들은 매우 짧음
	- unique query는 261개
	- 쿼리는 train과 test에 동일 

### Solution
- Text features
	- Similarities(유사도) 
		- query, title, description
		- (query, title), (query, description) pair로 계산
		- matching 단어의 개수
		- TF-IDF의 코사인 거리
		- 평균 word2vc의 거리
		- Levenshtein 거리 
	- Symbolic n-grams
- Extending of queries
	- <img src="https://www.dropbox.com/s/puzixmsj3jev07a/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.43.17.png?raw=1"> 
- Per-query models 
- Sample weighting
	- <img src="https://www.dropbox.com/s/dwrungwdnomolhy/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.44.47.png?raw=1"> 
- Bumper features
	- <img src="https://www.dropbox.com/s/i4yo0u07mapb1nj/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.45.04.png?raw=1"> 
- Ensemble
	- <img src="https://www.dropbox.com/s/6l545g0h94a8vho/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.45.24.png?raw=1">
	- <img src="https://www.dropbox.com/s/ceka0f5iz0uxtig/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.45.36.png?raw=1"> 
- Kappa optimization 
	- <img src="https://www.dropbox.com/s/u2gb29xw4bniijw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2000.45.55.png?raw=1">

### Conclusion
- Key points
	- Symbolic n-grams
	- Expansion of queries
	- Optimization of thresholds for Kappa	

## Springleaf Marketing Response
---

- 최종 등수 : 3등  

<img src="https://www.dropbox.com/s/8q2k9flkxsx4dfl/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2011.21.05.png?raw=1">

### Feature packs
- Processed dataset 
	- data cleaning과 feature engineering
- Basic dataset 
	- Basic data cleaning and feature engineering
- Mean-encoded dataset
	- Projecting features into homogeneous space
- KNN dataset
- distance features on mean-encoded  	

### Out-of-fold predictions
- xgboost
	- oof predictions(meatafeatures) should be diverse
	- each meatafeature should bring 'new' information about Y	
- neural net
	- StandardScaler, Ranks, Power 
	
	
## Reference
- [Coursera How to win a data science competition](https://www.coursera.org/learn/competitive-data-science)
- [Competitive-data-science Github](https://github.com/hse-aml/competitive-data-science)