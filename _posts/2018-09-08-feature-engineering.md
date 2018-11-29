---
layout: post
title: "Advanced Feature Engineering with Kaggle"
subtitle: "Advanced Feature Engineering with Kaggle"
categories: data
tags: kaggle
comments: true
---

Coursera 강의인 How to Win a Data Science Competition: Learn from Top Kaggler, Feature engineering part1, 2를 듣고 정리한 내용입니다    

- 추천 글 : [Feature Engineering 기본 정리](http://hero4earth.com/blog/learning/2018/01/29/Feature_Engineering_Basic/)
- 변수 타입별 처리, missing value 처리 관련 내용은 [Coursera Kaggle 강의(How to win a data science competition) 1주차](https://zzsza.github.io/data/2018/08/16/how-to-win-a-data-science-competition-week1/) 참고


## Feautre Engineering
- Mean encodings
- Statistics and distance based features
- Matrix factorizations
- Feature Interactions
- t-SNE

---

## Mean encodings
---

- Powerful technique!
- 동의어 : likelihood encoding, target encoding


### Concept of mean encoding
- Mean Encoding
	- Categorical Feature를 기준으로 하여 Target값과 통계적인 연산을 하는 것 
	- Median, Mean, Std, Min, Max 등의 Feature 추가
- Using target to generate features
- <img src="https://www.dropbox.com/s/9yd335yu9qg4ovu/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.35.51.png?raw=1">
	- Moscow는 총 5개가 있고, target에 1인 값이 2개라서 0.4
	- Tver는 총 5개 있고, target에 1인 값이 4개라서 0.8
- 왜 이게 작동하는가?
	- 1) Label encoding은 순서없이 random. target에 대한 correlation이 없음
	- 2) mean encoding은 0부터 1까지로 나뉘어 Target값과 직접적 연관성이 생김
	- <img src="https://www.dropbox.com/s/2tukemvxhwndp5t/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.45.13.png?raw=1">
	- <img src="https://www.dropbox.com/s/qe49sypg7lr2p27/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.54.45.png?raw=1">
	- 짧은 tree여도 더 나은 loss를 얻음
- 사용 예시
	- <img src="https://www.dropbox.com/s/gohmxkm3tdzjifd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.58.28.png?raw=1">
	- Tree depth를 증가시킬 때, 계속해서 점수가 증가하고 validation score도 같이 증가하면(오버피팅이 아니라는 뜻) Tree model이 분할에 대한 정보가 더 필요한 상황! 이럴 때 Mean Encoding이 사용
	- <img src="https://www.dropbox.com/s/b6suevtecrn0qcb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2019.58.55.png?raw=1">
	- <img src="https://www.dropbox.com/s/8r4vxebq7fm0azg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.00.47.png?raw=1">  
		- 오버피팅!
		- 우선 오버피팅을 잘 커버해야 함(정규화 필요)
		- 아래와 같은 데이터여서 오버피팅
		- <img src="https://www.dropbox.com/s/pm0lkdgfxjktjxj/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.02.48.png?raw=1">

### Regularization
- Mean encoding 자체는 유용하지 않을 수 있음. 데이터 정규화 필요
- Regularization
	- Training data에서 CV loop 돌리기
	- Smoothing(카테고리 수를)
	- Random noise 추가
	- Sorting and calculating expanding mean
- CV loop
	- Robust하고 직관적
	- 보통 4-5fold를 진행하면 괜찮은 결과
	- LOO같은 극단적 상황을 조심할 필요가 있음
		- 카테고리 수가 너무 작은 경우엔 오버피팅
	- <img src="https://www.dropbox.com/s/rvfcwp9ozw9bozv/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.13.11.png?raw=1">
	- <img src="https://www.dropbox.com/s/gkfsxt3sgxbjflh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.13.29.png?raw=1">
	- <img src="https://www.dropbox.com/s/6iv50gvhi8r70bf/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.15.29.png?raw=1">
- Smoothing
	- 하이퍼 파라미터 : 알파
		- 보통 알파는 카테고리 사이즈와 동일할 때, 신뢰할 수 있음  
	- <img src="https://www.dropbox.com/s/xjuj2kah7evaipn/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.32.42.png?raw=1">
- Noise
	 - 노이즈가 encoidng의 quality를 저하시킴
	 - 얼마나 noise를 추가해야 할까? 고민해야 해서 불안정하고 잘 사용하기 어려움
	 - 보통 LOO와 함께 사용됨
- Expanding mean
	- 보통의 Mean ecnoding은 각 category 변수에 하나의 값으로 나오지만, expanding mean은 uniform하지 않음
	- leak이 적고 catboost에서 많은 성능 향상을 가져옴 
	- <img src="https://www.dropbox.com/s/rfjc4c1dzegwfzu/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.35.36.png?raw=1"> 


### Extensions and generalizations
- Regression and multiclass
	- Regession엔 median, percentiles, std, distribution bins 등을 추가 (통계적 정보)
	- multiclass엔 클래스만큼 다른 encoding. 각 클래스 encoding마다 다른 정보를 제공해 좋은 결과를 예상
