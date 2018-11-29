---
layout: post
title: "How to win a data science competition Week2 - EDA"
subtitle: "Coursera How to win a data science competition 2주차 EDA"
categories: data
tags: kaggle
comments: true
---

Coursera 강의인 How to Win a Data Science Competition: Learn from Top Kaggler Week2 EDA를 듣고 정리한 내용입니다  
EDA : 탐색적 자료 분석, Exploratory data analysis

---

## EDA
- EDA가 주는 것
	- 데이터를 더 잘 이해할 수 있음
	- 인사이트를 형성 가능
	- 가설 생성할 수 있음
	- 직관력을 가질 수 있음
	- magic feature를 찾을 수 있음
- Visualiations
	- Visualization -> Idea : Find pattern
	- Idea -> Visualization : Hypothesis testing 
- 모델링에 바로 들어가기보다 반드시 EDA를 먼저 해라!

### Exploratory data analysis
- Get domain knowledge
	- 대회 관련 도메인 지식 쌓기
	- 위키피디아에 검색, 구글에서 기사 검색 등
- Check if the data is intuitive
	- 직감에 기반해 데이터 체크 
	- 나이에 336이 있으면 이건 오타인가?
	- 33인가? 36인가?  
- Understand how the data was generated
	- Train과 Test data의 분포 비교
	- 데이터를 잘 섞었는지?
	- 적절한 validation이 셋팅되야 함

### Exploring anonymized data
- Anonymized data
	- 보안상의 문제로 encode
	- type of feature를 알 수 없게 만듬
	- 우리는 의미를 알 수 없음
	- decode 할 수 있지만, 거의 불가능
	- 각각의 feature를 explore
		- column의 의미지 추측
		- column의 타입 추측
	- Feature의 관계를 explore 
		- Feature간 관계 찾기
		- Feature groups 찾기 
	- ```histogram```을 그려보거나 ```value_counts()```로 빈도 보기
	- Decoding 실습
		- ```feature_importance``` 보고 중요도 파악
		- mean, std 파악
		- 같은 값이 반복되는 것이 보임
		- 아마도 StandardScaler! Decode해보자
		- unique value를 뽑고 sort -> 0.04332159가 반복
		- 모든 값에 0.04332159를 나눈 후, 소수점을 정리

### Visualizations
- Explore individual features
	- Histograms : ```plt.hist()```
		- <img src="https://www.dropbox.com/s/r6ppwc7y8vy8dg4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.28.02.png?raw=1" height="300" width="400"> 
	- Plot (index vs value) : ```plt.plot(x, '.')```, ```plt.scatter(range(len(x)), x, c=y)```, 데이터가 적절히 섞였는지 확인
		- <img src="https://www.dropbox.com/s/7qumsa1htbe77yw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.28.55.png?raw=1" height="300" width="400"> 
		- <img src="https://www.dropbox.com/s/kqpazpcv2ydn19x/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.30.07.png?raw=1" height="300" width="450">
	- Statistics : ```df.describe()```, ```x.mean()```, ```x.var()```
	- Other tools : ```x.value_counts()```,```x.isnull()```
- Explore feature relations
	- Pairs
		- Scatter plots : ```plt.scatter(x1, x2)```, ```pd.scatter_matrix(df)```
			- <img src="https://www.dropbox.com/s/jjje4cxztfyooja/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.32.58.png?raw=1" height="300" width="300">
			- <img src="https://www.dropbox.com/s/0thqha0vmdg8kom/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.35.45.png?raw=1" height="300" width="300"> 
		- Corrplot : ```df.corr()```, ```plt.matshow(...)```
			- <img src="https://www.dropbox.com/s/5kbnm4puey0du0p/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.37.06.png?raw=1" height="300" widht="300">
	- Groups
		- Corrplot + clustering
			- <img src="https://www.dropbox.com/s/97pk7vwfmcaghq9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.41.32.png?raw=1" height="300" width="300"> 
		- Plot (index vs feature statistics) : ```df.mean().plot(style='.')```, ```df.srot_values().plot(style='.')```
			- <img src="https://www.dropbox.com/s/xay165gu1ji6g9w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.41.49.png?raw=1" height="300" widht="300"> 
			- <img src="https://www.dropbox.com/s/lvavqzvi69t5l61/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2020.42.45.png?raw=1" height="300" width="300">

