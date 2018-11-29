---
layout: post
title: "Stanford CS231n 7강. Training Neural Networks 2"
subtitle: "Stanford CS231n Lecture 7. Training Neural Networks 2"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)를 요약한 포스팅입니다. 정보 전달보다 자신을 위한 정리 목적이 강한 글입니다! :)

## Today
- Fancier optimization
- Regularization
- Transfer Learning
	- less data일 때 사용할 수 있는 방법

## SGD
```
while True:
  dx = compute_gradient(x)
  x -= learning_rate * dx
```	
	
## Optimization
- loss function 
	- tell us how good or bad is that value of the weights doing on our problem
	- gives us some nice landscape over the weights
 
- Problems with SGD
	- <img src="https://www.dropbox.com/s/z9af26uh1ukeqpq/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-20%2023.28.45.png?raw=1">
		- Q) loss가 한 방향으론 빠르게, 다른 방향으로 천천히 변화하면 어떻게 될까? Gradient Descent의 역할은?
		- A) shallow dimension에서 매우 느리고 jitter 모양
		- step마다 지그재그로 왔다갔다 해서 매우 느린 속도로 학습이 진행됨
		- 고차원에선 이런 문제가 많이 발생 (위 그림은 2차원!)
	- <img src="https://www.dropbox.com/s/6dpkfxkdmvdgsm4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-20%2023.37.26.png?raw=1">
	- x : value of parameter, y : loss	
	- local minima
		- SGD get will stuck == local minima, gradient is zero, 빠져나오지 못함
		- 100 million dimension일 경우 모든 방향에서 loss가 증가함. 실제로 local minima는 매우 드물게 나타납니다
	- Saddle(안장) points엔 더 내려가야하는데 gradient 엄청 작은 값이라 정말 느리게 진행됨
		- Saddle points much more common in high dimension
		- 100 million dimension에선 한 방향으론 loss가 증가하고, 다른 방향으론 loss가 내려감. 이런 경우는 정말 흔하게 나타납니다
		- near the saddle point도 slope가 평평해 gradient가 0에 가까워집니다
		- local minima보다 saddle point가 더 문제가 됩니다
		- local minima는 non-convex에서 gradient 음수(극대점), convex에선 gradient가 양수(극소점) vs saddle point는 방향에 따라 gradient가 다름
		- [다크 프로그래머님 글](http://darkpgmr.tistory.com/148) 참고
	- mini batch를 이용해 gradient에 대한 true information이 아닌 noisy estimate를 얻음. noise가 mess up gradient

### SGD의 대안책
```
vx = 0
while True:
  dx = compute_gradient(x)
  vx = rho * vx + dx
  x -= learning_rate * vx
```

- 1) SGD + Momentum
	- <img src="https://www.dropbox.com/s/h4yahgx7msev9xg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2000.14.25.png?raw=1"> 
	- 위 코드에서는 x +=로 되어있는데 x -=가 맞지 않을까 생각됨
	- maintain velocity
	- add our gradient estimates to the velocity
	- 원래 가던 방향으로 가고자하는 관성을 이용하는 방법
	- saddle point에서 gradient가 0이어도 velocity가 유지되서 saddle point를 지나갈 수 있음
	- minima로 가는데 필요한 step이 줄어듬
	- friction을 보통 0.9 또는 0.99로 줌
	- velocity = running mean of gradients
	- <img src="https://www.dropbox.com/s/3odzqhxa68nfwvg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2000.43.33.png?raw=1">
	- (1) Momentum update 
		- overcome some noise in our gradient estimate
		- 현재 위치에서 gradient를 구한 후, 그 값에서 Velocity만큼 옮김
	- (2) Nesterov Momentum (NAG, Nesterov Accelerated Gradient)
		- <img src="https://www.dropbox.com/s/0o47eejp2rpfxs5/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2014.13.24.png?raw=1"> 
		- Velocity로 옮긴 후 gradient를 구함
		- convex optimization 관점에서 유용
		- [cs231 정리](http://aikorea.org/cs231n/neural-networks-3/#sgd)

### AdaGrad
```
grad_sqaured = 0
while True:
  dx = compute_gradient(x)
  grad_squared += dx * dx
  x -= learning_rate * dx/(np.sqart(grad_squared) + 1e-7)
```

- velocity 대신 gradient의 제곱(sqaured_term)을 사용
- 1e-7 : 0으로 나누지 않기 위해 추가한 상수
- <img src="https://www.dropbox.com/s/7z9k1lit4mde0me/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2014.30.35.png?raw=1">
- high condition number 문제는 많이 바뀌는 gradient는 큰 수로 나누고, 잘 변하지 않는 gradient는 작은 수로 나누어 속도를 더 빠르게함
- <img src="https://www.dropbox.com/s/84584eew0uzd1x0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2014.32.19.png?raw=1">
- Adagrad, the steps actually smaller and smaller because we just continue updating this estimate of the squared gradients over time, so this estimate just grows and grows monotonically over the course of training. Now this causes our step size to get smaller and smaller over time
- saddle point : non-convex에선 stuck
- not so common

### RMSProp
```
grad_squared = 0
while True:
  dx = compute_Gradient(x)
  grad_sqaured = decay_rate * grad_sqaured + (1-decay_rate) * dx * dx
  x -= learning_rate * dx / (np.sqrt(grad_squared) + 1e-7)
```

- sqaured gradient를 축적만 하지 않고 decay rate를 도입
- decay rate = 0.9 or 0.99
- 강화학습에선 RMSProp을 많이 사용


### Adam
```
# almost
first_moment = 0
second_moment = 0
while True:
  dx = compute_gradient(x)
  first_moment = beta1 * first_moment + (1-beta1)*dx
  second_moment = beta2 * second_moment + (1-beta2) * dx * dx
  x -= learning_rate * first_moment / (np.sqrt(second_moment) + 1e-7))
```

- almost use
- velocity와 squared_gradient를 모두 사용
- first moment : Momentum
- second moment : AdaGrad/RMSProp(RMSProp에 더 근접한 듯! decay rate가 있음)
- <img src="https://www.dropbox.com/s/feiwe1pugbttyt3/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2014.47.47.png?raw=1">
- 첫 second_moment는 0!(beta2는 0.9 또는 0.99)
- 첫 timestep은 very very large step
- 위 문제를 해결하기 위해 Bias correction을 추가
- (면접 질문) Adam이 왜 잘될까요? 2가지 이유는?

```
# full from
first_moment = 0
second_moment = 0
while True:
  dx = compute_gradient(x)
  first_moment = beta1 * first_moment + (1-beta1)*dx
  second_moment = beta2 * second_moment + (1-beta2) * dx * dx
  first_unbias = first_moment / (1-beta1**t)
  second_unbias = second_moment / (1-beta2**t)
  x -= learning_rate * first_unbias / (np.sqrt(second_unbias) + 1e-7))
```

- bias correction이 first, second_moment를 0으로 시작할 수 있도록 만들어줌
- beta1 = 0.9, beta2 = 0.999, learning_rate = 1e-3 or 5e-4

### Learning rate
- <img src="https://www.dropbox.com/s/546ltzbd2o445gk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2014.56.58.png?raw=1">
- <img src="https://www.dropbox.com/s/ixt07xgzh3pu2ic/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.02.26.png?raw=1">
- <img src="https://www.dropbox.com/s/nvnkhmi2962j65w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.02.48.png?raw=1">
- lr을 천천히 decay시켜 minima에 도달할 수 있도록 설정
- 처음엔 no decay로 시도해보고 직접 눈으로 보길!
- decay 방법은 exponential decay, 1/t decay 등이 있음


### 비교
<img src="http://2.bp.blogspot.com/-q6l20Vs4P_w/VPmIC7sEhnI/AAAAAAAACC4/g3UOUX2r_yA/s400/s25RsOr%2B-%2BImgur.gif">

- 밑 그림을 보면 SGD가 Converge가 가장 느림
- 왜 Adam은 없지..

<img src="https://i.imgur.com/2dKCQHh.gif?1">

- Adadelta가 제일 좋아보이지만 문제 상황에 따라 다름. 문제 상황에 맞게 선택

<img src="https://i.imgur.com/2dKCQHh.gif?1">

- Rmsprop과 Adagrad가 좋아 보임. saddle point 문제를 극복할 수 있기에 이 옵티마이저들이 좋음

## First-Order(1차) optimization
- 위에서 말한 것들이 모두 First-Order optimization
- <img src="https://www.dropbox.com/s/pb0znetxelgbtgb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.05.52.png?raw=1">
- (1) Use gradient form linear approximation
- (2) Step to minimize the approximation


## Second-Order(2차) optimization
- <img src="https://www.dropbox.com/s/4vlmjhigdkhspsx/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.07.01.png?raw=1">
- 함수로 근사
- (1) Use gradient and **Hessian** to form **quadratic** approximation
- (2) Step to the **minima** of the approximation
- <img src="https://www.dropbox.com/s/5f5pt0z8wuordik/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.10.51.png?raw=1">
- 뉴턴 = 내츄럴
- learning rate가 없음
- <img src="https://www.dropbox.com/s/h6wk89vvu5uke40/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.30.36.png?raw=1">
- 딥러닝에 사용하기엔 계산량이 너무 많음(Hessian은 $$O(N^2)$$, inverting은 $$O(N^3)$$)
- [최적화(Optimization) 기초와 포트폴리오 선택](http://www.irealism.org/xe/quantfinance/1628) 참고

### L-BFGS
- <img src="https://www.dropbox.com/s/js4kfd3lduh66pi/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.35.33.png?raw=1">
- less stochastic, less parameter

## In practice
- Adam is a good default choice in most cases
- full batch update를 해야하면 L-BFGS


<img src="https://www.dropbox.com/s/4x7gfkl2zmv8dar/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.47.41.png?raw=1">

- train / val error의 gap을 줄이기 위해 어떻게 해야할까?

## Model Ensembles
- 1) Train multiple independent models
- 2) At test time average their results
- Enjoy 2% extra performance
- Tips and Tricks
	- Instead of training independent models, use multiple snapshots of a single model during training!
	- Cyclic learning rate schedules can
