---
layout: post
title:  "BigQuery와 Datalab을 사용해 데이터 분석하기"
subtitle:   "BigQuery와 Datalab을 사용해 대용량 데이터 분석하기"
categories: gcp
tags: BigQuery
comments: true
---

Google Cloud Platform 제품인 BigQuery와 Datalab을 사용해 Structed Data를 분석하는 방법에 대해 설명한 글입니다.  
데이터는 빅콘테스트의 NC 데이터를 예시로 들었습니다. 혹시 문제가 있다고 생각하면 제게 연락주세요!  

- 쉘 스크립트와 쿼리 코드는 [2018-bigcontest-nc Repository](https://github.com/zzsza/2018-bigcontest-nc)에 있습니다 :)


## 대용량 데이터 다루기
- 캐글이나 공모전에서 약간 큰(~~사실은 절대 크진 않은~~) 데이터를 가지고 작업할 경우
	- Python Pandas에서 ```pd.read_csv```시 dtype을 np.int32 등으로 설정해 최대한 메모리를 절약하고 ```gc.collect()```로 할당된 메모리를 해지
	- 또는 Spark를 사용해 분산으로 작업을 진행
	- 또는 좋은 컴퓨터(CPU, RAM이 좋은)를 구입
	- 좋은 컴퓨터도 메모리가 낮을 수 있으니 클라우드 서비스를 사용
- 이정도 생각해볼 수 있음
- 그러나 좋은 메모리를 사용해도 "퍼포먼스" 부분에선 한계가 존재(Python의 자체 한계나 코드적인 부분에서)
- 그래서 저는 캐글할 때 BigQuery에 데이터를 적재해서 사용
	- BigQuery는 데이터 웨어하우스로 데이터 분석용 클라우드 서비스
	- 별도의 설치나 운영이 필요 없고, 데이터만 넣어주면 됨
	- 쿼리 수행시 탐색하는 데이터의 양에 비례해 요금이 부과됨(1TB당 $5) 
		- 월 1TB는 무료고 GCP 처음 가입시 $300 제공
	- 많이 사용하는 라이브러리는 거의 다 설치되어 있으며, 심지어 ```xgboost```도 기본 설치됨
 - BigQuery와 로컬 컴퓨터의 Python을 사용하면 IO 이슈가 생김(쿼리하는 것은 빠르나 쿼리한 결과물의 로우 수가 많다면, 로컬로 넘어오는 시간이 오래 걸림)
 - 따라서 Google Cloud Platform에서 제공하는 datalab(jupyter notebook이랑 유사)를 사용해 IO를 최소화
 
 
## 목차 
- Google Cloud Platform 가입 : [링크](https://zzsza.github.io/gcp/2018/01/01/gcp-intro/) 참고
- 데이터 다운로드 : 각자 다운로드
- Google Storage에 데이터 업로드
- [BigQuery에서 테이블 생성](#bigquery에서-테이블-생성)
- [Datalab 생성](#datalab-생성)
- [Datalab에서 BigQuery 연동](#datalab에서-bigquery-연동)	


## Google Storage에 데이터 업로드
- [GCP Console](https://console.cloud.google.com/home/dashboard)에서 Storage 클릭
- "버킷 생성" 클릭
	- 이름 : upload-bigquery
	- 저장소 등급 : Reginal 	
	- 위치 : ASIA-EAST1
- <img src="https://www.dropbox.com/s/sjsmkc33s1vrqey/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-07-31%2022.53.13.png?raw=1">
- "파일 업로드"를 눌러서 파일을 업로드 하거나 파일을 드래그앤드롭
- 이제 업로드한 파일의 주소는 ```gs://upload-bigquery/{file_name}.csv```

## BigQuery에서 테이블 생성
- [BigQuery Console](https://bigquery.cloud.google.com)로 접속
	- 만약 파란색 배경의 "베타" 콘솔 화면이 뜬다면 ```Go to Classic UI```를 클릭해 클래식 UI로 접속
- <img src="https://www.dropbox.com/s/pd6gqmfuxjzzfvn/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-07-31%2023.01.29.png?raw=1">
- 세모 버튼을 클릭한 후, Create new dataset 클릭
- Dataset ID : ```nc_new```
- nc_new를 선택한 후 + 버튼 클릭
- <img src="https://www.dropbox.com/s/s7a2pbyolfydu5y/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-07-31%2023.05.29.png?raw=1" widht="500" height="600">
- 위 설정으로 한 후, Create Table을 하면 몇분 뒤 테이블 생성
	- {file_name}은 저장된 파일 이름을 지정
	- 단, nc 데이터는 총 11개라 귀찮음. 자동화 작업

### 쉘 스크립트 작성
- [gcloud](https://cloud.google.com/sdk/gcloud/)를 설치하면 command창에서 명령어 입력 가능
- ```gcloud init```을 입력 후, 계정 설정
- ```bq ls``` 입력해 datasetId 출력되나 확인

	```
$ bq ls
>>> 
 datasetId
-----------
 nc_new
```

- 다음과 같은 명령어로 로컬에서 BigQuery Table을 생성할 수 있습니다

```
bq --location=US load --autodetect --skip_leading_rows=1 --source_format=CSV nc_new.test_guild gs://upload-bigquery/test_guild.csv
```

- 이걸 한번에 작업하기 위해 쉘 스크립트로 작성

	```
vi load-data-bigquery.sh
```

- ```load-data-bigquery.sh```

```
BUCKET_NAME="upload-bigquery"
TABLE_NAMES="test_activity test_guild test_party test_trade test_payment train_activity train_guild train_label train_party train_payment train_trade"

for TABLE in $TABLE_NAMES; do
    bq --location=US load --autodetect --skip_leading_rows=1 --source_format=CSV "nc_new.${TABLE}" "gs://${BUCKET_NAME}/${TABLE}.csv"
done
```

- ```ESC+:wq```로 저장한 후 권한을 755로 준 후, 실행

	```
chmod 755 load-data-bigquery.sh
./load-data-bigquery.sh
```

- 약 10분 후 작업 완료(명령어 순서는 아래 사진을 따라하지 말고 위에서 작성한대로 진행)
- <img src="https://www.dropbox.com/s/cxpn6zdxlzngou4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-07-31%2023.55.31.png?raw=1">

- 이제 다시 BigQuery Console로 돌아가 테이블이 생성되었나 확인
- <img src="https://www.dropbox.com/s/eh9bug7bkinzk3v/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-07-31%2023.57.33.png?raw=1">
- Details를 선택하면 테이블 정보를 볼 수 있고, Preview를 누르면 데이터를 볼 수 있음

## Datalab 생성
- [링크](https://console.cloud.google.com/flows/enableapi?apiid=compute,sourcerepo.googleapis.com&redirect=https://console.cloud.google.com&_ga=2.164182777.-79726829.1522553028)로 가서 API 사용 설정
	- 링크에서 사용 확인이 뜨지 않는다면 구글클라우드 콘솔에서 API 및 서비스 - API 및 서비스 사용 설정 - Google Compute Engine, Cloud Source Repositories APIs 2개 사용설정
- 터미널에서 아래 명령어 입력

```
datalab create --machine-type n1-standard-8 datalab-instance
```

- zone은 BigQuery의 위치인 US(us-east1-b) 선택
- 머신 유형은 [링크](https://cloud.google.com/compute/docs/machine-types) 참고
	- n1-standard-8의 성능은 cpu 8개 RAM 30기가로 사용할 때만 키고 사용하지 않으면 끄는 것을 추천!!! 
- datalab-instance 대신 원하는 이름 설정 가능
- 약 5분 후 Compute Engine에 인스턴스가 생성된 것을 볼 수 있음
- 첫 생성시 ```localhost:8081```로 자동 연결
- 추후 접속하고 싶을 경우 터미널에서 ```datalab connect datalab-instance``` 실행


## Datalab에서 BigQuery 연동
- docs-BigQuery에 가면 예제 파일이 있음
- BigQuery에 대해 궁금하면 [BigQuery Tutorial](https://github.com/zzsza/bigquery-tutorial) 참고(Star해주시면 좋아합니다)
- BigQuery에서 쿼리로 EDA
- Feature Engineering를 빅쿼리에서 진행하고 Join 
- 등의 작업을 BigQuery에서 진행한 후, Datalab에서 모델링 진행 추천

### Feature Engineering
- 이제 가설을 잡고 모델링
- 가설
	- 1) 결제한 유저들은 게임을 더 오래할 것이다
	    - 생성 feature : payment\_cnt, payment\_total
	- 2) 문파에 가입한 유저들은 게임을 더 오래할 것이다(단, 길드의 멤버수도 영향을 끼칠 것이다)
	    - 생성 feature : guild\_tf, guild\_member\_cnt
	    - guild는 9963개.. 우선은 guild 가입 유무 변수만 추가
	- 3) 접속하는 빈도를 통해 속도를 측정할 수 있을 것이다(소수점 둘째자리에서 round)
	    - 생성 feature : login_speed : sum(cnt\_dt)/count(wk)\*7, last\_week : max(wk)
	    - 1주차 7일, 2주차 7일, 3주차 7일 => feature 1. 접속 속도 1, max(접속주차) => feature2. 마지막 주차
	    - 1주차 7일, 2주차 5일 = 12/14 = 0.85
	    - 1주차 7일, 3주차 3일 = 10/21 = 0.47
	    - sum(cnt_dt)/count(wk)\*7
	- 4) Baseline에는 activity에서 다음만 사용 : wk, cnt\_dt, play\_time, normal\_chat, cnt\_use\_buffitem
- 위 Feature들을 Join하는 쿼리 작성 후 진행
- 쿼리문은 [Github](https://github.com/zzsza/2018-bigcontest-nc)에 올려둘 예정
- 이후 xgboost로 거의 default 옵션가지고 모델링하고 제출해보니 0.65점 나옴 
- Feature 추가하고 이것저것 해보면 더 올라가지 않을까 생각됨
- 예전에 하던 일이 이런 일들이라 이제 대회를 참여하지 않을 예정