### Dataset cleaning and other things to check
- Duplicated columns
	- 중복되는 column이라면 제거하는 것이 좋음(메모리 관점)
	- ```traintest.T.drop_duplicates()```
- Duplicated rows
	- 같은 label을 가지는지 체크
	- 왜 이 값이 중복인지 이해하기
- Check if dataset is shuffled
	- 만약 셔플되지 않았으면 data leakages를 찾을 수도 있음!
	- ```rolling_mean```과 ```mean``` 비교

## Validation
---

### Validation and overfitting
- private 리더보드가 나오면 성적이 떨어지는 경우가 있습니다
- 2가지 원인
	- 1) 경쟁자가 validation을 무시하고 public 리더보드에서 가장 좋은 제출물을 선택
	- 2) 경쟁자가 public, private 데이터가 일치하지 않거나 private 리더보드에 데이터가 적은 경우  
- private 데이터에 맞게 제출하는 것이 목표!
- Validation
	- Unseen data에도 잘 맞췄으면 좋겠음
	- 잘 맞추지 못한다면 모델의 실수를 측정하고 싶음
	- 이 성능은 Train(past) 데이터와 Test(future) 데이터에 따라 다름
	- 학습한 후, 모델의 성능을 평가하기 위해 validation을 사용
	- Train(past), Validation(past), Test(future)
	- <img src="https://www.dropbox.com/s/ip1yzk7zh9zzw8t/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-20%2015.52.34.png?raw=1">
	- Validation에서 성능이 잘 나온 것을 Best 모델로 하고 계속 튜닝을 하면 오버피팅이 될 수 있음(Test엔 잘 안맞는 모델)
- underfitting and overfitting
	- <img src="https://www.dropbox.com/s/4fzayj743inny9z/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-20%2015.57.11.png?raw=1">
	- 머신러닝의 오버피팅과 대회의 오버피팅은 살짝 다름
	- Overfitting in general != overfitting in competition
	- <img src="https://www.dropbox.com/s/wyydgqosmzuhes5/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-20%2016.03.29.png?raw=1">
	- General
		- capturing noize
		- capturing patterns which do not getneralize to test data
	- Competition
		- low models' quality on test data, which was unexpected due to validation socres  
		- 모델의 복잡도가 높을 경우, 낮추면 당연히 더 좋을 것이라 예상하지만 아닐 경우
	
### Validation strategies
- How many splits should we make
- What are the most foten methods to perform such splits
- Validation 유형
	- Holdout
		- ngroups=1
		- ```sklearn.model_selection.ShuffleSplit``` 
		- Data를 Part A, B로 나눔
		- A로 Train, B로 Predict
		- B의 예측을 토대로 model quality 측정하고 하이퍼파라미터 진행. B의 quality를 최대화
		- Use Case
			- 충분한 데이터를 가지고 있을 때 유용
			- 같은 모델을 다르게 split해서 성능을 보고싶을 경우
		- Split 방식이 성능 추정에 민감한 영향을 미침
	- K-fold
		- <img src="https://www.dropbox.com/s/3dx4qk0rgezr7tx/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-21%2010.14.27.png?raw=1"> 
		- ngroups=k 
		- ```sklearn.model_selection.kfold```
		- Train data를 K folds로 나눔
		- 각 fold마다 iterate: 현재 fold를 제외한 모든 fold에 retrain한 후, 현재 fold로 predict
		- prediction값을 사용해 각 fold별 quality를 계산, 하이퍼 파라미터를 찾고, 각 fold의 quality 최대화
		- loss의 mean과 variance를 측정해 개선을 파악할 수 있음
		- 서로 다른 holdout을 k번 반복
			- 모든 데이터를 training과 test에 쓸 수 있음 
		- Score를 평균
		- 일반화 성능을 만족시키는 최적의 하이퍼 파라미터를 구하기 위한 모델 튜닝에 사용
		- Strtified 방법을 사용해 샘플링하면 알고리즘이 더 개선되곤 함
	- Leave-one-out
		- ngroups=len(train)
		- ```sklearn.model_selection.LeaveOneOut```
		- 작은 데이터를 가지고 있을 때 유용
		- 현재 샘플을 제외한 모든 샘플로 retrain, 현재 샘플로 predict
		- 다른 알고리즘에 비해 실행 시간이 오래 걸림
