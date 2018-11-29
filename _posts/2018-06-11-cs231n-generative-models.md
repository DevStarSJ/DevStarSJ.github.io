---
layout: post
title: "CS231n 13강. Generative Models"
subtitle: "Stanford CS231n Lecture 13. Generative Models"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0) 13강을 요약한 글입니다. 정리 목적이라 자세하게 작성하지 않은 부분도 있습니다. CS231n의 나머지 14강~16강은 작성하지 않을 예정입니다!


## Overview
---

- Unsupervised Learning
- Generative Models
	- PixelRNN and PixelCNN
	- Variational Autoencoders (VAE)
	- Generative Adversarial Networks (GAN)

## Supervised vs Unsupervised Learning
---

### Supervised Learning
- Data : (x, y)
	- x is data, y is label
- Goal : Learn a function to maxp x -> y
- Examples : Classification, regression, object detection, semantic segmentation, image captioning, etc  	

---
### Unsupervised Learning
- Data : x
	- just data, no labels
	- Training data is cheap
- Goal : Learn som underlying hidden structure of the data
	- Holy grail : Solve unsupervised learning => understand structure of visual world 
- Examples : Clustering, dimensionality reduction, feature learning(autoencoders), density estimation

## Generative Models
---

<img src="https://www.dropbox.com/s/l3xa29mk7nl8jtp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2010.20.02.png?raw=1">

- Train 데이터가 주어지면, 이 데이터의 분포와 동일한 새로운 samples을 생성
- $$p_{model}(x)$$와 $$p_{data}(x)$$가 유사하도록 학습
- Density estimation
- Several flavors
	- Explicit density estimation : $$p_{model}(x)$$을 확실히 정의하고 estimation (MLE)
	- Implicit density estimation : 확실히 정의하지 않고 $$p_{model}(x)$$의 샘플 생성


### Why Generative Models?
<img src="https://www.dropbox.com/s/maobzorpfmopzw2/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2010.24.27.png?raw=1">

