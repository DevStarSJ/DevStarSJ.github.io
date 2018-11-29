---
layout: post
title:  "YOLO(You only look once): Unified, real-time object detection 논문 리뷰"
subtitle:   "YOLO(You only look once): Unified, real-time object detection 논문 리뷰"
categories: data
tags: paper
comments: true
---
[YOLO(You only look once): Unified, real-time object detection 논문](https://arxiv.org/abs/1506.02640)을 정리한 글입니다!


## Intro
- YOLO 논문은 2015년에 나온 논문으로 (마지막 수정은 2016년 5월) 기존에 나왔던 R-CNN류의 문제점인 속도를 개선했습니다. 성능은 조금 줄이더라도 속도를 빠르게하는 것을 목표로 했으며, R-CNN류에서 1) Bounding Box Regression, 2) Detection Score를 찾는 2가지 Task를 YOLO에서는 1개의 Regression Task로 바꿔서 풀도록 재정의 했습니다. 

- 논문 제목에서 볼 수 있듯, 전체 이미지를 1번만 보고(Yon only look once), 기존에 존재하던 좋은 것들을 합쳤고(Unified), 빠른 속도(Real-time object detection)를 가진다는 특징을 가지고 있습니다
- YOLO는 v1~v5가 있는데 이 글은 v5 기반으로 작성되어 있습니다


## Abstract
- YOLO : object detection의 새로운 접근 방법
- Single neural network가 bounding box와 class probabilities를 예측
- 단일 네트워크를 사용하기 때문에 End-to-End로 성능을 최적화 가능
- Base YOLO : 45 FPS(frames per second)
- Fast YOLO : 155 FPS
	- 다른 real-time detector보다 2배 높은 mAP
- General representations of object를 학습 가능

## 1. Introduction
### 기존에 사용하던 DPM, R-CNN의 단점  
- 기존에 발표된 DPM(deformable parts models)나 R-CNN은 sliding window를 사용해 잠재적 bounding box를 구한 후, post-processing을 통해 bounding box를 재조정, 중복 제거, 재측정하는 과정을 가지고 있습니다.  
- 위와 같은 방식은 각각의 component를 따로 학습해야 하기 때문에 느리고 최적화하기 힘듭니다!

### YOLO 방법론
<img src="https://www.dropbox.com/s/3dmf2c368b7a76w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-02%2013.40.49.png?raw=1">

- Simple한 System
	- Input image를 448x448로 resize
	- single convolution network에 넣기
	- 모델의 confidence를 threshold
- Extremely fast
	- regression 문제로 바꿨기 때문에 복잡한 파이프라인이 필요 없습니다 
	- [Demo](https://pjreddie.com/darknet/yolo/)
- Globally
	- 전체 이미지를 넣음
	- Fast R-CNN에 비해 절반 이하의 background errors 
- Generalizable representation
	- object의 일반화된 표현을 학습
	- 새로운 도메인이나 예상치 못한 input에 대해 세분화되지 않고 일반화 가능
	- ex) 사진으로 학습하고 그림 이미지로 예측할 경우 잘 맞습니다
	- Context 정보를 많이 사용합니다
- training / testing code는 open source로 존재 


## 6. Conclusion
- YOLO는 simple하고 빠르게 학습 가능!


## 2. Unified Detection
- 여러 component들을 단일 neural network로 합침
- bounding box를 예측하기 위해 전체 이미지를 사용
- 이미지에 대한 모든 클래스와 bounding box를 동시에 예측합니다


<img src="https://www.dropbox.com/s/qf4vrq8udy8mcwe/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-02%2014.33.00.png?raw=1">

- System
	- input image를 $$S \times S$$ grid로 나눕니다
		- 물체의 중심이 grid cell에 속하면 grid cell이 물체를 탐지합니다 
	- 각각의 grid cell이 B개의 Bounding box와 BB에 대한 confidence score를 예측합니다
		- confidence score : box에 물체가 있는지, 상자가 예측한 정확도가 얼마나 정확한지를 나타내는 척도
		- $$Pr(Object) * IOU_{pred}^{truth}$$
		- 물체가 없다면 0
		- confidence score가 IOU와 동일하길 원함
	- Bounding box는 5 prediction으로 구성
		- $$(x, y)$$ : center of the box
		- $$w, h$$ : whole image에 대비한 예측값
		- $$confidence$$ : 예측된 box와 다른 ground truth box간의 IOU
	- grid cell은 또한 C개의 conditional class probability를 예측
		- $$Pr(Class_{i}\mid Object)$$ : object가 있을 grid cell의 확률 
	- test시에 conditional class probability와 individual box confidence prediction을 곱합니다
	- $$Pr(Class_{i}\mid Object) * Pr(Object) * IOU_{pred}^{truth} = Pr(Class_{i}) * IOU_{pred}^{truth}$$
	- 각 상자마다 특정 클래스에 대한 확률을 알 수 있습니다
	- 평가시 Pascal VOC를 사용, $$S=7, B=2, C=20$$
	- 따라서 final prediction은 $$7 \times 7 \times 30$$ tensor (v5)
	- v1은 Bounding box를 1개와 $$7 \times 7 \times 24$$ tensor를 final prediction에서 return합니다!