- Stratification
	- 충분한 sample이 있을 경우 shuffling data로 random split
	- 그러나 sample이 충분하지 않으면 random split은 실패할 수 있음
		- Train시 클래스 비율은 38%, 28%, 34%인데 Valid시 데이터셋은 24%, 44%, 32%라면 불균형 발생 
	- 각 클래스가 train set과 test set에 정확하게 분포되도록 데이터셋을 랜덤하게 나눔
	- 유용한 상황
		- 작은 데이터셋
		- 불균형한 데이터셋
		- Multiclass classification 

### Data splitting strategies
- 1) Random rows in validation
- 2) Time based split
- 3) Differend approached to validation
	- <img src="https://www.dropbox.com/s/tcy9jk7d33un16y/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-21%2011.22.03.png?raw=1">
	- 모델의 목적에 따라 적절한 split이 필요
	- <img src="https://www.dropbox.com/s/lpfoy9rgrhf079y/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-21%2011.27.24.png?raw=1">
		- 파란색 선이 mean value
		- 좌측의 경우 test보다 validation 때 더 나은 score 얻음
		- 우측의 경우 test와 validation와 유사한 score 얻음 
- Summary
	- 다음과 같은 상황에 전략이 다를 수 있음
		- 생성된 feature 사용시
		- 모델이 해당 feature에 의존할 경우
		- target leak일 경우
	- Splitting data into train and validation
		- Random, rowwise
			- Row들이 독립적일 때 유용
			- Row가 사람일 경우 독립적인 Case
			- 가족이거나 같은 회사 동료일 경우, 가족이 하나의 카드를 사용할 경우는 의존적인 Case 
		- Timewise
			- Time based
			- 특정 일 이전의 데이터는 train, 이후의 데이터는 test 
			- Moving window validation
			- <img src="https://www.dropbox.com/s/ev80voci262izn7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-21%2011.40.22.png?raw=1"> 
		- By id  
			- <img src="https://www.dropbox.com/s/gnanuk5q6srxvje/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-21%2011.42.51.png?raw=1">
		- Combined
			- Date + Id, geographic  

### Problems occurring during validation
- 1) Validation stage
	- inconsistency for data
	- example : 1월이 2월보다 명절이 더 있어 판매량이 증가되는 데이터가 있음. 이 경우 1월 데이터로 2월을 예측하면?
	- score와 최적의 파라미터가 다른 이유
		- 너무 적은 데이터 (Too little data)
		- 너무 다양하고 불일치한 데이터 (Too diverse and inconsistent data)
	- Extensive validation
		- 다른 KFold에서 얻은 score를 평균
		- 1 split으로 모델을 만든 후, 나머지로 score 평가   
- 2) Submission stage
	- 우리가 종종 보는 현상 
		- LB score가 validation score보다 일관되게 상승/하락
		- LB score가 valdation score와 관련이 없음
	- Organizer가 split한 것을 분류하는 것은 매우 어려움
		- 계속 제출해보며 기록 
		- leader board 점수를 또다른 validation fold로 보기!
	- Other reasons
		- too little data in public leaderboard
		- 부정확한 train/test split
		- train and test data가 다른 분포 
- LB shuffle
	- 리더보드에서 랭킹이 급상승 또는 급하락할 경우 
	- Randomness
	- Little amount of data
	- Different public/private distributions 
		- Time-series 데이터에서 종종 발생 
- Conclusion
	- validation stage가 크게 다를 경우
		- Average scores form different KFold splits
		- Tune model on one split, evaluate score on the other
	- Submission score가 local validation score와 일치하지 않을 경우
		- Public LB가 너무 작은지 check
		- 오버피팅인지 check
		- 올바른 split 전략을 선택했는지 check
		- train/test의 분포가 다른지 check 
	- LB shuffle의 원인
		- Randomeness
		- 적은 데이터
		- public/private 분포가 다름
