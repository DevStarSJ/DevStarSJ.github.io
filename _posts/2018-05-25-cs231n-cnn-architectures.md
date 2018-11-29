---
layout: post
title: "CS231n 9강. CNN Architectures"
subtitle: "Stanford CS231n Lecture 9. CNN Architectures"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0) 9강을 요약한 글입니다. 정보 전달보다 자신을 위한 정리 목적이 강한 글입니다! :)

## Today
- Case Study
	- AlexNet
	- VGG
	- GoogLeNet
	- ResNet
- Also
	- NiN (Network in Network)
	- DenseNet
	- Wide ResNet
	- FractalNet
	- ResNeXT
	- SqueezeNet
	- Stochastic Depth

### LeNet
- ConvNet의 최초 도입
- 우편 번호(zip code), 숫자(digit)에 사용 
### AlexNet
- <img src="https://www.dropbox.com/s/2ued52qrzd5cu9n/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-24%2023.59.59.png?raw=1">
- First large scale ConvNet 	
- ILSVR'12 winner
- Input : 227x227x3 images
- First layer(CONV1) 
	- 96 11x11 filters applied at stride 4
	- output size?
		- 96 55x55
	- total number of parameters?
		- (11x11x3)x96 = 35K 
- Second layer(POOL1)
	- 3x3 filters applied at stride 2
	- output size?
		- 96 27x27  
	- total number of paramters?
		- no parameter
		- parameters are the weights that we're trying to learn. and so convolutional layers have weights that we learn but pooling all we do is have a rule, we look at the pooling region, we take max. so there's no parameters that are learned
		- CONV/FC는 parameter가 있고 RELU/POOL 등은 parameter가 없음
- Details
	- first use of ReLU
	- used Norm layers (not common anymore)
	- heavy data augmentation (flipping, jittering, cropping, color normalization ...)
	- dropout 0.5
	- batch size 128
	- SGD Momentum 0.9
	- Learning rate : 1e-2, reduced by 10 manually when val accuracy plateaus
	- L2 weight decay : 5e-4
	- 7 CNN ensemble: 18.2% -> 15.4% 
- 앞 부분 ConvNet이 2개로 나뉜 이유
	- GTX 580으로 학습해서 2개의 GPU를 사용했었음

- ImageNet winners
	- <img src="https://www.dropbox.com/s/1s7wwy6t0nh153q/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2000.26.35.png?raw=1">

### ZFNet
- <img src="https://www.dropbox.com/s/gs4qd3ute5s9p2x/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2000.30.42.png?raw=1">
- Improved hyperparameters 

### VGGNet
- <img src="https://www.dropbox.com/s/64bdqmvol5owssd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2000.42.10.png?raw=1"> 
- much deeper networks, much smaller filters 
- 레이어의 수를 16~19개까지 늘림(기존 AlexNet은 8개)
- 3x3 CONV stride 1, pad 1
- 2x2 MAX POOL stride 2
- Q1) Why use smaller filters? (3x3 conv)
	- A1) 3x3 conv(stride 1) layer는 7x7 conv layer와 같은 effective receptive field를 가짐
	- Q2) What is the effective receptive field of three 3x3 conv (stride 1) layers?
	- 작은 필터를 사용하면 파라미터수를 줄일 수가 있고, 여러번 겹쳐서 사용하면 더 큰 필터가 표현하는 영역(Receptive Field)을 표현할 수 있게 됩니다
	- <img src="https://www.dropbox.com/s/ita7pdy3u7twioe/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2000.44.04.png?raw=1" width="300" height="300">
	- 3x3 2번을 겹치면 5x5 영역에 대한 특징을 뽑을 수 있고, 3번 겹쳐서 사용하면 7x7 영역에 대한 특징을 뽑아낼 수 있음
		- 3x(3x3xC(인풋의 채널 수)) = 27C
		- 7x7xC=49C
		- 파라미터 수는 더 줄이고 망은 더 깊어지는 효과(More nonlinearity) 
- Details
	- ILSVRC’14 2nd in classification, 1st in localization
		- localization : 어디에 물체가 있는지(Bounding Box) + Classification
	- Similar training procedure as Krizhevsky 2012
	- No Local Response Normalisation (LRN)
	- Use VGG16 or VGG19 (VGG19 only slightly better, more memory)
	- Use ensembles for best results
	- FC7 features generalize well to other tasks 
		- Featrue Representation!
	
- depth의 2가지
	- depth : width x height x depth할 때의 depth 
	- depth : total number of layers

