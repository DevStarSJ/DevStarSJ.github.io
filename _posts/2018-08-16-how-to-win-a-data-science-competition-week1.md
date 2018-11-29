---
layout: post
title: "Coursera Kaggle 강의(How to win a data science competition) 1주차"
subtitle: "Coursera Kaggle 강의(How to win a data science competition) 1주차"
categories: data
tags: kaggle
comments: true
---

Coursera 강의인 How to Win a Data Science Competition: Learn from Top Kaggler Week1을 듣고 정리한 내용입니다  
데이터 경진대회를 처음 접하는 분들에게 추천하고 싶은 강의입니다. 다양한 팁들이 존재하네요! 

---

## Competiton mecahnics
- Competitions' concepts
	- Data
		- csv, text, file, db dump, image 등으로 제공
		- description을 읽어보면 feature 추출시 유용 
	- Model
		- 거대하고 많은 component로 구성된 모델(stacking) 
	- Submission
		- 제출해서 점수 확인 	
	- Evaluation
		- 모델이 좋은지 측정 -> score (Accuracy, Logistic loss, AUC, RMSE, MAE 등) 
	- Leaderboard
		- 리더보드의 랭킹 확인
		- 그러나 이 점수가 최종은 아님
		- 대회중엔 Public Test을 사용하고, 최종 랭킹을 산정할 땐 Private Test를 사용 

### Real World Application vs Competitions
- 현실의 머신러닝 문제는 매우 복잡
	- 비즈니스 문제를 이해
	- 문제를 형식화(formalization)
	- 데이터 수집
	- 데이터 전처리
	- 모델링
	- 모델 평가할 방법 결정
	- Model 배포할 방법 결정
	- 모델 퍼포먼스를 모니터링하고, 새로운 데이터로 재학습 
- 경진 대회는 데이터 수집, 모델링에 초점(나머진 fix됨)
- 결론
	- 현실의 문제가 더 복잡
	- Competition은 배우기 좋은 방법
	- 그러나 문제 형식화, 배포, 테스팅을 하진 않음
- Competition의 철학
	- 알고리즘 자체가 다 해주진 않음
		- 모든 사람들이 고전적인 접근 방식을 튜닝할 수 있음
		- 이기기 위한 인사이트가 필요
	- 가끔은 ML이 필요없음
	- 휴리스틱한 방법, 메뉴얼된 데이터 분석도 OK
	- 복잡한 방법, 심화된 feature engineering, 거대한 연산을 두려워하지 말자! 
	- 창의적으로 접근
		- 존재하는 알고리즘을 바꾸거나 완전 새로운 것을 만들어보는 것도 좋음
		- 다른 사람의 소스를 읽고 바꿔보는 것도 좋음 
- Enjoy! Do your best!

## Recap of main ML algorithms
- Linear
	- <img src="https://www.dropbox.com/s/wtpum7a87l3zuva/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2015.05.38.png?raw=1" height="200" width="200"> 
	- Try to seperate objects with a plane which divides space into two parts 
	- 공간을 2부분으로 나누는 선 찾기
	- example : Logistic Regression, SVM
	- spare high dimensional data일 때 좋음
	- 비선형 문제는 풀지 못함
- Tree-based
	- <img src="https://www.dropbox.com/s/ne29224gt7uc4fd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2015.08.25.png?raw=1" height="200" width="200"> 
	- 공간을 2부분으로 나누는 선 (1개의 class와 그 나머지) 찾기
	- 그 후 나머지를 또 2부분으로 나누는 선 찾기
	- tabular 데이터(표 형태의)에서 좋은 default 방법
	- example : Decision Tree, Random Forest, GBDT, xgboost, LightGBM
- kNN
	- <img src="https://www.dropbox.com/s/rqds0t44kr0jqhv/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-16%2015.11.37.png?raw=1" height="200" width="200"> 
	- 가장 근처에 있는 객체와 같은 라벨을 가짐
	- Missing value를 채울 때, kNN으로 가능 
- Neural Networks
	- 이미지, 사운드, text, 시퀀스 데이터에 좋음 
	- 이 강의에선 다루지 않음
- Conclusion
	- Silver bullet 알고리즘은 없음(=전지전능한 알고리즘은 없다!!!)
	- Linear model들은 2개의 subspace로 나눔
	- Tree-based 방법은 공간을 상자로 나눔
	- k-NN은 "closeness"를 어떻게 측정하는지에 따라 영향을 받음
	- NN은 non-linear한 decision boundary를 스무스하게 해줌
	- 가장 강력한 방법은 Gradient Boosted Decision Trees와 Neural Networks
	- 그러나 다른 방법을 간과하진 말자!