- Data로부터 실제와 같은 샘플을 얻을 수 있음(artwork, super-resolution, colorization 등)
- time-series data의 generative model들은 simulation과 planning할 때 사용 가능(강화학습!)
- Generative model을 학습하는 것은 일반적인 특징을 찾을때 유용한 latent representation(잠재적인 representation을 추론할 수 있음
- High dimensional prob, distribution을 추출해서 다룰 수 있음
- Semi-supervised learning에서 활용될 수 있음

### Taxonomy of Generative Models
<img src="https://www.dropbox.com/s/2pzxib21t7z6x9k/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2010.27.26.png?raw=1">

- Generative Model의 분류
- 이 수업에선 3가지만 다룰 예정입니다

## PixelRNN and PixelCNN
---

### Fully visible belief network

<img src="https://www.dropbox.com/s/xlcys4wh2i04ly9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2010.35.26.png?raw=1">

- Explicit density model
- 1-d 차원의 이미지 x의 likelihood를 decompose하기 위해 chain rule 사용
- 그 후, training data의 likelihood를 최대화
- n-dim vector의 확률을 n개의 확률곱으로 나타냄. WaveNet
- 샘플 요소들을 하나하나 차례로 생성해야하기 때문에 매우 느림
- pixel value들의 복잡한 분포 => Neural Network를 사용해 표현!
	- previous pixels의 순서를 정의해야 함


### PixelRNN
<img src="https://www.dropbox.com/s/brrhj1ag50znpkp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2010.48.40.png?raw=1" width="220" height="200">

- corner부터 시작해 이미지 픽셀 생성
- RNN/LSTM을 사용해 이전 픽셀에 dependency
- 그러나, sequential generation은 느림!!

### PixelCNN
<img src="https://www.dropbox.com/s/n3pflqtf64vr99g/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2010.51.17.png?raw=1" widht="200" height="250">

- corner부터 시작해 이미지 픽셀 생성
- CNN over context region을 사용해 이전 픽셀에 dependency
- Training : maximize likelihood of training images
- PixelRNN보단 빠름
	- Training 이미지의 context region values로  convolution을 병렬화  
	- 그러나 sequentially하기 때문에 여전히 느림

### Generations Samples
<img src="https://www.dropbox.com/s/6js5vkewwvc1s68/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.04.33.png?raw=1">

### Summary
<img src="https://www.dropbox.com/s/swi2wiyzc8zwz9v/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.05.00.png?raw=1">


## Variational Autoencoders (VAE)
---

<img src="https://www.dropbox.com/s/cg0673i8cayx62g/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.14.03.png?raw=1">

- VAE는 latent z를 가진 intractable(다루기 힘든) 밀도 함수를 정의
- 직접적으로 최적화할 수 없고, likelihood에 대한 lower bound(하한)으로 유도하고 최적화	
	
### background first: Autoencoders
<img src="https://www.dropbox.com/s/tpnoz2r1qvyhl9e/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.18.00.png?raw=1">

- unlabeled training data로 저차원의 feature representation을 만드는 unsupervised 접근
- Encoder는 계속 변하고 있음
- 차원 축소를 하는 이유는?
	- 의미있는 데이터 변동 factor를 찾을 수 있는 Feature를 얻기 위해

<img src="https://www.dropbox.com/s/wkhxy57nxgx5gca/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.23.21.png?raw=1">

- How to learn this feature representation?
	- original data를 재설계할 수 있는 feature를 학습
	- Autoencoding은 encoding 그 자체!
- Decoder도 Encoder처럼 계속 변하고 있음

<img src="https://www.dropbox.com/s/npg2xnhb81t645u/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.25.52.png?raw=1">

<img src="https://www.dropbox.com/s/iuivz189dggea8x/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.27.19.png?raw=1">

- Encoder는 supervised model을 initialize하기 위해 사용할 수 있음
- 그렇다면 autoencoder로 새로운 이미지를 생성할 수 있을까? => VAE

### Variational Autoencoders
<img src="https://www.dropbox.com/s/oc79eu8lxpyv860/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.30.22.png?raw=1">

- true parameters $$\theta^*$$를 estimate하고 싶음
- How should we represent this model?
	- prior $$p(z)$$는 간단하게 선택. (ex. 가우시안)
	- conditional $$p(x\mid z)$$는 복잡 (이미지 생성)
		- Neural network로 표현
- How to train the model?
	- learn model parameters to maximize likelihood of training data
	- $$p_{\theta}(x) = \int p_{\theta}(z)p_{\theta}(x\mid z)dz$$  
- What is the problem with this?
	- Intractable!

### Intractabiltiy
<img src="https://www.dropbox.com/s/q6dycmy8lg8anmd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.44.41.png?raw=1">

<img src="https://www.dropbox.com/s/ivujma7vxmcm36q/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.48.14.png?raw=1">

- decoder network 모델링에 추가하기 위해 encoder network를 정의($$p_{\theta}(z\mid x)$$를 근사할)

<img src="https://www.dropbox.com/s/ivinifqg6g9qjn8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.50.02.png?raw=1">

<img src="https://www.dropbox.com/s/9vw12vta3bv0iqs/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.50.31.png?raw=1">

<img src="https://www.dropbox.com/s/61ixhtnjyhsd2i8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.54.36.png?raw=1">

<img src="https://www.dropbox.com/s/9fepjx4h1m9kkv0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.56.01.png?raw=1">

<img src="https://www.dropbox.com/s/kiirfh2eeqgz6o1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.56.16.png?raw=1">

<img src="https://www.dropbox.com/s/563kc94iu6cpu1b/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.57.33.png?raw=1">

<img src="https://www.dropbox.com/s/gs00ny0yz4913tw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2011.58.22.png?raw=1">

### Generating Data
<img src="https://www.dropbox.com/s/8h63uinllaeiti7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.42.16.png?raw=1">

<img src="https://www.dropbox.com/s/u50jqxtihcvvc0y/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.42.30.png?raw=1">

### Summary
<img src="https://www.dropbox.com/s/1pskkm52djclycm/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.42.46.png?raw=1">


## Generative Adversarial Networks (GAN)
---

- PixcelCNN은 다루기 쉬운 밀도 함수를 정의하고, training data의 likelihood를 optimize했습니다
- VAEs는 대조적으로 잠재변수 z를 가진 다루기 힘든 함수를 정의합니다. z는 좋은 속성을(property) 많이 가지고 있습니다
	- 직접 optimize하지 못하고, likelihood의 lower bound를 optimize하도록 유도합니다 
- 명시적으로 밀도를 모델링하는 것을 포기하고, sample을 얻으면 어떨까요?
- GANs : 명시적인 밀도 함수를 적용하지 않고 게임 이론으로 접근합니다
	- 2 player game의 training 분포를 사용해 생성하는 것을 학습

- Problem
	- 복잡하고 고차원의 샘플을 원함
	- 이것을 직접적으로 할 방법이 없음
- Solution
	- 간단한 분포의 sample을 얻음(예를 들어 random noise)
	- 간단한 분포로부터 변형을 학습
- Q) What can we use to represent this complex transformation?
- A) Neural Network!

