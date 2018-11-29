---
layout: post
title: "Stanford CS231n 4강. Backpropagation and Neural Networks"
subtitle: "Stanford CS231n Lecture 4. Backpropagation and Neural Networks"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)를 요약한 포스팅입니다. 정보 전달보다 자신을 위한 정리 목적이 강한 글입니다! :)


- 이번 강의는 복잡한 함수의 Analytics Gradient를 계산하는 방법에 대해 이야기할 예정입니다
	- Numerical gradient : slow, approximate, easy to write
	- Analytics gradient : fast, exact, error-prone(오류가 생기기 쉬움) 	
	- Analytics 계산 후, Numerical gradient로 Check!

	
## Computational Graphs
<img src="https://www.dropbox.com/s/fp7rrq0b21qekj1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-12%2019.24.57.png?raw=1">

- 이점 
	- Back Propagation 사용 가능
	- Complex Function을 할 때 유용
		- CNN, Neural Turing Machine 등 
	- 모든 변수에 대한 Gradient를 계산하기 위해 Chain Rule을 재귀적으로 사용합니다
		- which is going to recursively use the **Chain Rule** in order to compute the gradient with respect to every variable in the computation graph
- 동그라미는 Node Graph
	- Steps of Computation
- L
	- $$\Sigma$$ (regularization term + data term)



### Example 1
<img src="https://www.dropbox.com/s/cxr3o5rwn1gu54t/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-12%2019.31.42.png?raw=1">

- z 부분은 $$\frac{\partial{f}}{\partial{z}}$$ = -12/-4 = 3
- q 부분은 $$\frac{\partial{f}}{\partial{q}}$$ = -12/3 = -4
- y 부분은 $$\frac{\partial{f}}{\partial{y}}$$ = $$\frac{\partial{f}}{\partial{q}} \frac{\partial{q}}{\partial{y}}$$ = -4 * 1 = -4
- x 부분은 $$\frac{\partial{f}}{\partial{x}}$$ = $$\frac{\partial{f}}{\partial{q}} \frac{\partial{q}}{\partial{x}}$$ = -4 * 1 = -4

<img src="https://www.dropbox.com/s/cz8jh60q0n83aoz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-12%2019.55.34.png?raw=1">

- 구성
	- Local Gradient : 우리가 구하려던 것은 아님
	- Gradients : loss 대비 우리가 구하려던 것
- 각각의 노드는 주변 환경을 알고 있습니다(immediate surronding)
- 국소적 계산(Local Computation)
	- 전체에서 어떤 일이 벌어지든 상관없이, 자신과 관계된 정보만으로 결과를 출력 가능
	- 일종의 조립라인의 분업처럼, 복잡한 계산도 나누면 단순한 계산이 가능! 	

### Example 2
<img src="https://www.dropbox.com/s/l1ugm20jxnf2ysc/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-12%2019.59.04.png?raw=1">

- local gradient를 구하면

<img src="https://www.dropbox.com/s/fs6kexmhyje7lut/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2009.30.27.png?raw=1">

- **x = 1.37** 
- **0.37\*-0.53**
- **웅원님의 이야기 : 손으로 꼭 해보세요~!**

<img src="https://www.dropbox.com/s/g1cll1l533scezy/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2009.31.06.png?raw=1">

- sigmoid gate를 더 쉽게 계산할 수 있습니다!


### Patterns in backward flow
- Add gate : gradient distrubutor
- Q) What is a max gate?
- Q) What is a mul gate?




- max gate : gradient router
- mul gate : gradient switcher
	- 바꿔준다의 swith 


## Gradients for vertorized code
<img src="https://www.dropbox.com/s/ijhktuzkwx98wrh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2009.46.01.png?raw=1">

- Vector일 경우 Gradient를 구하는 방법에 대해 알아보겠습니다
- $$\frac{\partial{z}}{\partial{x}}$$는 Jacobian matrix입니다
	- derivative of each element of z w.r.t each element of x (w.r.t = with respect to, ~에 대해)
	- 자세한 설명 대신 동훈님의 [공돌이의 수학정리노트](https://wikidocs.net/4053)에 있는 자코비안 행렬 링크를 첨부합니다! 내용 다 좋아요 :)
		- [유튜브](https://www.youtube.com/user/AngeloYeo/videos)도 좋아요!
	- [위키피디아 자코비안 행렬](https://en.wikipedia.org/wiki/Jacobian_matrix_and_determinant)


### Vectorized operations
<img src="https://www.dropbox.com/s/jibzha12d5ob2ua/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2010.16.16.png?raw=1">

- Q) What is the size of the Jacobian matrix?
- A) 4096 * 4096
	- 만약 미니배치를 100으로 진행하고 있었다면 409,600 x 409,600
	
	
<img src="https://www.dropbox.com/s/4tduxfsx32kiz3y/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2010.48.29.png?raw=1">

- Q) what does it(Jacobian matrix) look like?
- A) Diagonal
	- This is element-wise, each element of the input only affect that corresponding element in the output  

