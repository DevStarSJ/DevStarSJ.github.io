---
layout: post
title:  "Tiny SSD 논문 리뷰"
subtitle:   "Tiny SSD 논문 리뷰"
categories: data
tags: paper
comments: true
---
[Tiny SSD: A Tiny Single-shot Detection Deep Convolutional Neural Network for Real-time Embedded Object Detection](https://arxiv.org/pdf/1802.06488.pdf)을 정리한 글입니다!

- 2018.2월에 나온 논문

## Abstract
- 최근 embeded 기기에 적합한 object detection architecture에 대해 관심이 많아졌습니다
	- Tiny YOLO, SqueezeDet
- SqueezeNet에서 나온 Fire microarchitecture + SSD에서 나온 single-shot detection macroarchitecture 
- model size : 2.3MB (~26X smaller than Tiny YOLO)
- maP : 61.3% on VOC 2007 (~4.2% higher than Tiny YOLO)

## 1. Introduction
- Object Detection은 combination of object classi-fication과 object localization 문제를 동시에 고려하는 문제입니다
- Small Deep Neural Network에 대한 관심 증가
	- YOLO, YOLOv2
		- (1) 모델 사이즈는 753MB, 193MB
		- (2) 임베디드 칩에서 실행될 때 object detection 속도가 급격히 떨어짐
	- Tiny YOLO
		- 네트워크 구조를 축소해 모델 크기를 줄임(60MB)
		- 부동 소수점 연산수를 대폭 줄이고 객체 감지 정확도를 희생
	- SqueezeDet
		- SqueezeNet의 Fire microarchitecture를 활용한 Fully Convolutional neural network
		- 성능이 좋고 자율 주행에 들어갈만큼 작은 사이즈로 만듬
		- 그러나 object categories를 3개만 탐지 가능
	- 실시간 Object Detection(on embeded)에 적합하며, 다양한 카테고리에서 높은 정확도를 달성하는 네트워크를 계속 만드려고 도전중

- **Tiny SSD** : Fire microarchitecture introduced in SqueezeNet + single-shot detection macroarchitecture introduced
in SSD
	- non-uniform fire sub-network를 stack
	- check : non-uniform의 의미 찾아보기
	- 2개의 main sub-network를 stack
		- 1) non-uniform Fire sub-network stack
		- 2) non-uniform sub-network stack of highly optimized SSD-based auxiliary convolutional feature layers

	
## 2. Optimized Fire Sub-Network Stack
-  SqueezeNet
	- 1) reduce the number of 3 $$\times$$ 3 filters as much as possible  
	- 2) reduce the number of input channels to 3 $$\times$$ 3 filters where possible
	- 3) perform downsampling at a later stage in the network

	
### Fire microarchitecture
<img src="https://www.dropbox.com/s/qsfnxmp8iqxh27s/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-17%2016.43.19.png?raw=1" width="500" height="400">

- **Squeeze** convolutional layer of 1x1 filters
	- 3 $$\times$$ 3 필터에 대한 input channels을 줄이는 2)를 실행
- **Expand** convolutional layer comprised of both 1 $$\times$$ 1 filters, 3 $$\times$$ 3 filters
	- 3 $$\times$$ 3 필터의 수를 줄이는 1)를 실행 
	
- First sub-network stack
	- Fire modules로 최적화된 standard convolutional layer로 구성
	- Key Challange : Fire module의 갯수와 아키텍쳐를 결정하는 것
	- 물체 감지 성능과 모델 크기, 추론 속도의 균형	
	- 10 Fire modules ( 경험적으로 선택 )
	- Key design parameters : (1 $$\times$$ 1 filters, 3 $$\times$$ 3 filters) 필터의 수
- SqueezeNet 네트워크 아키텍처와 Fire 모듈의 microarchitecture는 거의 동일
	
<img src="https://www.dropbox.com/s/6rsovgsk41ksfm0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-17%2017.16.46.png?raw=1" width="500" height="800">

	
## 3. Optimized Sub-network stack of SSD based Convolutional Feature layers
- 널리 사용되고 효과적인 SSD macroarchituecture
	- base feature extraction network architecture
		- convolutional feature layers + convolutional predictors  	
		- auxiliary convolutional feature layers에서 얻을 수 있는 것
			- 1) a confidence score for a object category
			- 2) shape offset relative to default bounding box coordinates 
	
<img src="https://www.dropbox.com/s/2t6ct7ch4cvrp5m/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-17%2017.46.47.png?raw=1" width="500" height="400">

- Key Challenge : auxiliary convolution feature layer와 convolutional predictor를 결정하는 것
- Key Design parameter : the number of filters

## 5. Experimental results and discussion
- Training Setup
	- iteration : 220,000
	- batch size : 24
	- RMSprop, learning rate = 0.00001
	- $$\gamma$$ = 0.5 



## Reference
- [Tiny SSD: A Tiny Single-shot Detection Deep Convolutional Neural Network for Real-time Embedded Object Detection](https://arxiv.org/pdf/1802.06488.pdf)
- [Tiny SSD Reading Note](https://joshua19881228.github.io/2018-03-04-Tiny_SSD/)