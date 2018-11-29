---
layout: post
title: "나이브 베이즈 분류기(Naive Bayes Classifier)"
subtitle: "나이브 베이즈 분류기(Naive Bayes Classifier)"
categories: data
tags: ml
comments: true
---
카이스트 문일철 교수님의 [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 3주차 강의를 보고 정리한 포스팅입니다!

## Optimal Classification
- 나이브 베이즈 분류기를 배우기 위해서 먼저 Optimal Classification에 대해 알아야 합니다

<img src="https://www.dropbox.com/s/on9o28jpicgq5oz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-19%2023.40.52.png?raw=1">

위 그래프는 Y Class가 초록색일 경우와 빨간색일 경우를 분류하는 분류기의 모습을 보여줍니다. 즉, 주어진 조건 X에 대한 확률 Y로 나타납니다. X가 왼쪽 부분이라면 초록색일 확률이 높으며 X가 우측 부분이면 빨간색일 확률이 높다고 판단합니다. 이것을 식으로 나타내면 주어진 조건 X에서 Y값이 최대가 되는 확률 분포 함수가 Optimal Classification입니다

<img src="https://www.dropbox.com/s/9ndtc7i5ck90zbh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-20%2000.03.36.png?raw=1">

위 그림은 처음에 봤던 실선 분류기와 직선(점선) 분류기가 같이 있는 그래프입니다. Decision Boundary를 기준으로 좌측에 있을 경우엔 초록색으로 분류되어야 합니다. 이 경우 빨간색일 확률값들은 Error가 됩니다   

여기서 Bayes Risk가 나타납니다. Error의 면적에 대한 함수를 뜻하며, $$R(f^{*})$$로 표기합니다. 결국 주어진 X값에 대해 Error가 낮은 분류기를 찾는 것이 Optimal Classification입니다. 선형 그래프는 Bayes Risk의 큰 차이를 갖지 않고, 실선 그래프는 상대적으로 큽니다. 따라서 실선으로 모델링하며, error도 실선이 낮습니다

Bayes Classifier를 식으로 표현하면,

$$f^{*}=argmin_{f}P(f(x)\neq Y)$$  
여기서 $$f(x)\to\hat{y}$$

error을 최소화하기 위해 function approximation을 합니다.  
Y의 클래스가 2개라고 가정하면

$$f^{*}(x) = argmax_{Y=y}P(Y=y\mid X=x)$$  

참고로, 2개의 클래스라면 argmax도 성립되며 given random variable을 switch하기 위해 베이즈 이론을 사용하겠습니다

$$argmax_{Y=y}P(X=x\mid Y=y)P(Y=y)$$

Class Prior인 $$P(Y=y)$$는 MLE, MAP로 구할 수 있습니다  
Likfelihood(Class Conditional Density)인 $$P(X=x\mid Y=y)$$도 쉽게 계산할 수 있습니다

Optimal Classifier는 조건이 1개라면 문제가 되지 않지만, 조건이 많아지면 그 조합(Combination)만큼 문제가 될 수 있습니다. 이것은 나이브 베이즈 분류기가 해결합니다

## Naive Bayes Classifier
위에서 나온 Optimal Classification의 $$argmax_{Y=y}P(X=x\mid Y=y)P(Y=y)$$를 계산하려고 하면 몇 개의 파라미터가 필요할까요?

$$P(Y=y)$$ for all y : $$k-1$$개가 필요합니다. T를 알면 F를 알 수 있는 것처럼!  
$$P(X=x\mid Y=y)$$는 $$(2^{d}-1)k$$개가 필요합니다. 이 파라미터는 너무 많아서 joint를 모두 해결하기 힘들어집니다

$$x$$는 vector value며 vector의 길이는 $$d$$로 표현합니다. d를 줄이면 가능하긴 하지만, d를 줄이지 않는 방법은 어떻게 해야할까요? 이것을 나이브 베이즈 분류기가 특정한 가정을 추가해 해결합니다

### Conditional Independence
Conditional Independence(조건부 독립)을 적용합니다. 각각의 X 변수들이 서로 영향을 미치지 않는 독립적인 관계임을 가정합니다. 

독립적일 경우 아래와 같이 표시합니다

$$P(x,y) = P(x)P(y)$$

y가 주어졌으면 x끼리 independence합니다! 라는 순진한(Naive) 가정을 합니다. 이를 통해 파라미터 개수를 줄일 수 있습니다

추가적으로 $$P(x_{1}\mid x_{2},y)=P(x_{1}\mid y)$$하면 $$x_{1}$$와 $$x_{2}$$는 independence!

$$P(x_{1}, x_{2}\mid y)=P(x_{1}\mid y)P(x_{2}\mid y)$$


### Conditional vs Marginal Independence

<img src="https://www.dropbox.com/s/huxo7u60vdnrt67/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-20%2001.40.21.png?raw=1">

위 이미지에서 Commander가 Go라고 명령했을 때 Officer A와 B의 상태를 보여줍니다

A가 명령에 대해 모를 경우 B가 움직이는 것을 보고 A가 "Commander가 움직이라 했나보다"라고 생각하는데, 이것은 Commander에 대한 정보가 없을 때, B의 정보가 A에게 영향을 주는 것을 뜻합니다! 즉, Independence가 아닙니다


반면 A가 Commander의 말을 들었다면 B가 움직이던 말던 전혀 A에게 도움이 되지 않습니다. 즉, Marginal Indepedence는 인스턴스간 성립되지 않아도 Conditional Independence는 정의될 수 있습니다


### 다시 돌아와서 조건부 독립을 적용하면

$$f^{*}(x)= argmax_{Y=y}P(X=x\mid Y=y)P(Y=y)$$

$$\approx argmax_{Y=y}P(Y=y)\prod_{1\le i\le d}P(X_{i}=x_{i}\mid Y=y)$$

$$P(X_{i}=x_{i}\mid Y=y)$$는 이제 $$(2-1)dk$$개의 파라미터가 필요합니다. (1개를 알면 조건부 독립에 의해 다른 1개를 유추할 수 있습니다)

결론적으로 아래와 같이 정리할 수 있습니다

<img src="https://www.dropbox.com/s/koylcd73cavdnu3/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-20%2002.00.43.png?raw=1">

## Problem of Naive Bayes Classifier
- Naive Assumption
	- 현실의 변수들은 대부분 서로 상관관계를 가지고 있습니다. 나이브 베이즈 분류기는 이런 현실을 올바로 반영하지 못합니다 
	- Logistic Regression은 이런 문제를 없애려고 합니다
- Incorrect Probability Estimations
	- MLE를 사용해 확률값을 구한다면 관측을 하지 못한 경우는 Estimation을 할 수 없습니다. 따라서 MAP를 사용해 개별 확률값을 구해줘야 합니다
	- 이것은 항상 있는 문제!

## Text Mining에 적용한 나이브 베이즈 분류기
bag of words를 이용해 텍스트를 수치로 변경합니다  
그 이후 수식을 기반으로 구하는 과정으로 강의를 진행하고 있습니다  

단, 확률값을 계속 곱하기보다 수식에 log를 씌우면 곱셈이 덧셈이 되기 때문에 구현할 경우 많이 log를 씌우곤 합니다! 구현 TIP이니 알아두도록 합시다!

나이브 베이즈 분류기를 직접 만들어보는 것을 작은 과제로 설정!

## Reference
- [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 
