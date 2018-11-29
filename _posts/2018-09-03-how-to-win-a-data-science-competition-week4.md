---
layout: post
title: "Kaggle 동영상 강의 Week4 - Hyperparameter Optimization"
subtitle: "Coursera How to win a data science competition 4주차 Hyperparameter Optimization"
categories: data
tags: kaggle
comments: true
---

Coursera 강의인 How to Win a Data Science Competition: Learn from Top Kaggler Week4 : Hyperparameter Optimization 부분을 듣고 정리한 내용입니다  


## Hyperparameter Optimization
---

- 이번에 배울 내용
	- Hyperparameter tuning in general 
		- General pipeline
		- Manual and automatic tuning
		- What should we understand about hypterparameters?
	- Model, libraries and hyperparameter optimization
		- Tree-based models
			- GBDT : XGBoost, LightGBM, CatBoost
			- RandomeForest/ExtraTrees 
		- Neural networks
			- Pytorch, Tensorflow, Keras 
		- Linear models
			- SVM, logistic regression
			- Vowpal Wabbit, FTRL
		- Factorization Machines
			- libFM, libFFM
			- 그러나 이 부분은 수업에서 다루진 않지만 자료 찾아보기

### Hyperparameter 튜닝하는 방법  
- 1) 가장 큰 영향력을 가진 파라미터를 선택
	- 모든 파라미터를 튜닝할 순 없음
- 2) 파라미터가 정확히 training에 어떤 영향을 미치는지 이해하기
	- 이 파라미터가 변하면 어떤 일이 일어나는가?
- 3) Tune them!
	- a. Manually (change and examine)
	- b. Automatically (hyperopt, etc..)
		- Hyperopt
		- Scikit-optimize
		- Spearmint
		- GPyOpt
		- RoBO
		- SMAC3    

	```
	def xgb_score(param):
		# run XGBoost with parameters 'param'
		
	def xgb_hyperopt():
		 space = {
		 		'eta' : 0.01,
		 		'max_depth' : hp.quniform('max_depth', 10, 30, 1),
		 		'min_child_weight' : hp.quniform('min_child_weight', 0, 100, 1),
		 		'subsample' : hp.quniform('subsample', 0.1, 1.0, 0.1),
		 		'gamma' : hp.quniform('gamma', 0.0, 30, 0.5),
		 		'colsample_bytree' : hp.quniform('colsample_bytree', 0.1, 1.0, 0.1),
		 		
		 		'objective':'reg:linear',
		 		
		 		
		 		'nthread' : 28,
		 		'silent' : 1,
		 		'num_round' : 2500,
		 		'seed' : 2441,
		 		'early_stopping_rounds' : 100
		 }
		 
	best = fmin(xgb_score, space, algo=tpe.suggest, max_evals=1000)
	```

- Color-coding legend
	- Underfitting (bad)
	- Good fit and generalization (good)
	- Overfitting (bad)
- 파라미터의 2 종류
	- red
		- 파라미터 증가시 fitting을 방해 
		- 파라미터 증가시 오버피팅을 감소
		- 파라미터 증가시 모델의 자유를 감소
		- 제약 조건이 많아지며 오버피팅에서 언더피팅으로 모델을 바꿈
	- green 
		- 파라미터 증가시 train set에 더 나은 fit
		- 모델이 underfit이면 파라미터를 증가
		- 모델이 overfit이면 파라미터를 감소
		- 언더피팅에서 오버피팅으로 모델을 바꿀 수 있음
		- green 파라미터를 더 사용 
		

### Tree-based models
- GBDT
	- XGBoost
	- LightGBM
	- CatBoost : 이건 따로 공부해보기
- RandomForest, ExtraTrees
	- scikit-learn
- Others
	- RGF(baidu) : Regulized Greedy Forest
		- 그러나 아직 사용하기 어렵고 느림
		- 작은 데이터에 시도해보기