- 참고 자료
	- [Explanation of Random Forest](https://www.datasciencecentral.com/profiles/blogs/random-forests-explained-intuitively)
	- [Explanation/Demonstration of Gradient Boosting](http://arogozhnikov.github.io/2016/06/24/gradient_boosting_explained.html)
	- [Example of kNN](https://www.analyticsvidhya.com/blog/2018/03/introduction-k-neighbours-algorithm-clustering/)


## Software/Hardware requirements
- 대부분의 competition을 풀 수 있는 사양(이미지 제외)
	- CPU 4+ cores, 16+ gb ram 
- 꽤 좋은 사양
	- CPU 6+ cores, 32+ gb ram 
- RAM : 많을수록 좋음
- Core : 많을수록 좋음
- Storage : 작은 조각이 많은 큰 데이터 또는 이미지일 경우 SSD 중요
- Cloud resource
	- AWS : spot instance option!
	- Azure 
	- GCP  
- Software
	- Language
		- Python : Numpy, Pandas, Matplotlib, Scikit-learn
	- IDE 
		- Jupyter
	- Special packages
		- XGBoost, Keras, Light GBM, Catboost
	- External tools
		- [Vowpal Wabbit](https://github.com/JohnLangford/vowpal_wabbit) : 거대한 데이터셋을 핸들링할 때 유용
		- [libfm](https://github.com/srendle/libfm), [libffm](https://github.com/guestwalk/libffm) : sparse한 CTR 데이터를 다룰 때 유용
		- [fast_rgf](https://github.com/baidu/fast_rgf) : 또다른 tree-based 방법
- [Blog "datas-frame" (contains posts about effective Pandas usage)](https://tomaugspurger.github.io/)

## Feature preprocessing and generation with respect to models

### Overview
- 기존에 있는 feature를 토대로 새로운 feature 생성
- Main topics
	- Feature preprocessing
	- Feature generation
	- Their dependence on a model type
- Features : numeric, categorical, ordinal, datetime, coordinates
- Missing values
- Feature type별로 preprocessing과 generation을 다르게 진행

### Numeric features
- Numeric feature : 수치로 표현한 자료
- Non-tree
	- Linear, kNN 모델은 scaling에 따라 결과값이 변함
	- gradient descent 방법은 적절한 scaling이 없으면 미칠 수 있음(Neural net도 동일)
	- Scaling
		- MinMaxScaler : Range가 규정된 경우 사용(RGB), Outlier가 없는 경우 사용
		- StandardScaler : PCA시 사용
		- Outliers
			- lower bound, upper bound를 선정해서 1~99% 데이터만 사용(clip)
		- Rank transformation
			- Outliear가 있다면 MinAxScaler보다 좋은 옵션
			- ```scipy.stats.rankdata```로 사용
			- Test시에도 같은 rank value 적용
		- Log transform : ```np.log(1+x)```, 큰 value를 평균에 가깝도록 만들기 때문에 유용
		- Raising to the power <1 : ```np.sqrt(x +2/3)``` 
		- 하나의 scaling만 사용하지 않고 여러 scaling을 사용해 feature로 추가할 경우 좋을 수 있음
	- Feature generation
		- 사전 지식과 EDA 기반으로 진행 
		- 만들기 쉬운 것부터 생성하고, feature를 더하고 곱하고 빼고 나누고 등등..
	- Binning
		- Fixed binning
		- Adaptive binning
- Tree
	- scaling에 거의 영향을 받지 않음 


### Categorical and ordinal features
- Categorical feature : 수치로 측정이 불가능한 자료, 범주형 변수
- Ordinal feature : 카테고리 데이터처럼 비 연속적이지만 숫자처럼 비교 가능할 경우
- Label encoding
	- Categorical data를 숫자로 변환
	- ```sklearn.preprocessing.LabelEncoder```와 ```Pandas.factorize```로 가능
	- 전자는 알파벳 순 또는 정렬된 순서로 인코딩 후자는 있는 그대로 인코딩
	- 데이터마다 다르지만 ```factorize```가 약 2배정도 빠름 
- Frequence Encoding
	- 빈도별 인코딩 
	- Linear, Tree 모델 모두 도움이 될 수 있음
	- Value의 빈도가 Target과 연관이 있으면 유용
	- Encoding시 같은 빈도를 가지면 Feature로 추가하지 않아도 좋음
- One-hot encoding
	- Tree 모델에선 효율성이 떨어질 수 있음
	- 컬럼이 많아져 학습이 힘들 수 있음(메모리 이슈)
	- spare 매트릭스는 categorical data나 텍스트 데이터에서 종종 유용
	- ```pandas.get_dummies```, ```sklearn.preprocessing.OneHotEncoder``` 

### Datetime and coordinates
- Datetime
	- Periodicity
		- Datetime feature를 week, month, season, year, second, minute, hour, 주말/평일 등으로 나눠서 추가
	- Time since
		- 독립적 기간 : since 1970 1/1
		- 의존적 기간 : 다음 연휴까지 남은 일, 지난 연휴부터 지난 일 
	- Difference between dates
		- datetime_feature_1 - datetime_feature_2
- Coordinates
	- 위도, 경도
	- Tree 모델은 Numerical feautre가 선형성을 띄면 구분하기 힘들 수 있어서 회전을 주고 사용하기도 함
	- 근접한 지역을 추가 feature로 생성 가능
	- 클러스터링에 사용할 수 있음(Center of clusters를 찾음)
	- 지역별 feature(Aggregated stats)

### Handling missing values
- 보통 missing value를 '', -1, 99 등으로 채움
- feature 별로 히스토그램을 그려서 주최측이 missing value를 어떻게 처리했는지 유추할 수 있음
- Fillna approaches
	- -999, -1, etc
		- Tree model 
	- mean, median
		- simple linear model, neural net에 유용 
	- Reconstruct value 
		- "Isnull" feature 
- missing value를 조심스럽게 다뤄야 함. 이 작업에 따라 성능이 달라질 수 있음


## Reference
- [Coursera How to win a data science competition](https://www.coursera.org/learn/competitive-data-science)
- [Competitive-data-science Github](https://github.com/hse-aml/competitive-data-science)