<img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/74e93aa903c2695e45770030453eb77224104ee4" >


### A Vectorized Example
<img src="https://www.dropbox.com/s/8307gxwprue00oq/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2011.11.44.png?raw=1">

- The gradient of a vector is always going to be the same size as the original vector, and each element of this gradient is going to it means **how much** of this particular element affects our final output of the function

<img src="https://www.dropbox.com/s/794sboa8ynbkpz4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2011.16.33.png?raw=1">

- Always check 
	- The gradient with respect to a variable should have the same shape as the variable
	
<img src="https://www.dropbox.com/s/plvseat9vqrzgf6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2011.26.15.png?raw=1">

- ~~~왜 Transpose를 해주나 이해가 안되서 찾아본 [링크](https://math.stackexchange.com/questions/44945/divergence-as-transpose-of-gradient?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa) 링크를 보고 다시 생각해보니 납득~~~
- 원하는 식을 얻기 위해 식을 변형 $$W_{k,i}$$ (Transpose)


## Backpropagation Summary
- Neural Nets은 굉장히 거대함
	- 모든 파라미터를 직접 그라디언트 계산하기 힘듭니다
- Backpropagation
	- recursive application of the chain rule along a computational graph to compute the gradients of all inputs/parameters/intermediates
- Graph structure 구현
	- forward
		- compute result of an operation and save any intermediates needed for gradient computation in memory
	- backward
		- apply the chain rule to compute the gradient of the loss function with respect to the inputs   	
	 

## Neural networks
<img src="https://www.dropbox.com/s/uj9kfsurkq7fogd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2011.41.54.png?raw=1">

- class of function that are stacked on top of each other and we stack them in a hierarchical way in order to make up a more complex non-linear function
- h : intemediate variable(layer)

<img src="https://www.dropbox.com/s/5ogcqe7bfge6hx6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2011.51.42.png?raw=1">

- 3 layers

## 구현(2-layer)
- Full implementation of training a 2-layer Neural Network needs ~20 lines

```
import numpy as np
from numpy.random import randn

N, D_in, H, D_out = 64, 1000, 100, 10
x, y = randn(N, D_in), randn(N, D_out)
w1, w2 = randn(D_in, H), randn(H, D_out)

for t in range(2000):
  h = 1/(1+np.exp(-x.dot(w1)))
  y_pred = h.dot(w2)
  loss = np.square(y_pred - y).sum()
  print(t, loss)
  
  grad_y_pred = 2.0 * (y_pred - y)
  grad_w2 = h.T.dot(grad_y_pred)
  grad_h = grad_y_pred.dot(w2.T)
  grad_w1 = x.T.dot(grad_h * h * (1-h))
  
  w1 -= 1e-4 * grad_w1
  w2 -= 1e-4 * grad_w1
```
 
### Neural Network 이름의 유래
<img src="https://www.dropbox.com/s/9ythccf61kuqmaw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2011.58.35.png?raw=1">

- 뉴런의 자극 처리 메커니즘과 neural network의 메커니즘이 유사합니다
- input을 자극으로 생각하고 데이터를 처리하는 함수가 cell body!
- activation function을 통해 결과값이 나오는 것도 유사하게 볼 수 있음(역치를 떠올리면..)
- 하지만 정확히는 뉴런의 메커니즘과 같지는 않으니 참고만! 

### Activation functions
<img src="https://www.dropbox.com/s/ks95mycsfu720xh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2012.07.49.png?raw=1">

- 추후 하나 하나 설명할 예정!

### Neural networks: Architectures
<img src="https://www.dropbox.com/s/hdwe3nj2l3935xc/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-13%2012.08.28.png?raw=1">

- 아키텍쳐도 추후 설명할 예정입니다

## Neural networks Summary
- We arrange neurons into fully-connected layers
- The abstraction of a layer has the nice property that is allows us to use efficient vectorized code(ex. matrix multiplies) (check)
- Neural networks are not really neural
- Next time : Convolutional Neural Networks

## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)
- [공돌이의 수학정리노트](https://wikidocs.net/4053)
- [위키피디아 자코비안 행렬](https://en.wikipedia.org/wiki/Jacobian_matrix_and_determinant)