- [Advices on validation in a competition](http://www.chioka.in/how-to-select-your-final-models-in-a-kaggle-competitio/)   

## Data leakages
---

### Basic data leaks
- Data leakage : 데이터 유출, 비현실적으로 좋은 결과를 내는 예상하지 못한 정보가 있는 경우
- 현실에선 사용하는 것이 말도 안되지만, 경진 대회에선 높은 점수가 목적이라 사용하기도 함
- 마감 전에 공개하면 대회가 흔들릴 수 있음
- 종류
	- Leaks in time series
		- Future picking
		- 현실에선 우린 미래의 정보를 알 수 없음
		- 대회에선 train/public/private으로 나뉨
		- CTR tasks에서 유저 로그, 날씨 같은 경우 미래의 정보를 포함할 수 있음
	- Unexpected information
		- Meta data
			- 파일 생성일, 이미지 해상도 등
			- 특정 카메라에서 찍은 것이 모두 고양이일 수 있음 
		- Information in IDs
			- 모델에 ID를 넣는 것은 이치에 맞지 않음(이미 target값과 연결되어 있으니)
			- 그러나 언제나 그런 것은 아님 id는 hash의 결과일 수 있음
			- id에 대해 신중히 다루기
		- Row order 	

### Leaderboard probing and examples of rare data leaks
- ID와 밀접하게 연결된 카테고리는 LB probing에 취약함
	- <img src="https://www.dropbox.com/s/6ue6en8vtn70vfe/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-21%2016.10.25.png?raw=1">
	- id가 같은 것의 라벨을 넣고 제출해보고 나온 결과로 역추적 가능
	- Redhat and west nile competition
- Peculiar(이상한) examples
	- Truly Native
		- Data collection, Date proxies가 저장되어 있음. 추가적인 데이터를 수집해 feature 생성
	- Expedia Hotel recommendations
		- 유저가 예약할 호텔 그룹 예측
		- distance feature에 data leak
		- Reverse engineering으로 좌표를 추정
	- Falvours of physics
		- signal이 인위적으로 시뮬레이션됨
		- Reverse engineering
	- Pairwise tasks
		- Data leakge in item frequencies 
		- Similarities from connectivity matrix

### Expedia challenge
- [강의 자료](https://d3c33hcgiwev3.cloudfront.net/_bb08a19dc3abff078b01d8c24411ba8a_leaks_expedia.pdf?Expires=1534982400&Signature=JPTeTjROYTiMEBLhEU0GljfarhmGvkxq~D2sjUUROzzv3QBTWZe9cspbZMHzeVKj2g8GoemqnVlrnVKlOkAUALNfF42uE5hheIe9xhv5cg-K9VIT2jzhGF9Lg~NayW~rFavzY87svXUaerUn3q4sQuhKrrh1fupLX4F0FE8vul0_&Key-Pair-Id=APKAJLTNE6QMUY6HBC5A)
- 강사님이 참여한 대회 중 가장 흥미로운 대회
- Data leakage 썰 풀어줌
- 호텔 그룹으로 라벨링 되었다는 것은 실제 호텔의 특성임을 기억!
- 유저와 호텔의 거리를 통해 추측할 수 있는 것들이 있음! Train과 test에서 많이 매칭됨
	- user city와 destination distance pair
	- 더 많은 match를 찾는 것
	- <img src="https://www.dropbox.com/s/r6398kjk9b8xtwh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-21%2018.58.14.png?raw=1">
	- 유저 도시, 호텔 국가, 호텔 도시 3개의 방정식으로 어느 그룹의 호텔이 몇 개나 있는지를 알 수 있음
	- 리버스 엔지니어링을 하며 모든 도시의 좌표를 반복적으로 찾음
	- 일부 도시는 바다 위에 있는것으로 보였는데, 알고리즘이 정확하지 않다는 것을 의미
	- 3개의 방정식이 아닌 수백 수천개의 방정식과 수만개의 변수를 사용해 정확한 좌표를 얻음
	- 모든 도시에 대해 그리드 셀을 남겨서 개수 count
	- Out-of-fold로 feature generation. 2013<->2014
	- Xgboost로 16시간 학습
	- (그냥 진짜 리버스 엔지니어링으로 철저하게 데이터를 얻음.. 변태처럼 해야 3등하는구나)

## Reference
- [Coursera How to win a data science competition](https://www.coursera.org/learn/competitive-data-science)
- [Competitive-data-science Github](https://github.com/hse-aml/competitive-data-science)