make this work even better
	- Instead of using actual parameter vector, keep a moving average of the parameter vector and use that at test time (Polyak averaging) (but not common)

- How to improve **single-model** performance?

## Regularization
- 1) Add term to loss
	- <img src="https://www.dropbox.com/s/r1h6hsvpc6jdscr/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.54.02.png?raw=1"> 
	- L2는 neural network에서 사용하지 않음(?)
- 2) Dropout
	- <img src="https://www.dropbox.com/s/nmggg3544x5eq3k/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2015.55.53.png?raw=1">
	- randomly하게 뉴런을 activation 확률을 0으로 바꿔서 끊음
	- 왜 좋은건가?
		- (1) Prevent co-adaptation(상호 작용) of features 
		- (2) kind of like large ensemble models(that share parameters)
	- Test time
		- <img src="https://www.dropbox.com/s/srj8085z8laksa7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.03.06.png?raw=1">
	- Common pattern
		- <img src="https://www.dropbox.com/s/upb3p5dz4ssx2e4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.06.07.png?raw=1">
		- Batch normalization(during training) one data point might appear in difference mini batches with difference other data points.
		- BN을 사용할 때는 Dropout을 사용하지 않음
- 3) Data Augmentation
	- <img src="https://www.dropbox.com/s/olhjhh9kdgcelb2/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.09.38.png?raw=1"> 
	- 데이터 뿔리기
	- Horizontal Flips
	- Random crops and scales
	- Training : sample ranom crops / scales 
	- Testing : average a fixed set of crops
	- Color Jitter
		- <img src="https://www.dropbox.com/s/ac7hxsx4ntun6bm/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.10.55.png?raw=1"> 
		- Apply PCA to all RGB
	- <img src="https://www.dropbox.com/s/mllau8qwul6syg4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.11.48.png?raw=1">
	- Common pattern
		- <img src="https://www.dropbox.com/s/lii7bptu3zjzpq4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.12.39.png?raw=1">