### 2.1 Network Design
<img src="https://www.dropbox.com/s/fbzemhal9672ima/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-02%2014.42.00.JPG?raw=1">

- GoogleNet 모델 기반
	- 24 Convolution layer, 2 Fully Connected layer
	- 인셉션 대신 1x1 reduction layer를 넣어 네트워크의 파라미터를 줄였습니다
- Fast YOLO는 9개의 Convolution layer

### 2.2 Training
- 참고 슬라이드 : [YOLO CVPR 2016](https://goo.gl/yXjGnv)
- ImageNet 1000-class dataset을 사용해 20개의 Convolution layer pretrain
- pretrain 이후 4 convolutiona layer와 2 fully connected layer 추가(with randomly initialized wieghts)
- Detection에선 세밀한 정보가 필요하기 때문에 input size 224x224를 448x448로 증가
- Bounding Box width, height를 이미지의 width, height로 0~1로 Normalization
- Bounding Box의 x, y는 특정 grid cell의 offset값 사용
- final layer에서 linear activation function 사용

<img src="https://www.dropbox.com/s/c1bfbn6ghkto7x8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-02%2015.08.02.png?raw=1">

- MSE보다 쉽게 최적화할 수 있는 SSE(Sum-Squared Error)를 최적화 합니다

- 대부분이 object가 존재하지 않기 때문에 0으로 많이 차게 됩니다. 이런 상황이라면 해당 셀의 confidence score가 0으로 수렴하며 object가 포함된 셀의 gradient를 압도할 수 있습니다. 이로 인해 학습이 불안해질 수 있습니다
- 위 문제를 해결하기 위해 bounding box coordinate predictions의 loss를 증가시키고 confidence predictions for boxes that don’t contain objects의 loss를 감소시킵니다 
- 이 때 사용하는 2개의 파라미터가 $$\lambda_{coord}$$와 $$\lambda_{noobj}$$! 
	- $$\lambda_{coord}=5$$ $$\lambda_{noobj}=.5$$
	- $$\lambda_{coord}$$ : coordinates(x,y,w,h)에 대한 loss와 다른 loss들과의 균형을 위한 balancing parameter
	- $$\lambda_{noobj}$$ : obj가 있는 box와 없는 box간에 균형을 위한 balancing parameter. (일반적으로 image내에는 obj가 있는 cell보다는 obj가 없는 cell이 훨씬 많으므로)
- SSE는 큰 BB와 작은 BB의 error를 동일하게 평가합니다. 큰 BB가 중요하다는 것을 반영하기 위해 bounding box의 width와 height sqaure root를 사용합니다
- Batch size : 64
- Momentum : 0.9, decay of 0.0005
- Learning Rate : 0.001 -> 0.01로 상승(epoch마다) 75 epoch동안 0.01, 30 epoch동안 0.001, 30 epoch동안 0.0001
- Dropout : 0.5
- data augmentation : random scaling andtranslations of up to 20% of the original image size

### Loss Function
<img src="https://www.dropbox.com/s/zcojhtf83ytac80/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-02%2015.49.37.png?raw=1">

출처 : [박진우님 블로그](https://curt-park.github.io/2017-03-26/yolo/)


### 2.3 Inference
- 참고 슬라이드 : [Deep System's YOLO](https://docs.google.com/presentation/d/1aeRvtKG21KHdD5lg6Hgyhx5rPq_ZOsGjG5rJ1HP7BbA/pub?start=false&loop=false&delayms=3000&slide=id.g137784ab86_4_969)

### 2.4 Limitations of YOLO
- 큰 object와 작은 object의 중심이 비슷할 경우, 둘 중 1개도 인식하지 못하는 경우가 있으며, loss function에서 큰 box에 제곱근을 취하지만 여전히 작은 물체에게 불리한 구조입니다
- grid cell이 1개의 클래스만 예측하기 때문에 작은 object가 여러 개 있는 경우 제대로 구분하지 못합니다
- 학습시 사용한 bounding box의 형태가 아닐 경우(=새로운 bounding box) 예측할 때 어려움이 생깁니다
- 작은 BB와 큰 BB의 error를 동일하게 처리하므로 잘못된 localization을 발생합니다
	- fully connected layer를 2번 태워서 $$x,y,w,h$$를 맞추려고 하는데 이 값은 애초에 맞추기 힘든 값입니다.  

## 4. Experiment
<img src="https://www.dropbox.com/s/sny745golyk7ox9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-02%2023.45.18.png?raw=1">

- 특이한 것은 Fast R-CNN + YOLO의 앙상블이 가장 점수가 높은 것
	- YOLO는 배경에 대해 판단하지 않으며, Localization이 되지 않습니다
	- 동시에 나온 것은 Fast R-CNN을 사용하고
	- Fast R-CNN만 나오면 지워버리는 식으로(false-positive)  앙상블

## Reference
- [PR12: 전태균님의 PR-016](https://www.youtube.com/watch?v=eTDcoeqj1_w)
- [박진우님 블로그](https://curt-park.github.io/2017-03-26/yolo/)