- Many-tomany relations
	- cross product
	- 아래의 예는 APP_id로 나눔
	- <img src="https://www.dropbox.com/s/qd6ofdyjpxn5v1w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2020.58.52.png?raw=1">
- Time series 
	- Limitation
	- Complicated features
	- Rolling 
	- <img src="https://www.dropbox.com/s/pb1sg8feqjgyod7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2021.01.01.png?raw=1">
- Interactions and numerical features
	- Tree의 상호 작용을 분석
	- Tree Model이 Split할 때 feature1과 feature2 처럼되면 서로 상호작용하! 이런 분할이 많을수록 Mean Encoding시 좋음
	- Feature끼리 합하여 Target Mean Encoding 수행 
	- <img src="https://www.dropbox.com/s/agvi4ftz973t01l/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-08-23%2021.03.03.png?raw=1">

## Statistics and distance based features
- 1개의 feature를 group by 해서 다양한 통계값을 계산
- <img src="https://www.dropbox.com/s/u8witrnuiou8v7d/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2019.36.47.png?raw=1">
- <img src="https://www.dropbox.com/s/gpaa7q0lly179au/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2020.41.06.png?raw=1">
- More features
	- How many pages user visited
	- Standard deviation of prices
	- Most visited page
	- Many more..
- Neighbors
	- Explicit group is not needed
	- More flexible
	- 구현하기 힘듬
	- 집의 개수, 평당 평균 가격, 학교/슈퍼/주차장의 개수, 가까운 지하철 역과 거리 

### KNN features in Springleaf
- 모든 변수에 대해 mean encoding
- 모든 포인트에 2000개의 이웃을 찾음(Bray-Curtis metric 사용)
- 그 2000개 이웃으로부터 다양한 feature 계산
- 5, 10, 15, 500, 2000의 Mean target
- 10개의 가까운 이웃과의 Mean distance
- Target 1에 대한 10개의 가까운 이웃과 mean distance
- Target 0에 대한 10개의 가까운 이웃과 mean distance


## Matrix factorizations for Feature Extraction
<img src="https://www.dropbox.com/s/p5e51dovb3yiung/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2020.52.28.png?raw=1">

- 추천 시스템에서 자주 사용하는 matrix factorization으로 feature 생성 가능
- <img src="https://www.dropbox.com/s/hqy9i7y3bdksb4m/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2020.56.26.png?raw=1">
- <img src="https://www.dropbox.com/s/g86ee844frm64d1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.01.00.png?raw=1">
- 위 방법처럼 feature를 혼합해 사용하기도 함
- <img src="https://www.dropbox.com/s/bq0lnkz96s3jxe1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.02.33.png?raw=1">
- <img src="https://www.dropbox.com/s/v8jcixw518mui79/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.02.43.png?raw=1">
- PCA 할 때, 전체 데이터를 concat한 후 진행하기!
- 차원 축소와 feature extraction할 때 유용한 방법
- 현실의 카테고리컬 feature들을 변경하는 방법

## Feature Interactions
- <img src="https://www.dropbox.com/s/ov2kpqr71n301xx/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.21.43.png?raw=1">
- One Hot 인코딩 후, 각 컬럼별로 곱함
- <img src="https://www.dropbox.com/s/t6i7hxedaffr9yo/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.27.54.png?raw=1">
- 곱, 합, 차, 나누기 등을 사용해 상호작용!
- <img src="https://www.dropbox.com/s/2ivy7v4wu40ou58/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.29.51.png?raw=1">
- <img src="https://www.dropbox.com/s/17uf095gw4pdtx2/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.30.41.png?raw=1">
- <img src="https://www.dropbox.com/s/yvzgb9gjo9udjn7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2021.30.50.png?raw=1">

## t-SNE
### Manifold learning methods
<img src="https://www.dropbox.com/s/3sen5xbj8eyj8tb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2023.24.57.png?raw=1">

- 데이터가 갖고 있는 변하지 않는 고유 특성(invariant properties)을 찾는데 사용
- 데이터 본연의 geometric 특성을 유지하며 고차원의 데이터를 저차원의 공간으로 projection
- 관련 내용은 ratsgo님의 [t-SNE](https://ratsgo.github.io/machine%20learning/2017/04/28/tSNE/) 참고
- <img src="https://www.dropbox.com/s/18h6v9e4cgyo4a7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-09-04%2023.34.58.png?raw=1">

## KNN features implementation
- [코드](https://hub.coursera-notebooks.org/user/ynvomuepahfsgzmplvnxhw/notebooks/Programming%20assignment%2C%20week%204%3A%20KNN%20features/compute_KNN_features.ipynb) 참고


## Reference
- [Coursera How to win a data science competition](https://www.coursera.org/learn/competitive-data-science)
- [Competitive-data-science Github](https://github.com/hse-aml/competitive-data-science)
- [Feature Engineering 기본 정리](http://hero4earth.com/blog/learning/2018/01/29/Feature_Engineering_Basic/)
