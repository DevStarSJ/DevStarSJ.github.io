---
layout: post
title: "Kaggle 강의 Week3 - Metrics optimization"
subtitle: "Coursera How to win a data science competition 3주차 Metrics optimization"
categories: data
tags: kaggle
comments: true
---

Coursera 강의인 How to Win a Data Science Competition: Learn from Top Kaggler Week3 Metrics optimization를 듣고 정리한 내용입니다  

---

## Metrics optimization
---

- 왜 Metrics은 많은가?
- Competition에서 왜 Metrics에 관심을 가져야 하는가?
- Loss vs metric
- 가장 중요한 metrics
	- 분류와 회귀 Task
	- Regression
		- MSE, RMSE, R-squared
		- MAE
		- (R)MSPE, MAPE
		- (R)MSLE
	- Classification
		- Accuracy, Logloss, AUC
		- Cohoen's (Quadratic weighted) Kappa  
	- metric의 최적화 베이스라인
- metrics의 최적화 테크닉

### Metrics
- 각각의 대회가 metric이 다른 이유는 대회를 주최한 회사가 그들의 특정 문제에 가장 적절한 것을 결정하기 때문
	- 또한 문제마다 다른 metrics 
- Online shop은 effectiveness를 최대화하는 것이 목표
	- Effectiveness를 정의
	- 웹사이트에 방문한 횟수, 주문수로 나눌 수 있음
	- 이런 것을 주최자들이 결정
- 더 나은 점수를 받기 위해 metric을 잘 이해하는 것은 필수

