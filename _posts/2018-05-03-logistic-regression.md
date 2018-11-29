---
layout: post
title: "로지스틱 회귀(Logistic Regression)"
subtitle: "로지스틱 회귀(Logistic Regression)"
categories: data
tags: ml
comments: true
---
카이스트 문일철 교수님의 [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 4주차 강의를 보고 정리한 포스팅입니다!

## Logistic Regression
로지스틱 회귀는 SVM 같은 기법들이 나오기 전에 널리 사용되고 연구되었던 방법입니다  

Optimal Classification에서 S커브 모양인 그래프가 더 잘 분류하고 있는 것을 저번 강의에서 배웠습니다. 

<img src="https://www.dropbox.com/s/us9zkjw5idh36pm/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-29%2023.15.21.png?raw=1">

로지스틱 함수가 더 효과적인 것을 설명하기 위해 선형 함수와 비교한 그래프입니다! 좌측 그래프에선 잘 보이지 않아 log를 취해 우측 그래프로 비교하고 있습니다. $$P(Y\mid X)=0.5$$인 부분에 로지스틱 함수와 선형 함수의 Decision Boundary를 결정할 수 있습니다. DB를 기준으로 왼쪽은 0, 오른쪽은 1로 구분되는데 빨간 색인 선형 함수의 경우 Error가 많이 발생합니다

로지스틱 함수는 시그모이드의 특징을 갖추고 있습니다

### Sigmoid Function
- Bounded : 범위가 -1 ~ 1로 제한
- Differentiable : 다양한 변형이 가능
- Real Function : 실제 함수
- Defined for all real inputs : 모든 Input에 정의
- With positive derivative : 증가하는 모양
- 샤프한 posterior 변환을 알아볼 수 있음

### Logistic Function
$$f(x) = \frac{1}{1+e^{-x}}$$

- 성장 곡선에서 자주 사용
- Sigmoid 성질 보유
- Derivation을 쉽게 계산 가능 : 최적화할 때 극점을 통해 계산

### Logit Function(Logistic의 역함수)
$$f(x)=log(\frac{x}{1-x})$$

<img src="https://www.dropbox.com/s/rpbw8i5wnafwvk8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-30%2000.26.03.png?raw=1">


## Logistic Function Fitting
<img src="https://www.dropbox.com/s/jrw0tsu72ogz5tn/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-30%2000.36.58.png?raw=1">

우선 로짓 함수를 Inverse해서 로지스틱 함수로 변환합니다. 로짓의 X는 확률로 표현할 수 있습니다. 그 후, 더 나은 fitting을 위해 Linear shift를 합니다. $$a, b$$값을 조절해 압축, 확장, 이동을 합니다. $$ax+b$$는 선형 함수의 모양이므로 $$X\theta$$로 변환할 수 있습니다.

### Logistic Regression
Logistic Regression은 주어진 데이터를 로지스틱 함수로 모델링하는 것입니다. Binomial 문제뿐만 아니라, Multinomial 문제도 사용할 수 있습니다. 이후 설명에선 편의를 위해 Binomial 문제로 접근하겠습니다!

<img src="https://www.dropbox.com/s/vsxnyg8w7zwzpe1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-01%2009.33.58.png?raw=1">

베르누이 현상이 주어졌을 때, $$\mu(x)$$를 로지스틱 형태로 변경합니다. 위에서 사용된 $$X\theta$$를 이용해 $$P(Y\mid X)$$ 를 구할 수 있습니다.  
X가 주어진 경우(Train Data), Y가 들어옵니다. 이 경우의 $$\theta$$를 구하는 것이 저희의 목표입니다!!

### Maximum Conditional Likelihood Estimation(MCLE)
<img src="https://www.dropbox.com/s/4qq472sgcc28p1w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-03%2010.28.08.png?raw=1">

N : 데이터의 개수! Class Variable에 대해 모델링하며 log를 취해서 곱을 합으로 변경해줍니다. 그 이후 $$\theta$$를 추정하기 위해 P 자체를 풀어놓고 생각하려고 합니다.  
$$P(Y_{i}\mid X_{i};\theta)$$ 를 정의한 후, 밑의 식에 넣어줍니다. 그 이후 $$Y_{i}$$로 묶은 후 log의 특성상 합쳐서 볼 수 있습니다. $$X\theta$$와 유사해서 치환을 해서 정리합니다  

그 결과, $$\theta$$를 로지스틱 function으로 모델링했습니다!

### Finding the Parameter

<img src="https://www.dropbox.com/s/uztl3fr36k5cpa2/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-03%2010.34.53.png?raw=1">

Not Closed Form이라 Approximation을 해야 합니다!

## Gradient Method
Closed Form이 나오지 않아 계속 approximation 하는 작업을 했습니다. 최적의 해를 찾는 방법 중 GRadient Decent/Ascent Method에 대해 정리해보려고 합니다

### Taylor Expansion
<img src="https://www.dropbox.com/s/820cjy9nnfddcbs/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-03%2010.46.34.png?raw=1">

하나의 function에 대한 표현을 뜻하며, infinite sum of terms으로 만들 수 있습니다! 

Taylor 시리즈는 Infinitely differentiable이 가능할 때 사용합니다!

### Gradient Descent/Ascent
<img src="https://www.dropbox.com/s/2fid9bnpv1z0qaz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-03%2010.50.01.png?raw=1">

미분 가능한 함수 $$f(x)$$와 초기값 $$x_{1}$$이 주어졌을 떄, $$f(x)$$에 대해 더 높거나 낮은 값이 되도록 반복적으로 이동시키는 방법입니다!  

이동하기 위해 방향, 속력 2개를 알아야 합니다. 속력이 느리더라도 방향이 맞으면 올바른 값으로 수렴할 수 있지만, 방향이 틀리면 올바르게 수렴하기 어렵기 때문에 방향이 중요합니다!

$$h$$는 속력이고 $$u$$는 방향을 가지는 단위 벡터입니다. 현재 위치에서 $$h$$의 속력으로 $$u$$라는 방향으로 이동합니다. 테일러 확장을 적용할 때 방향인 $$u$$에 대해 잘 정해야 하며, $$hu$$를 최적화한 후 다음 차례의 $$x$$값을 구할 수 있습니다.  값을 줄여 나가면 Gradient Descent, 값을 늘리면 Gradient Ascent로 사용합니다 

<img src="https://www.dropbox.com/s/tgzgila1c0ggz2i/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-03%2011.17.16.png?raw=1">

likelihood라서 argmax! Gradiend Ascent를 적용하며 X가 주어진 조건에서 Y가 나올 확률을 최대화하는 $$\theta$$값을 찾기 위해 $$\theta$$값을 반복적으로 업데이트하며 최적화된 값을 얻습니다

### 선형회귀
<img src="https://www.dropbox.com/s/a6noaolo1ye5737/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-03%2011.20.47.png?raw=1">

선형회귀로 잠시 돌아가면, $$\theta=(X^{T}X)^{-1}X^{T}Y$$도 좋지만, 데이터셋이 커지면 문제가 생기는 단점을 가지고 있습니다. 이 경우 Gradient Descent를 적용하면 최적의 $$\theta$$를 찾을 수 있습니다


## 나이브 베이즈 vs 로지스틱 회귀
나이브 베이즈와 로지스틱 회귀는 Generative-Discriminative Pair입니다! 나이브 베이즈가 미분을 통해 로지스틱 회귀로 변환할 수 있다는 것을 의미합니다

<img src="https://www.dropbox.com/s/aux1x3ytf3nbgzm/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-03%2011.37.45.png?raw=1">

나이브 베이즈의 Categorical 값을 Numerical 값으로 변경해야 합니다. 변경하기 위해 가우시안 분포, 포아송 분포, 베타 분포 등을 사용할 수 있습니다. 강의에선 가우시안 분포를 따른다고 가정하고 진행했습니다

자세한 전개 과정은 [강의](https://youtu.be/5xQJKMRZu80)를 듣는 것을 추천합니다!!

### Generative-Discriminative Pair
- Generaitve Model
	- $$P(Y\mid X) = P(X, Y)/P(X) =P(X\mid Y)P(Y)/P(X)$$
	- 특징 : 베이지안, 사전 확률, 결합 확률(Joint Probability)
	- 나이브 베이즈 분류기
		- 속도가 빠름 
		- 파라미터 수 : $$4d+1$$
- Discriminative Model
	- $$P(Y\mid X)$$
	- 특징 : 조건부 확률
	- 로지스틱 회귀   
		- Bias가 적음
		- 파라미터 수 : $$d+1$$


## 결론
로지스틱 회귀가 일반적으로 성능이 좋지만 나이브 베이즈는 prior 정보를 추가가능한 장점이 있습니다. 따라서 주어진 Data Set과 사전 정보에 따라, 문제 상황에 따라 알고리즘을 취사선택하면 될 것 같습니다

## Reference
- [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 
