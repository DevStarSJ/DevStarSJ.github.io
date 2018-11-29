---
layout: post
title: "규칙 기반(Rule-Based) Machine Learning 기초"
subtitle: "규칙 기반(Rule-Based) Machine Learning 기초"
categories: data
tags: ml
comments: true
---
카이스트 문일철 교수님의 [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 2주차 강의를 보고 정리한 포스팅입니다!

## Machine Learning
- 경험(experience)에 의해 학습(learning)
- Task에 대해 점점 더 잘 실행되도록!
- 많은 경험이 있다면 더욱 잘 될 것입니다(=데이터가 많아지면!)

## Example Task
- EnjoySPT를 예측하는 Task

| Sky   | Temp | Humid  | Wind   | Water | Forest | EnjoySPT |
|-------|------|--------|--------|-------|--------|----------|
| Sunny | Warm | Normal | Strong | Warm  | Same   | Yes      |
| Rainy | Cold | High   | Strong | Warm  | Change | No       |

### 가정
- 우리는 ```Perfect World```에 살고 있습니다
	- 관측의 error는 없고, 일관적이지 않은 관측도 없습니다(=일관적이다)
	- random effect가 없습니다
	- 해당 factor로 상황을 완벽히 설명할 수 있습니다

### Function Approximation
- Task를 잘 소화할 수 있는 함수를 만들어야 합니다!
- Instance, X
	- Feature(Input) : Sunny, Warm, Normal, Strong, Warm, Same
	- Label(Y) : Yes
- Training Dataset, D : 인스턴스의 관측값 모음들
- Hypothesis, H
	- $$h_{i}$$ : \<sunny, warm, ?, ?, ?, Same\> -> Yes!
	- < >의 조건이면 Y다!  
	- 가정의 개수는 64+@(don't care)
- Target Function, C : 알지 못하지만 목표로 하는 함수(데이터를 보고 알아내야 합니다)

다음과 같은 가설 $$h_{1}, h_{2}, h_{3}$$ 3개와 관측값 $$x_{1}, x_{2}, x_{3}$$이 있습니다

$$h_{1}$$ : \<Sunny, ?, ?, ?, Warm, ?\>  
$$h_{2}$$ : \<Sunny, ?, ?, ?, Warm, Same\>  
$$h_{3}$$ : \<Sunny, ?, ?, Strong, Warm, ?\>  

$$x_{1}$$ : \<Sunny, Warm, Normal, Strong, Warm, Same\>  
$$x_{2}$$ : \<Sunny, Warm, Normal, Light, Warm, Same\>  
$$x_{3}$$ : \<Sunny, Warm, Normal, Strong, Warm, Change\>


$$x_{1}$$은 가설 $$h_{1}, h_{2}, h_{3}$$에 모두 맞지만, $$x_{2}$$는 가설 $$h_{3}$$에 맞지 않습니다. $$h_{1}$$는 널널한 가설이며 $$h_{3}$$는 까다로운 가설입니다

이것은 Generalization vs Specialization 문제와 연결됩니다


### Find S 알고리즘
간단한 Find S 알고리즘을 다음과 같이 정의하겠습니다

```
For instance x in D
  if x is positive
    for feature f in O
      if f_{i} in h == f_{i} in x
        Do nothing
      Else
        f_{i} in h = f_{i} in h U f_{i} in x
return h				
```
조금 더 쉽게 설명하면, 첫 가설은 Null Hypotheses로 만듭니다.  
$$h_{0}= <\phi, \phi, \phi, \phi, \phi, \phi> $$  
$$x_{1}$$ : \<Sunny, Warm, Normal, Strong, Warm, Same\> 가 들어오면, Else문으로 가게 되서 아래와 같이 가설이 변경됩니다  
$$h_{1}$$ : \<Sunny, Warm, Normal, Strong, Warm, Same\>  
$$x_{2}$$ : \<Sunny, Warm, Normal, Light, Warm, Same\>가 들어오면 새로운 경험을 받습니다. Strong해도 나가 노는구나! Strong U Light => ?로 변환됩니다  
$$h_{2}$$ : \<Sunny, Warm, Normal, ?, Warm, Same\>  

이런 방법으로 가능한 범위(Version Space)를 찾아갑니다! General Boundary와 Specific Boundary 이 사이에 있는 공간을 찾습니다

### Candidate Elimination Algorithm
- Version Space를 구하기 위해 위 알고리즘을 적용합니다
- 가장 maximally specific, 가장 general한 가설 사이에서 점점 좁혀가는 알고리즘입니다

```
For instance x in D
  If y of x is positive
    Generalize S as much as needed to cover o in x
    Remove any h in G, for which h(o)!=y
  If y of x is negative
    Specialize G as much as needed to exclude o in x
    Remove any h in S, for which h(o)=y 
```

- 위와 같은 방법은 Perfect World에선 사용 가능하지만, 현실에선 사용하기 어렵습니다
	- noise가 존재
	- decision factor가 존재 가능
- 룰베이스 기반으론 현실을 반영하기 어렵습니다 
- 위 사항을 해결하기 위해 나온 것 중 하나가 ```의사결정 나무(Decision Tree)```입니다!

### Entropy
- Entropy를 이해해야 Decision Tree를 더 잘 이해할 수 있습니다
- Entropy 
	- 어떤 attribute를 더 잘 check 할 수 있을지 알려주는 지표
	- 불확실성(uncertainty)를 줄여야 합니다!(=높은 entropy)
- 주어진 상황을 특정 분포로 만들어진 random variable로 판단할 수 있습니다

$$ H[X] = -\sum_{x}P(X=x) \log_{b} P(X=x) $$

#### Conditional Entropy
- 특정 feature variable이 주어졌을 때의 Entropy
- 주어진 x에 대해 y의 entropy를 구하는 형태

$$ H(Y\mid X) = -\sum_{x}P(X=x)H(Y\mid X=x)$$  

$$ = -\sum_{x}P(X=x)\{-\sum_{y}P(Y=y\mid X=x)log_{b}P(Y=y\mid X=x)\}$$


### Information Gain

|      <-         | A1<br>(307+, 383-) |   ->        | <-  | A9<br>(307+, 393-) |      ->        |
|---------------|-----------------|-----------|---|-----------------|---------------|
| a<br>(98+, 112-) | b<br>(206+, 262-)  | ?<br>(3+,9-) |   | t<br>(284+,77-)    | f<br>(23+, 306-) |

$$ H(Y) = -\sum_{y\in\{+,-\}}P(Y=y) \log_{2} P(Y=y)$$

$$P(Y=t) =\frac{307}{307+383}$$  

$$ H(Y\mid A1) = \sum_{X\in\{a,b,?\}}\sum_{Y\in\{+,-\}}P(A1 = x, Y=y)\log_{2}\frac{P(A9=X)}{P(A9=X, Y=Y)}$$  

$$IG(Y,A_{i}) = H(Y) - H(Y\mid A_{i})$$

- 특정 condition $$A_{i}$$ 조건이 주어졌을 때의 정보 이득의 양
- 앞의 사례에선 A9가 IG이 높습니다
	- 따라서 A9를 root로 만들고 분리된 케이스에서 또 IG를 구하는 방시긍로 트리를 확장합니다

#### Decision Tree를 만드는 Algorithm
- ID3, C4.5, CART 등 다양하게 있는데, 여기선 ID3만 설명하겠습니다
	- initial open node 생성
	- 채울 open node 선택
	- IG를 활용해 best variable 선택(T 또는 F)
	- 인스턴스를 정렬해 브런치에 넣어줌
	- class와 label이 동일할 경우 종료 	

#### Problem of Decision Tree
- 디테일한 트리를 만들 경우엔 현재 데이터는 100% 맞을 수 있지만, 새로운 데이터는 예측을 못할 수 있습니다
- 앞에서도 말했듯이 현실은 noise, inconsistencies를 가지고 있기 때문에 앞으로 올 데이터는 못 맞출 수 있습니다

### Linear Regression
- 이번엔 통계적 기반의 방식을 사용해보겠습니다
- housing dataset
	- 13 numerical independent values
	- 1 numerical dependent value
- linear한 function으로 approximation 하는 것이 머신러닝에서 바라본 linear regression
- hypothesis를 function의 형태로 정의해보겠습니다

$$h:\hat f(x; \theta) = \theta_{0} + \sum_{i=1}^{n}\theta_{i}x_{i} = \sum_{i=0}^{n}\theta_{i}x_{i}$$  

- $$n$$ = feature values의 개수
- linear는 건들지 말고, $$\theta$$를 잘 정의해보는 것이 목표!

$$\hat f = X\theta$$  

$$X = \begin{bmatrix} 1 & \cdots & x_{n}^{1} \\ \vdots & \ddots & \vdots \\
1 & \cdots & x_{n}^{D} \end{bmatrix}$$, $$\theta = \begin{bmatrix}
\theta_0 \\
\theta_1 \\
\cdots \\
\theta_n 
\end{bmatrix}
$$

현실의 noise를 반영하면,

$$f(x; \theta) = \sum_{i=0}^{n}\theta_{i}x_{i}+e = y \to f=X\theta+e=Y$$ 

이제 $$\theta$$를 추정하기 위해 식을 작성해보겠습니다

$$\hat\theta=argmin_{\theta}(f-\hat f)^{2} = argmin_{\theta}(Y-X\theta)^2$$  

$$argmin_{\theta}(Y-X\theta)^{T}(Y-X\theta) = argmin_{\theta}(Y-X\theta)^{T}(Y-X\theta)$$  

$$argmin_{\theta}(\theta^{T}X^{T}X\theta-2\theta^{T}X^{T}Y+Y^{T}Y) = argmin_{\theta}(\theta^{T}X^{T}X\theta-2\theta^{T}X^{T}Y)$$

$$\triangledown_{\theta}(\theta^{T}X^{T}X\theta-2\theta^{T}X^{T}Y) = 0$$  

$$2X^{T}X\theta-2X^{T}Y=0$$  

$$\theta = (X^{T}X)^{-1}X^{T}Y$$

현재 함수는 linear하기 때문에, 데이터의 끝 부분을 제대로 표현하지 못하고 있습니다. 이를 위해 x를 $$\phi$$라는 함수를 거쳐 새로운 벡터를 만든 후, 이 벡터를 사용해 $$\theta$$를 구해볼 것입니다.

$$x^2$$, $$x^3$$, $$x^4$$를 계속 추가해서 만들면 non-linear한 형태가 나타납니다. 하지만 이렇게 끝 부분이 잘 맞는 것이 옳은 것일까요? 관측치가 1개뿐인데 이것을 맞추는 것이 옳을까? 나중에 이에 대한 답을 고민해 볼 예정입니다

## Reference
- [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 
