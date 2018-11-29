---
layout: post
title: "Stanford CS231n 6강. Training Neural Networks-1"
subtitle: "Stanford CS231n Lecture 6. Training Neural Networks-1"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)를 요약한 포스팅입니다. 정보 전달보다 자신을 위한 정리 목적이 강한 글입니다! :)

# Today Overview
- 1) One time setup
	- activation functions, preprocessing, weight initialization, regularization, gradient checking
- 2) Training dynamics
	- babysitting the learning process, parameter updates, hyperparameter optimization 
- 3) Evaluations
	- model ensembles 


## Activation functions
<img src="https://www.dropbox.com/s/6fatms7uxzrwhim/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-17%2021.14.27.png?raw=1">

### Sigmoid
- $$\sigma (x) = 1/(1+e^{-x})$$
- Squashes numbers to range [0, 1]
- Historically popular since they have nice  interpretation(해석) as a saturating "firing rate" of a neuron
	- saturated : activation value가 극단적 값만 가지게 되는 경우
- 3가지 문제점
	- 1) Saturated neurons "kill" the gradients(Vanish Gradient)
		- <img src="https://www.dropbox.com/s/v7axdjlbf1wu4x3/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-17%2021.27.09.png?raw=1">
		- x가 -10, 10일 경우엔 gradients가 0
		- Chain Rule에 의해 gradient를 구할 때 "곱" 연산을 지속적으로 하면 gradient는 점점 0이 됩니다
	- 2) Sigmoid outputs are not zero-centered
		- <img src="https://www.dropbox.com/s/vpn70gyepj1g1ef/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-17%2021.29.03.png?raw=1">
		- input은 항상 positive(x>0)
		- output도 positive. 이 경우 w의 gradients는?
			- Q) If all of X is positive?
			- A) Always all positive or all negative
		- w에 대한 gradient를 좌표평면에 표현하면 gradient 벡터는 1,3사분면으로 나옵니다. 이상적인 움직임은 파란색이지만, 원하는 곳으로 가기 위해선 지그재그로(빨간색) 움직여야 합니다. 이 경우 수렴속도가 늦어지는 비효율을 낳게 됩니다
	- 3) exp() is a bit compute expensive


### Tanh
- Squashes numbers to range [-1, 1]
- zero centered (nice)
- still kills gradients when saturated(bad)

### ReLU
- Rectified Linear Unit
- Computes  $$f(x) = max(0, x)$$
- Does not saturate (in +region)
- Very computationally efficient(exp이 없어서)
- Converges(수렴하다) much faster than sigmoid/tanh in practice(eg 6x)
- Actually more biologically plausible than sigmoid(sigmoid보다 뉴런의 작용을 잘 반영)
- 2012, AlexNet에서 처음 사용
- 문제점
	- Not zero-centered output
	- An annoyance(0보다 작은 부분의 gradient는 0이 됨. 10~20%가 dead ReLU)
- people like to initialize ReLU neurons with slightly positive biases(e.g. 0.01)
- 0일때 그라디언트 체크

### Leaky ReLU
- $$f(x) = max(0.01x, x)$$
- x가 음수면 gradient가 무조건 0이 되는 단점을 극복하기 위해 고안
- 장점
	- Does not saturate (in +region)
	- Very computationally efficient(exp이 없어서)
	- Converges(모여들다) much faster than sigmoid/tanh in practice(eg 6x)
	- **will not die**

### PReLU(Parametric ReLU)
- $$f(x) = max(\alpha x, x)$$
- backprop into alpha(parameter)
- little bit more flextibility

### ELU(Exponential Linear Units)
- $$f(n) =
\begin{cases}
x, & \text{if } x > 0 \\
\alpha(exp(x)-1) & \text{if } x < 0
\end{cases}$$
- 장점
	- ReLU의 모든 장점
	- Closer to zero mean outputs
	- Negative saturation regime compared with Leaky ReLU adds some robustness to noise
- 단점
	- exp() 연산 사용  

### SeLU
- 강의에선 다루지 않았으나, 일단 적어둠
- 추후 내용 추가하기

