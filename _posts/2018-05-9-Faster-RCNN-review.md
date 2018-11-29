---
layout: post
title:  "Faster R-CNN 논문 리뷰"
subtitle:   "Faster R-CNN 논문 리뷰"
categories: data
tags: paper
comments: true
---
[Faster R-CNN: Towards Real-Time ObjectDetection with Region Proposal Networks](https://arxiv.org/abs/1506.01497)을 정리한 글입니다!


## Introduction
- Faster R-CNN 논문은 Fast R-CNN을 보완한 논문입니다
	- 기존에 사용되던 Region Proposal 방법인 Selective Search는 CPU에서 계산
	- CNN 외부에서 진행
- GPU의 이점을 최대한 활용하고 CNN 내부에서 진행하기 위해 ```Region Proposal Network(RPN)```을 도입
	- RPN은 각 위치의 object bounds와 objectness score를 동시에 예측하는 fully convolutional network입니다

## Architecture
<img src="https://www.dropbox.com/s/qmnhgdsp39y15ig/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.55.05.png?raw=1">

<img src="https://www.dropbox.com/s/db46mw6e5gg63m1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2016.38.34.png?raw=1"  width="400" height="300">

- 2개의 Network
	- Region Proposal Network
	- 위에서 나오는 proposed regions을 사용해 object 감지하는 Detector

### Input
- $$Height \times Width \times Depth$$ 
- RGB Color를 갖는 이미지

### Feature Extraction
- pretraind model을 사용해 Feature Map 생성
- input : 이미지
- output : object의 Feature Maps

### Region Proposal Network
- input : Feature Extraction에서 뽑은 Feature Maps
- output layer
	- classification layer : Object 유무
	- reg layer : Object Proposal 
- Feature Maps 위에 $$n \times n$$ spartial window(보통 $$3\times 3$$)를 슬라이드
- sliding-window가 찍은 지점마다 여러 Region Proposal(Anchor) 예측
- Anchor 
	- sliding window의 각 위치에서 Bounding Box의 후보로 사용되는 상자
	- $$k$$로 표현 
	- 3개의 크기(128, 256, 512), 3개의 비율(2:1, 1:1, 1:2) = 9개의 조합
 
<img src="https://www.dropbox.com/s/kchvbnvhzpko90c/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2017.05.40.png?raw=1">
 
- Classification layer
	- 모든 anchor마다 foreground, background 분류
	- Anchor가 ground truth box와 IoU가 가장 크고 0.7 이상이면 foreground, 적으면 background
		- ground truth box : 실제 box의 좌표
		- IoU : Intersection over Union
		- foreground는 positive anchor
		- background는 non-positive anchor
		
<img src="https://www.dropbox.com/s/j153zidy9yzwheb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2017.30.01.png?raw=1" width="300" height="100">

<img src="https://www.dropbox.com/s/ptkiwnt1qnb9dec/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2017.30.04.png?raw=1" width="300" height="100">

- Regression layer
	- Bounding box regression 
	- $$t$$는 4개의 좌표값을 가지고 있으며 ground-truth $$t^*$$도 4개의 좌표값을 가지고 있습니다
  
<img src="https://www.dropbox.com/s/2xoyrni0vjf9yfg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2017.37.54.png?raw=1" width="300" height="150">
  
### Region of Interest Pooling
- RPN을 지나면 서로 다른 크기의 proposed region이 나옵니다. 서로 다른 크기의 region을 동일한 크기로 맞추기 위해 RoI Pooling을 사용합니다
- Fixed-size resize
	- RoI Pooling 대신 object detection을 구현할 떄 많이 쓰이는 방법으로, feature map을 crop시킨 후, 고정된 크기로 보간해 resize
	- 그 이후 $$2 \times 2$$ kernel을 사용해 $$7\times 7 \times depth$$로 max pooling

## Training
### Loss Function
<img src="https://www.dropbox.com/s/gc7x357egci6euw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2017.50.58.png?raw=1" width="400" height="150">

- $$i$$ : anchor의 index
- $$p_{i}$$ : anchor $$i$$가 객체인지 배경인지 예측값
- $$p_{i}^{*}$$ : ground-truth label, 1은 객체(positive)를 뜻하며 0은 배경(negative) 
- $$L_{cls}$$ : 객체인지 배경인지의 log loss
- $$N_{cls}$$ : normalization 값, mini-batch값
- $$t_{i}$$ : 4개의 bounding box 좌표
- $$t_{i}^{*}$$ : ground-truth box
- $$L_{reg}$$ : 객체가 있을 경우 loss function. smmoth l1 loss 사용
- $$N_{reg}$$ : normalization, anchor locations의 갯수
- $$\lambda$$ : 기본값 10

### Training RPN
- 한 이미지에서 random으로 mini-batch만큼 anchors를 샘플링
- 이 때, positive anchor와 non-positive anchor를 1:1 비율로 사용
	- 보통 negative anchors가 더 많기 때문에 비율을 조정하지 않으면 학습이 한쪽으로 편향됨
	- 하지만 positive anchor가 128개보다 적으면 zero-padding을 시켜주거나 아예 positive가 없으면 IoU값이 높은 값을 사용 
- weight는 랜덤하게 초기화
- ImageNet classification으로 fine-tuning
- Learning Rate : 0.001(60k mini batch), 0.0001(20k mini batch)
- Momentum : 0.9
- Weidght decay : 0.0005

## Results

|                                     | R-CNN | Fast R-CNN | Faster R-CNN |
|-------------------------------------|-------|------------|--------------|
| Test time per Image (with proposal) | 50s   | 2s         | 0.2s         |
| 상대적 Speed                        | 1x    | 25x        | 250x         |
| mAP (VOC 2007)                      | 66.0  | 66.9       | 69.9         |


## Experiments
<img src="https://www.dropbox.com/s/3qbw2fsoxiizpwr/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2018.13.23.png?raw=1">

- Table 2. RPN을 사용했을 때 mAP가 조금 더 좋음

<img src="https://www.dropbox.com/s/65am2mn813yyeqe/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-09%2018.14.38.png?raw=1" width="400" height="500">

- Table 8 : 3 scales, 3 ratios를 사용할 때 성능이 가장 좋았음
- Table 9 : lambda값이 10일 때 성능이 가장 좋았음


## Conclusion
- Our methodenables a unified, deep-learning-based object detectionsystem to run at **near real-time frame rates**

## 각종 방법론
<img src="https://github.com/zzsza/Deep_Learning_starting_with_the_latest_papers/raw/master/Lecture_Note/images/imagedetection011.png">

## Reference
- [PR12: 이진원님의 PR-012](https://www.youtube.com/watch?v=kcPAGIgBGRs&list=PLlMkM4tgfjnJhhd4wn5aj8fVTYJwIpWkS&index=13&t=0s)
- [박진우님 블로그](https://curt-park.github.io/2017-03-17/faster-rcnn/)
- [논문으로 시작하는 딥러닝 Edwith](http://www.edwith.org/deeplearningchoi)