- GBDT   
	- <img src="https://www.dropbox.com/s/vtisxnsngeon5dg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-02%2023.03.48.png?raw=1">
	- 두 모델 모두 Tree를 생성한 후, given objective를 최적화
	- ```max_depth``` : Tree의 최대 depth, 증가할수록 train set에 더 빠르게 fit, 처음엔 7로 두고 해보기!
	- (lightGBM) ```num_leaves``` : Tree가 매우 깊을 경우 이걸 조정하면 좋을 수 있음
	- ```subsample``` : 일종의 정규화를 도와줌
	- ```colsample_bytree, colsample_bylevel``` : 만약 모델이 오버피팅같으면 이 값을 줄이면 됨
	- ```min_child_weight``` : 이걸 증가하면 모델이 보수적이 됨, 가장 중요한 파라미터 중 하나. 데이터에 따라 다르지만, 넓게 범위를 잡는 것을 두려워하지 말기!
	- ```eta``` : gradient descent 같은 필수적인 learning weight
	- ```num_rounds``` : 얼마나 learning step을 수행할 것인가(=얼마나 트리를 만들 것인가)
- sklearn.RandomForest/ExtraTrees
	- <img src="https://www.dropbox.com/s/ien3r5alho0dtqu/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-02%2023.25.05.png?raw=1"> 
	- ExtraTrees는 Randomfrest의 더 랜덤한 버전. 파라미터는 동일
	- ```N_estimators``` : 트리 개수. 처음엔 이 값을 작은 값부터 큰 값까지 설정한 후, accuracy를 측정! 그래프를 통해 추론. 보통 50?
	- ```max_depth``` : xgboost와 다르게 none 설정 가능(unlimited depth) 보통 7부터 시작 추천
	- ```min_samples_leaf``` : 정규화, min_child_weight와 유사
	- ```criterion``` : 지니 또는 엔트로피

### Neural net models
- Framework
	- Keras, Tensorflow, MxNet, PyTorch
	- Keras, PyTorch 추천
	- 여기선 Dense layer 이야기만 함(fully connected layer로 연결된)
	- <img src="https://www.dropbox.com/s/ugum6zpdkon4ow1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-02%2023.57.04.png?raw=1"> 
	- simple 레이어로 시작하기!
	- Optimizers : SGD + momentum이 빠르게 수렴하긴 하지만 오버피팅일 수 있음
	- Batch size : 32 또는 64로 시작
	- Regularization : Dropout을 각 레이어의 마지막에 추가하거나 네트워크의 끝쪽에 추가
	- Static dropconnect 
		- 첫 hidden layer를 굉장히 큰 units으로 구성
		- 정규화하기 위해 랜덤하게 99%를 drop

### Linear modesl
- Scikit-learn
	- SVC/SVR
		- Sklearn이 libLinear와 libSVM을 랩핑
		- 멀티코어를 사용하려면 직접 컴파일 
	- LogisticRegression/LinearRegression + regularizers
	- SGDClassifier/SGDRegressor
- Vowpal Wabbit
	- FTRL 
- <img src="https://www.dropbox.com/s/rlr8lyw42hljwgd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-03%2000.44.47.png?raw=1">
	- SVC에서 C를 천천히 상승 
	- L1은 feature selection할 때 사용
	- L1/L2/L1+L2는 각각 모두 시도 

### Tips
- 하이퍼파라미터 튜닝에 너무 많은 시간을 쏟지 말기
	- 더 이상 아이디어가 없거나 여분의 계산 리소스가 있는 경우에만 시도하기
- 참고 견디자
	- GBDT 또는 신경망을 수천번 돌려야 할 수도 있음
- 모든 것을 평균
	- 파라미터도 평균!

### 참고 자료
- [Tuning the hyper-parameters of an estimator (sklearn)](http://scikit-learn.org/stable/modules/grid_search.html)
- [Optimizing hyperparams with hyperopt](http://fastml.com/optimizing-hyperparams-with-hyperopt/)
- [Complete Guide to Parameter Tuning in Gradient Boosting (GBM) in Python](https://www.analyticsvidhya.com/blog/2016/02/complete-guide-parameter-tuning-gradient-boosting-gbm-python/)	


## Reference
- [Coursera How to win a data science competition](https://www.coursera.org/learn/competitive-data-science)
- [Competitive-data-science Github](https://github.com/hse-aml/competitive-data-science)