### Maxout "Neuron"
- Does not have the basic form of dot product ->
nonlinearity
- nonlinearity : $$f(x+y) = f(x) + f(y), cf(x), f(cx)$$ 만족
	- 선형을 쓰면 레이어를 쌓는 의미가 없음(단지 이동일 뿐임) 
- 연결된 두 개의 뉴런 값 중 큰 값을 취하고 비선형성을 확보. 단, 활성화 함수를 적용하기 위해 필요한 연산량이 많음
- 장점
	- Generalizes ReLU and Leaky ReLU
	- Linear Regime! Does not saturate! Does not die!
- $$max(w_{1}^{T}x+b_{1}, w_{2}^{T}x+b_{2})$$
- 문제점
	- doubles the number of parameters/neuron 

### In practice
- Use ReLU. Be careful with your learning rates
- Try out Leaky ReLU / Maxout / ELU
- Try out tanh but don’t expect much
- Don’t use sigmoid

## Data Preprocessing
- [cs 231 번역 참고](http://aikorea.org/cs231n/neural-networks-2-kr/) 

<img src="https://www.dropbox.com/s/cj9drfw34z2q1ye/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2011.30.42.png?raw=1">

- zero-centered data
	- Feature에 대해 평균값만큼 차감하는 방법 
- normalized data
	- 각 차원의 데이터가 동일한 범위내의 값을 갖도록 하는 방법 
	- 이미지 처리에선 보통 하지 않음(scale이 달라지면 다른 feature)

<img src="https://www.dropbox.com/s/k2d1zitwrdv2gwd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2011.34.58.png?raw=1">

- 머신러닝 관점에선
	- PCA
	- Whitening
		- input의 feature들을 uncorrelated하게 만들고, 각각의 variance를 1로 만들어줌
		- [위키피디아](https://en.wikipedia.org/wiki/Whitening_transformation) 

### Summary
- 이미지에선 일반적으로 zero mean preprocessing(center)만 진행
- Subtract the mean image(AlexNet)
- Subtract per-channel mean(VGGNet) : RGB
- Not common to normalize variance, to do PCA or whitening
- Train에서 진행한 작업을 Test에서도 진행

## Weight Initialization
- Q) What happens when W=0 init is used?
- A) They will all do the same thing -> same gradient -> 모든 파라미터는 동일한 값으로 업데이트 -> 찾고자 하는 값을 찾기 힘듬
- 따라서 Weight Initialization이 중요

- 아이디어 1) Small random numbers
	- gaussian with zero mean and 1e-2 standard deviation
	- small network는 okay, deep network에선 문제 발생 
	- <img src="https://www.dropbox.com/s/6ksnrydsf193wmz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2012.12.52.png?raw=1">
	- Q1) weight가 **0.01**일 경우 gradients의 look like는?
	- A1) 점점 smaller gradient가 되서 update하지 못하게 됨
- 아이디어 2) Big random numbers
	- <img src="https://www.dropbox.com/s/7rbq3cfnvxyyh9r/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2013.22.05.png?raw=1">
	- Q2) weight가 **1.0**일 경우 gradient는?
	- A2) all neurons completely saturated, either -1 and 1. Gradients will be all zero
	- Vanishing gradient 발생

### Xavier/He initialization
<img src="https://www.dropbox.com/s/2ad9o826rb13j6q/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2013.27.18.png?raw=1">

- Reasonable initialization. (Mathematical derivation assumes linear activations)
- input : fan\_in, output : fan\_out ( 차원의 수 )
- (Xavier) W = np.random.randn(fan\_in,fan\_out) / np.sqrt(fan\_in)
- (He) W = np.random.randn(fan\_in,fan\_out) / np.sqrt(fan\_in/2)
- 레이어의 출력값들이 적절한 분포를 보임
- 그러나 ReLU를 사용하면 nonlinearity가 깨짐
	- 출력값들이 점점 0이 되어버림 
	- He는 ReLU과 잘 맞음