### Regression metrics review 1
- MSE
	- Mean Sqaured Error 
	- $$\frac{1}{N}\sum_{i=1}^{N}(y_{i}-\hat{y_{i}})^{2}$$ 
	- MSE는 우리의 예측값의 평균 squared error를 측정
	- <img src="https://www.dropbox.com/s/thuqgk8f9w84hok/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2011.09.25.png?raw=1">
	- Target value의 mean
	- [참고 자료](http://nbviewer.jupyter.org/gist/DmitryUlyanov/685689cdad7ab2da635605af22cbca6f)
- RMSE
	- Root mean square error
	- $$\sqrt{\frac{1}{N}\sum_{i=1}^{N}(y_{i}-\hat{y_{i}})^{2}}$$ 
- MAE
	- Mean Absolute Error
	- $$\frac{1}{N}\sum_{i=1}^{N}\left|y_{i}-\hat{y_{i}}\right|$$ 
	- <img src="https://www.dropbox.com/s/sfhjp9skzswwqv3/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2011.35.46.png?raw=1">
	- MAE는 finance에서 널리 사용됨
	- Target value의 median
	- Outliear의 영향을 받지 않음(outliear에게 robust)
- MAE vs MSE
	- MAE
		- 아웃라이어가 있는 경우
		- 아웃라이어라고 확신하는 경우
	- MSE
		- 우리가 신경써야 하는 관측하지 못한 값이라고 생각할 경우
- MSE, RMSE, R-squared
	- 최적화 관점에서 같음
- MAE
	- 아웃라이어에 robust    	 

### Regression metrics review 2
- Shop에서 매출을 예측하는 문제
	- Shop1 : predicted 9, sold 10, MSE = 1
	- Shop2 : predicted 999, sold 1000, MSE = 1 
	- Shop1이 더 cirtical한데, MAE와 MSE는 동일함
	- 그래프도 모든 Target value마다 동일(곡선이거나 V이거나)
	- 위 문제점을 해결하기 위해 나온 것이 MSPE, MAPE 
- <img src="https://www.dropbox.com/s/8x4os3ulr5adcyo/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2012.24.43.png?raw=1">
- relative error의 합에, 100%/N을 곱함
- MSE와 MAE의 weight 버전이라고 생각할 수도 있음
- MSPE
	- <img src="https://www.dropbox.com/s/utr29ssmbup3gzu/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2012.39.53.png?raw=1"> 
- MAPE	
	- <img src="https://www.dropbox.com/s/pu1qb9omd1g4gu0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2012.40.35.png?raw=1">
	- [참고 자료](http://nbviewer.jupyter.org/gist/DmitryUlyanov/358a36930e78c33449d0f8caaeee7026)
- RMSLE
	- Root Mean Squared Logarithmic Error
	- <img src="https://www.dropbox.com/s/qeem3qvzld0fuq7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2012.42.55.png?raw=1">
	- MSPE와 MAPE와 동일한 상황에 사용 (relative error)
	- prediction value와 target value가 큰 숫자일 때, 큰 차이를 벌점으로 내고싶지 않을 때 사용
	- 과소평가된 항목에 패널티
	- <img src="https://www.dropbox.com/s/frp4in4c8yxzuk3/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2012.52.47.png?raw=1">
- Conclusion
	- (R)MSPE
		- Weighted version of MSE
	- MAPE
		- Weighted version of MAE
	- (R)MSLE
		- MSE in log space    


### Classification metrics review
- Accuracy
	- 분류기의 성능을 측정할 때 가장 간단히 사용할 수 있음
	- Best constant : predict the most frequent class
	- 데이터셋의 라벨 A가 10%, B가 90%일 때 B로만 예측한 분류기는 90%의 accuracy를 가지는데, 이 분류기는 좋은 것일까?
	- optimize하기 어려움
- Logarithmic loss(logloss)
	- <img src="https://www.dropbox.com/s/69e3a9mn0fmtfpx/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2013.25.07.png?raw=1">
	- logloss가 잘못된 답변에 대해 더 강하게 패널티 부여
	- <img src="https://www.dropbox.com/s/hdbgrb2ouo3zsi8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2013.51.07.png?raw=1">
- Area Under Curve (AUC ROC)
	- Binary task에서만 사용
	- 특정 threshold를 설정
	- 예측의 순서에 의존적이며 절대값엔 의존적이지 않음
	- 설명 가능
		- AUC
			- <img src="https://www.dropbox.com/s/oos0wxyv9zj4jo7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2014.05.11.png?raw=1">
			- <img src="https://www.dropbox.com/s/8s18234ymr6to3r/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2014.05.57.png?raw=1"> 
		- Pairs ordering
			- AUC = # correctly ordered paris / total number of paris = 1 - # incorrectly ordered pairs / total number of pairs
- Cohen's Kappa motivation
	- Baseline accuracy는 라벨의 개수가 제일 많은 것으로 설정
	- Accuracy = 0.9(baseline) -> my_score = 0
	- Accuracy = 1 -> my_score = 1
	- Mse에서 r squared의 역할과 유사
	- 일종의 normalization
	- <img src="https://www.dropbox.com/s/mmyd14yfv21ygb8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2014.22.06.png?raw=1">
	- kappa는 baseline을 $$p_{e}$$로 지정(랜덤하게 계산)
	- Weighted error
		- <img src="https://www.dropbox.com/s/bvwqw7aty7bs1cp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2014.30.20.png?raw=1"> 


### General approaches for metrics optimization
- Loss and metric
	- 동의어 : loss, cost, objective 
- **Target metrics** : 우리가 최적화 하고 싶은 것
	- 그러나 이걸 효율적으로 올리는 방법을 바로 알긴 어려움
- **Optimization loss** : 모델을 최적화 하는 것
	- Target metrics을 직접 최적화하기 어려울 때 사용
- Target metric 최적화 접근 방법
	- 일단 올바른 모델을 실행
		- MSE, Logloss
	- Train을 전처리하고 다른 metric을 최적화
		- MSPE, MAPE, RMSLE
	- 후처리로 예측된 metric 최적화
		- Accuracy, Kappa
	- Custom loss function 
		- 할 수 있으면 언제나!
	- Early stopping을 사용     

### Regression metrics optimization
- RMSE, MSE, R-squared
	- 대부분의 라이브러리에 loss function으로 구현되어 있음
	- L2 loss
	- <img src="https://www.dropbox.com/s/s2kpiwtr8uf840n/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2016.58.44.png?raw=1">
- MAE
	- L1 loss, Median regression
	- <img src="https://www.dropbox.com/s/xrz2yqlr05ahu20/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2017.00.00.png?raw=1">
- MSPE and MAPE
	- 둘 다 Weighted version이기 때문에 쉽게 구현 가능
	- <img src="https://www.dropbox.com/s/7ucho2aj4a04xle/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2017.04.30.png?raw=1">
- RMSLE
	- <img src="https://www.dropbox.com/s/vmnuxo6s8csfijr/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2017.04.59.png?raw=1">

### Classification metrics optimization 1
- Logloss
	- <img src="https://www.dropbox.com/s/9hszkvvytuzjhny/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2017.07.52.png?raw=1">
	- Probability calibration(눈금)
		- Platt scaling
			- 예측값에 Logistic Regression을 fit(마치 stacking처럼)
		- Isotonic regression
			- 예측값에 Isotonic Regression을 fit(마치 stacking처럼)
		- Stacking
			- 예측값에 XGBoost나 neuralnet을 fit  
- Accuracy
	- 이걸 직접적으로 optimize하는 쉬운 방법은 없음
	- 다른 metric을 optimize 

### Classification metrics optimization 2
- AUC
	- Pointwise loss
		- <img src="https://www.dropbox.com/s/ql2s1o0txg48750/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.01.56.png?raw=1">
		- single object에 대한 loss
	- Pairwise loss   	    
		- <img src="https://www.dropbox.com/s/muz4efdrga7ih3v/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.02.13.png?raw=1">
		- pairwise loss
	- <img src="https://www.dropbox.com/s/100wz8pw9adr1bg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.02.26.png?raw=1">
- Quadratic weighted Kappa
	- Optimize MSE and find right thresholds
		- Simple!
	- Custom smooth loss for GBDT or neural nets
		- Harder   
	- <img src="https://www.dropbox.com/s/zdhe8unk6w8bi1u/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.06.15.png?raw=1">
	- [구현 코드](https://hub.coursera-notebooks.org/user/ynvomuepahfsgzmplvnxhw/notebooks/readonly/reading_materials/Metrics_video8_soft_kappa_xgboost.ipynb)

## Reference
- [Coursera How to win a data science competition](https://www.coursera.org/learn/competitive-data-science)
- [Competitive-data-science Github](https://github.com/hse-aml/competitive-data-science)