- Input : Random noise
- Output : Sample from training distribution


### Training GANs: Two-player game
- Generator network : 실제와 같은 이미지를 생성해 discriminator를 속입니다
- Discriminator network : 실제와 가짜 이미지를 구별합니다

<img src="https://www.dropbox.com/s/2fkftsb2sksw8ue/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2021.33.15.png?raw=1">

- Generator가 진짜같은 이미지를 생성해낸다면!!

<img src="https://www.dropbox.com/s/3wkocm1qvvxkl0i/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2021.39.28.png?raw=1">

- Discriminator는 objective를 최대화.
	- $$D(x)$$는 1에 가깝고 $$D(G(z))$$는 0에 가까워야 합니다
- Generator는 objective를 최소화
	- $$D(G(z))$$는 1에 가까워야 함

<img src="https://www.dropbox.com/s/yrsd0ni269cjkc0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2021.50.42.png?raw=1">

- generator에서 graident ascent 사용

<img src="https://www.dropbox.com/s/3tjgeka924xl0aw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.32.47.png?raw=1">

- GAN training algorithm
- training 후, 새 이미지를 생성하기 위해 generator 네트워크를 사용합니다

### Generated samples
<img src="https://www.dropbox.com/s/3fwxj66svo68s39/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.34.12.png?raw=1">

<img src="https://www.dropbox.com/s/c2aeog6hwmlo9d4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.34.28.png?raw=1">


### Convolutional Architectures
<img src="https://www.dropbox.com/s/wwinfk4wpaacb7r/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.35.56.png?raw=1">

- Gan이 더 잘 생산할 수 있도록 도와주는 아키텍쳐

<img src="https://www.dropbox.com/s/o1z2djeydhcaauv/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.36.28.png?raw=1">

<img src="https://www.dropbox.com/s/yoplja0npkltfs6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.37.10.png?raw=1">

<img src="https://www.dropbox.com/s/k94lrafq3na9fln/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.37.33.png?raw=1">

- 이런 작업들도 진행 가능
- Vector의 연산이 가능 (Word2Vec처럼)

### 2017: Year of the GAN
<img src="https://www.dropbox.com/s/so11qru56ixq1fa/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.38.14.png?raw=1">

- 다양한 종류의 GAN이 연구되고 있습니다
- [The GAN Zoo](https://github.com/hindupuravinash/the-gan-zoo) : GAN 관련 논문들을 정리한 repo
- [ganhacks](https://github.com/soumith/ganhacks) : GAN들을 학습할 때 트릭과 팁을 주는 repo

### Summary
<img src="https://www.dropbox.com/s/7dd1m75pdt9snv6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.39.56.png?raw=1">


## Recap
<img src="https://www.dropbox.com/s/ehpw78xf9ed4tjh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-11%2022.40.13.png?raw=1">


## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)
- [엄태웅님 포스팅](https://www.facebook.com/photo.php?fbid=10154843949129417&set=a.10150227079799417.333777.855314416&type=3)
- [GAN tutorial 2016 정리(1)](https://kakalabblog.wordpress.com/2017/07/27/gan-tutorial-2016/)
- [알기쉬운 Variational AutoEncoder](https://www.slideshare.net/ssuser06e0c5/variational-autoencoder-76552518)
- [What is variational autoencoder?](http://nolsigan.com/blog/what-is-variational-autoencoder/)
- [GAN(Generative Adversarial Network) 기초](https://zzsza.github.io/data/2017/12/27/gan/)