## Transfer Learning
- 이미 많은 양의 data로 train된 모델을 사용
- <img src="https://www.dropbox.com/s/rbw0sns8gwlryuy/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.16.45.png?raw=1">
- 1) 적은 양의 data
	- 마지막 layer를 reinitialize하고 train
	- Use Linear Classifier on top layer  
- 2) 많은 양의 data
	- 마지막 Max Pooling layer 이후 모든 FC를 train(fine tuning, lr=0.1쯤?)
	- finetune a few layer
- dataset이 많이 다른데 많은 양의 data를 보유하면 finetune a large number of layers
- Transfer learning을 하면 FC 이전의 layer들은 generic하고 FC layer들은 specific!
- <img src="https://www.dropbox.com/s/k0ikiq7yfattzka/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.18.22.png?raw=1">
- <img src="https://www.dropbox.com/s/qho0jwqosljyi2l/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.19.06.png?raw=1">


## Summary
<img src="https://www.dropbox.com/s/riotb4grdopgako/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-21%2016.19.29.png?raw=1"> 
 


## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)
- [다크 프로그래머님 글(local minima, saddle point)](http://darkpgmr.tistory.com/148)
- [cs231 정리](http://aikorea.org/cs231n/neural-networks-3/#sgd)
- [최적화(Optimization) 기초와 포트폴리오 선택](http://www.irealism.org/xe/quantfinance/1628)





