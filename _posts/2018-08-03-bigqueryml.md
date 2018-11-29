---
layout: post
title:  "BigQuery ML Beta 사용기"
subtitle:   "BigQuery ML Beta 사용기"
categories: gcp
tags: BigQuery
comments: true
---

- 최근 발표되고 이슈가 되었던 Google Cloud BigQuery ML Beta를 사용하며 남긴 글입니다. Beta라서 많이 바뀔 것 같지만 그래도 남겨봅니다!  
- [공식 문서](https://cloud.google.com/bigquery/docs/bigqueryml)를 보고 작성했습니다


## BigQuery ML
---

- <img src="https://techcrunch.com/wp-content/uploads/2018/07/image2.gif">
- BigQuery ML에 대해 설명할 필요 없이 위 Gif를 참고하면 될 것 같습니다
- 이 서비스가 충격적이고 Hot한 이유는 쿼리문으로 쉽게 모델을 만들 수 있는 점과 AutoML을 보여주기 때문이라 생각합니다
- BigQuery의 standard SQL 쿼리로 머신러닝 모델을 생성하고 실행할 수 있습니다
	- 예측 Table을 만든 후, REST API처럼 사용할 수 있습니다


### 제공하는 모델
- 현재(18.8월) 베타 기준으로 2가지 모델이 제공됩니다
- 다음 달에 classification, recommendation 등이 지원될 예정이라 합니다
- Linear regression 
	- numerical value를 예측할 때 사용
- Binary Logistic regression 
	- 이메일 스팸 필터처럼 2개의 클래스를 분류할 때 사용 

### 사용할 수 있는 곳
- BigQuery web UI
- ```bq``` command-line tool
- BigQuery REST API
- Jupyter Notebook 같은 외부 툴	


### BigQuery ML의 장점 
- Python이나 Java를 몰라도 SQL문으로 Machine Learning 모델을 생성할 수 있음. 즉 쉽게 모델을 만들 수 있습니다
- 데이터웨어 하우스(BigQuery)에서 데이터를 Export하지 않고 모델링이 진행되기 때문에 속도가 빠릅니다
- 학습 파라미터, Feature, Weight 등의 정보도 제공합니다

### 가격 정책
- BigQuery의 가격 정책을 그대로 따릅니다
	- 데이터 저장비용
	- 쿼리 비용(쿼리할 때 탐색하는 데이터양에 비례해 비용이 부과)
- 허나 아직 베타라서 이런 듯! 추후 가격 정책이 생길 것 같습니다

## Getting Started with BigQuery ML
---

- Data Analyst와 Data Scientist를 위한 글로 나뉘어져 있는데, 전자는 BigQuery Console에서 진행하고 후자는 Datalab에서 진행합니다(데이터셋은 동일) 
- 저는 BigQuery Console에서 Data Scientist에 나와있는 내용을 진행했습니다
	- Google Analytics 샘플 데이터를 사용해 website 방문자가 결제를 할지 예측하는 모델을 만듭니다

	
### Method 정리
- 모델 생성할 때 : ```CREATE MODEL```
- Evalute할 때 : ```ML.EVALUATE```
- Predcit할 때 : ```ML.PREDICT``` 

### 1. Dataset 생성
- [BigQuery Console](https://console.cloud.google.com/bigquery)에서 리소스 - 프로젝트 아이디 클릭해주세요
- <img src="https://www.dropbox.com/s/reozanj9m8d7uv8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2019.41.23.png?raw=1"> 
- 데이터세트 만들기 클릭! : id는 bqml_tutorial

### 2. 분류 모델 생성하기
- 우리가 다룰 데이터는 다음과 같습니다
- <img src="https://www.dropbox.com/s/r4ezv463j30nush/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2019.55.27.png?raw=1">
- label은 0, 1로 transcation이 있으면 1 없으면 0
- os, mobile 유무, 국가, pageviews가 feature

- 모델 생성은 아래와 같은 쿼리로 수행합니다

```
CREATE OR REPLACE MODEL `bqml_tutorial.sample_model`
OPTIONS(model_type='logistic_reg') AS
SELECT
  IF(totals.transactions IS NULL, 0, 1) AS label,
  IFNULL(device.operatingSystem, "") AS os,
  device.isMobile AS is_mobile,
  IFNULL(geoNetwork.country, "") AS country,
  IFNULL(totals.pageviews, 0) AS pageviews
FROM
  `bigquery-public-data.google_analytics_sample.ga_sessions_*`
WHERE
  _TABLE_SUFFIX BETWEEN '20160801' AND '20170630'
```

- label이란 컬럼이 꼭 필요합니다(label2라고 하면 에러 뿜음)
- 20160801부터 20170630까지 약 11개월치 데이터를 학습했는데 약 8분 소요
- <img src="https://www.dropbox.com/s/z3hgct6knz5a952/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.05.44.png?raw=1">

- Test로 20170601부터 20170630까지 1개월 데이터를 학습했는데 99초 소요 (UI가 다른 이유는 이 테스트는 과거 BigQuery Console에서 진행했기 때문입니다! 과거 UI에서도 정상 작동함)
- <img src="https://www.dropbox.com/s/2e21v7nf8ua9b3u/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.08.06.png?raw=1">


### 3. 학습 모델 정보 보기
- 생성된 Table에서 정보 확인
- <img src="https://www.dropbox.com/s/tovs8tvypxgac2u/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.10.11.png?raw=1">
- 모델 유형, loss 유형, 학습 옵션도 보임!!! Early Stopping이 적용된 듯
- <img src="https://www.dropbox.com/s/wd37myxsjqk8m9j/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.12.02.png?raw=1">
- 위 방법 이외에도 모델의 정보를 보고 싶은 경우엔 ```ML.TRAINING_INFO``` 를 사용하면 됩니다

	```
SELECT
  *
FROM
  ML.TRAINING_INFO(MODEL `bqml_tutorial.sample_model`)
```

- <img src="https://www.dropbox.com/s/ud29tmnr5f6lffa/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.15.23.png?raw=1">
- training\_run은 새로 생성된 모델은 값이 0이고 warm\_start 옵션을 사옹할 경우, 다시 학습시 값이 증가합니다

- Feature의 정보를 보고싶을 경우

	```
SELECT
  *
FROM
  ML.FEATURE_INFO(MODEL `bqml_tutorial.sample_model`)
```

- <img src="https://www.dropbox.com/s/owxlzk1v6obrdq3/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.18.37.png?raw=1">

- Weights의 정보를 보고싶을 경우

	```
SELECT
 *
FROM
 ML.WEIGHTS(MODEL `bqml_tutorial.sample_model`)
```

- <img src="https://www.dropbox.com/s/sym8l40p5p2p0jk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.20.56.png?raw=1" height="600" width="500">
- 이런 식으로 weight도 나옵니다! 충격적...

### 4. 모델 평가하기
- ```ML.EVALUATE```를 사용해 모델 평가합니다
- 학습할 때 사용하지 않은 20170701 ~ 20170801 데이터로 평가했습니다

```
SELECT
  *
FROM ML.EVALUATE(MODEL `bqml_tutorial.sample_model`, (
  SELECT
    IF(totals.transactions IS NULL, 0, 1) AS label,
    IFNULL(device.operatingSystem, "") AS os,
    device.isMobile AS is_mobile,
    IFNULL(geoNetwork.country, "") AS country,
    IFNULL(totals.pageviews, 0) AS pageviews
  FROM
    `bigquery-public-data.google_analytics_sample.ga_sessions_*`
  WHERE
    _TABLE_SUFFIX BETWEEN '20170701' AND '20170801'))
```

- 1초가 지난 후 아래와 같은 결과가 나왔습니다
- <img src="https://www.dropbox.com/s/lbtmz553gq7ktdr/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.23.45.png?raw=1">


### 5. 모델로 예측하기
- ```ML.PREDICT```을 사용해 예측한 후, 국가별 총 예측 구입량을 계산했습니다

```
SELECT
  country,
  SUM(predicted_label) as total_predicted_purchases
FROM ML.PREDICT(MODEL `bqml_tutorial.sample_model`, (
  SELECT
    IFNULL(device.operatingSystem, "") AS os,
    device.isMobile AS is_mobile,
    IFNULL(totals.pageviews, 0) AS pageviews,
    IFNULL(geoNetwork.country, "") AS country
  FROM
    `bigquery-public-data.google_analytics_sample.ga_sessions_*`
  WHERE
    _TABLE_SUFFIX BETWEEN '20170701' AND '20170801'))
  GROUP BY country
  ORDER BY total_predicted_purchases DESC
  LIMIT 10
```

- 역시 1초 뒤 아래와 같은 결과가 나왔습니다
- <img src="https://www.dropbox.com/s/xqxoqzq3nl77itv/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-02%2020.26.01.png?raw=1" height="400" width="600">


## BigQuery ML 문법
---

- ```CREATE MODEL``` : [링크](https://cloud.google.com/bigquery/docs/bigqueryml-ncaa)
	- l1\_reg, l2\_reg, max\_iterations, learn\_rate\_strategy, learn\_rate, early\_stop, min\_rel\_progress, data\_split\_method, warm\_start 등을 설정할 수 있음
- ```ML.EVALUATE``` : [링크](https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-evaluate)
	- logistic regression은 precision, recall, accuracy, f1\_score, log\_loss, roc\_auc로 결과가 나옴
	- linear regression은 mae, mse, msle, mae, r2\_score, explained\_variance로 결과가 나옴
- ```ML.PREDICT``` : [링크](https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-predict)
- ```ML.TRAINING_INFO``` : [링크](https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-train)
- ```ML.FEATURE_INFO``` : [링크](https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-feature)
- ```ML.WEIGHTS``` : [링크](https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-weights)

## Tutorial
---

- [Using BigQuery ML to Predict Basketball Outcomes](https://cloud.google.com/bigquery/docs/bigqueryml-ncaa)
- [Using BigQuery ML to Predict Birth Weight](https://cloud.google.com/bigquery/docs/bigqueryml-natality)


## 사용 후기
---

- 원래 BigQuery에 대한 만족이 높았는데, 이번 BigQuery ML로 더욱 만족도가 높아졌습니다
- Structured된 데이터라면 더 쉽게 모델을 만들 수 있을 것 같습니다
- 단, BigQuery 특성상 딥러닝 모델까지 나올진 의문이 듭니다
	- BigQuery는 쿼리할 때 탐색하는 데이터의 양에 따라 비용이 부과되는데 비정형 데이터는 데이터가 크기 때문에 비용도 들고.. 비효율성이 나타날 것 같음
	- BigQuery에 데이터를 적재하기도 어려운 상황
- 아마 구조화된 데이터는 BigQuery ML로 비정형 데이터는 [AutoML](https://cloud.google.com/automl/)로 커버하지 않을까 생각됩니다
- 그래도 갓구글님들이 이런 제품을 내놓아서 리스펙.. 자꾸 내놓으면 저같은 데이터쟁이는 어떻게 되나요(..)


## Reference
- [BigQuery ML - Machine Learning using SQL in BigQuery](https://www.youtube.com/watch?v=BanOYQVl30I)
- [Tech crunch](https://techcrunch.com/2018/07/25/google-is-baking-machine-learning-right-into-its-bigquery-database-service/)