## Batch Normalization(2015)
- keep activations in a gaussian range that we want
- consider a batch of activations at some layer. To make each dimension unit gaussian, apply (각 layer의 출력값을 비슷한 분포로 생성(Unit Gaussian))
- instead of with weight initialization
- 기본적으로 Gradient Vanishing 이 일어나지 않도록 하는 아이디어 중 하나입니다. 여태는 이 문제를 Activation 함수의 변화, Careful Initialization, small learning rate 등으로 해결했지만, 이런 간접적인 방법보다 training하는 과정 자체를 안정화해서 학습 속도를 가속시킬 근본적인 방법을 찾았습니다
- 각 layer에 들어가는 input을 normalize해서 layer의 학습 속도를 가속, 각 mini-batch의 mean, variance를 구해 normalize

<img src="https://www.dropbox.com/s/5niaholljkib13e/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2018.28.41.png?raw=1">

- N : training examples in current batch
- D : Each batch's dimension

- CNN에서는 activation map마다 하나씩 BN

- 1) dimension마다 mean, variance를 구해서 계산
- 2) Normalize

<img src="https://www.dropbox.com/s/sjn60z6vo0w3rmb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2018.32.08.png?raw=1">

- Fully Connected or Convolutional layer 뒤 또는 nonlinearity 전에 위치

<img src="https://www.dropbox.com/s/qmiy8du0fqzjshh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2018.42.16.png?raw=1">

- 장점
	- 네트워크의 Gradient flow를 향상시킴(가우시안 유닛 벡터가 0 근처라서 vanishing이 일어나지 않음. flow 유지)
	- 높은 Learning rate를 사용해도 안정적인 학습. weight 초기화의 의존성을 줄임
	- Regularization 기능도 하기 때문에 dropout의 필요성을 감소시킴 (dropout을 사용하면 학습속도가 느려짐)
- Test할 땐 미니배치의 평균과 표준편차를 구할 수 없으니 Training하면서 구한 평균의 이동평균을 이용해 고정된 Mean과 Std를 사용
	
- Paper 꼭 보기!
	- [Batch Normalization 설명 및 구현](https://shuuki4.wordpress.com/2016/01/13/batch-normalization-%EC%84%A4%EB%AA%85-%EB%B0%8F-%EA%B5%AC%ED%98%84/) 블로그 추천

## Babysitting the Learning Process
- How to monitoring training
- How do we adjust hyperparameters as we go
	
- 1) Preprocess the data
- 2) Choose the architecture
- loss가 적절한지 확인하기
	- regularization term을 없앴다가 만든다. regularization term을 넣어서 loss가 올라가면 잘된거임!
	- loss가 줄어들지 않고 그대로라면? learning rate가 너무 낮을 수 있으니 올려보자
	- loss가 폭발적이라면 learning rate가 너무 높은 것일수도 있으니 내려보자
	- cross validating 할 때 1e-3, 1e-5면 적당한 편 

## Hyperparameter Optimization
- cross-validation strategy (coarse -> fine)
	- how well do this hyperparameter
	- 먼저 coarse하게 대충 파라미터들이 어떻게 작동하는지 파악
	- 이후 fine하게 parameter 찾기
	- Tip : cost가 original cost보다 3배가 넘으면 explosion.. break out early

### Random Search vs Grid Search
- 랜덤 Search가 Grid Search보다 좋음

### Hyperparameters to play with
- network architecture
- learning rate, its decay schedule, update type
- regularization(L2/Dropout strength)


### Monitor and visualize the loss curve
<img src="https://www.dropbox.com/s/cm7fkbk24771jfb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2019.24.07.png?raw=1">

<img src="https://www.dropbox.com/s/wxtotgjhapnxs7x/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2019.24.32.png?raw=1">

<img src="https://www.dropbox.com/s/ginuyhf81oa19vb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2019.24.55.png?raw=1">

## Summary
<img src="https://www.dropbox.com/s/oue1m72omio7byi/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-18%2019.25.31.png?raw=1">


## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)
- [딥러닝 학습 기술들](https://ratsgo.github.io/deep%20learning/2017/04/22/NNtricks/)
- [Batch Normalization 설명 및 구현](https://shuuki4.wordpress.com/2016/01/13/batch-normalization-%EC%84%A4%EB%AA%85-%EB%B0%8F-%EA%B5%AC%ED%98%84/) 
- [Gradient Descent Optimization Algorithms 정리](http://shuuki4.github.io/deep%20learning/2016/05/20/Gradient-Descent-Algorithm-Overview.html)