### GoogLeNet
- <img src="https://www.dropbox.com/s/pq6tz62jppukeil/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2001.14.58.png?raw=1"> 
- much deeper networks with computational efficiency (22 layers)
- 효율적인 Inception Module
- No FC layers
- 5 million parameters(12x less than AlexNet)
- Inception Module
	- <img src="https://www.dropbox.com/s/trfgfzfbe96fm93/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2001.17.29.png?raw=1"> 
	- good local network typology(network within a network), stack each other 
	- 여러 filter 연산을 parallel하게 진행한 후 concat(depth wise)
	- Q) What is the problem with this?
		- <img src="https://www.dropbox.com/s/uw13zcomhmlop89/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2001.25.34.png?raw=1">
		- expensive compute
		- Solution : "bottleneck" layers that use 1x1 convolutions to reduce feature depth
	- <img src="https://www.dropbox.com/s/yncqh6s73qbllcq/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2002.11.45.png?raw=1">
	- 1x1 conv로 depth를 줄임
	- <img src="https://www.dropbox.com/s/0myju9z2tizm72w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2002.13.04.png?raw=1">
- <img src="https://www.dropbox.com/s/n38vdkkkjdlqi44/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2002.15.10.png?raw=1">

- [Google Inception Model](https://norman3.github.io/papers/docs/google_inception.html) 참고. v1이 GoogLeNet. v4까지 정리되어 있습니다

### ResNet
- very deep networks using residual connections
- 152 layers
- classification / detetection
- What happens when we continue stacking deeper layers on a "plain" convolutional neural network?
	- <img src="https://www.dropbox.com/s/23w5zw9wc6lgb0j/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2013.28.08.png?raw=1">
- 가설 : problem은 optimization 문제! deeper model이 optimize되긴 어려움
	- Deep한 모델이 shallower한 모델보다 성능이 좋아야 함
	- A solution by construction is copying the learned layers from the shallower model and setting additional layers to identity mapping.
	- <img src="https://www.dropbox.com/s/pmpsr0xdw0x1ae8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2013.42.48.png?raw=1">
- Residual : 이전 몇 단계 전 레이어의 결과를 현재 레이어의 결과와 합쳐 내보내는 것
- Full ResNet architecture
	- <img src="https://www.dropbox.com/s/p1zfuicawi3gk91/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.13.39.png?raw=1">
- bottleneck layer
	- <img src="https://www.dropbox.com/s/kjz6uvcy6ffc0si/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.16.24.png?raw=1">
	- 효율성 증대를 위해 사용
	- GoogLeNet과 유사
- Training ResNet in practice
	- Batch Normalization after every CONV layer
	- Xavier/2 initialization from He et al.
	- SGD + Momentum (0.9)
	- Learning rate: 0.1, divided by 10 when validation error plateaus
	- Mini-batch size 256
	- Weight decay of 1e-5
	- No dropout used
- Result
	- <img src="https://www.dropbox.com/s/1rbn7g1l1pmpuid/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.23.55.png?raw=1">
	- 사람보다 나은 performance를 보여줌
	- <img src="https://www.dropbox.com/s/bqs64eodanba38i/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.26.02.png?raw=1">
	
- Comparing complexity
	- <img src="https://www.dropbox.com/s/sicvs974q122bz8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.27.31.png?raw=1">
	- inception-v4 : ResNet + Inception
	- VGG : Highest memory, most operations
	- GoogLeNet : most efficient
	- AlexNet : Smaller compute, still memory heavy, lower accuracy
	- ResNet : Moderate efficieny depending on model, highest accuracy
- Time and power consumption
	- <img src="https://www.dropbox.com/s/dae7l1ba2pq2q6g/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.29.48.png?raw=1">  
	
## Other architectures
### Network in Network (NiN)
- <img src="https://www.dropbox.com/s/10pf7ggmbg8s96q/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.31.04.png?raw=1">

### Identity Mappings in Deep Residual Networks
- Improving ResNets
- <img src="https://www.dropbox.com/s/ks681wzr3wd65hu/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.33.58.png?raw=1">

### Wide Residual Networks
- Improving ResNets
- <img src="https://www.dropbox.com/s/z9ofk38bpzeq6yc/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.39.21.png?raw=1">

### ResNeXt(Aggregated Residual Transformations for Deep Neural Networks)
- Improving ResNets
- <img src="https://www.dropbox.com/s/3ty47k58c8rld0g/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.41.21.png?raw=1">

### Deep Networks with Stochastic Depth
- Improving ResNets
- <img src="https://www.dropbox.com/s/a7iq4hfz1xncjy8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.50.52.png?raw=1">

### FractalNet: Ultra-Deep Neural Networks without Residuals
- Beyond ResNet
- <img src="https://www.dropbox.com/s/pihtdvc6rnb5pqj/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.51.14.png?raw=1">


### Densely Connected Convolutional Networks
- Beyond ResNet
- <img src="https://www.dropbox.com/s/mx45kxnt4whhjol/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.51.51.png?raw=1">

### SqueezeNet: AlexNet-level Accuracy With 50x Fewer Parameters and <0.5Mb Model Size
- Efficient networks
- <img src="https://www.dropbox.com/s/ua0tsionrlhiat6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.53.08.png?raw=1">


## Summary
<img src="https://www.dropbox.com/s/dh3g1i4uwsilzx3/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-25%2014.53.33.png?raw=1">


## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)
- [Google Inception Model](https://norman3.github.io/papers/docs/google_inception.html) 




