---
layout: post
title: "CS231n 11강. Detection and Segmentation"
subtitle: "Stanford CS231n Lecture 11.  Detection and Segmentation"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0) 11강을 요약한 글입니다. Object Detection, Segmentation, Localization, Classification 등의 개념에 대해 나옵니다

## Computer Vision Tasks
---
<img src="https://www.dropbox.com/s/4i6bkbxgrczmoa4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2017.48.38.png?raw=1">

## Semantic Segmentation
---
- No objects, just pixels
- Input : Image
- Output : decision of a category for every pixel(픽셀별로 어떤 카테고리에 속하는지 알려줌)
- 픽셀이 어떤 것을 나타내는지 알려주지만, 개별에 대해선 분류할 수 없음(2개 이상의 물체를 같은 것으로 인식) 추후 instance segmentation에서 이 문제를 해결할 예정입니다
- Semantic Segmentation은 classification을 통해 진행될 수 있습니다. 
- Sliding Window Approach
	- <img src="https://www.dropbox.com/s/8anxhez11qxfhph/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2019.16.39.png?raw=1">
	- 잘려진 patch마다 어떤 class인지 유추
	- 이 방법은 computation이 비싼 방법이고 중복되는 patch 사이에서 공유된 feature를 재사용하지 않습니다

- Fully Convolutional
	- <img src="https://www.dropbox.com/s/77k01d9nwg3zb0e/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2019.48.35.png?raw=1"> 
	- 3x3 filter를 사용해 이미지 크기를 유지하며 convolution에 넣음
	- 한번에 모든 픽셀을 예측할 수 있도록 설계
	- Output : $$C \times H \times W$$의 Tensor
	- 그러나 원본 이미지를 그대로 convolution하는 것은 비싼 연산
- Fully Convolutional with downsampling and upsampling
	- <img src="https://www.dropbox.com/s/1skukn7fhm3vo15/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2019.51.43.png?raw=1">
	- max pooling 또는 strided convolution을 통해 downsampling
	- unpooling을 통해 upsampling

### Upsampling
- 1) Unpooling 
	- <img src="https://www.dropbox.com/s/221p7tcs63yx13z/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2020.02.38.png?raw=1"> 
	- pooling의 반대 작업으로, unpooling 지역의 receptive field의 값을 복제
	- we duplicate receptive filed of unpooling region 
	- 하지만 우측처럼 나머지 값이 0일 경우는 Bed of Nails(무척 괴롭다)
	- <img src="https://www.dropbox.com/s/zalecyet3u20mlt/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2020.05.42.png?raw=1">
	- max pooling을 할 때 max인 값을 기억했다가 Max Unpooling할 때 사용. 해당 위치 말고는 모두 0으로 채워넣음
	- fixed function
- 2) Transpose Convolution
	- <img src="https://www.dropbox.com/s/xmngk1icaeewfn5/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2020.44.12.png?raw=1"> 
	- [딥러닝에서 사용되는 여러 유형의 Convolution 소개](https://zzsza.github.io/data/2018/02/23/introduction-convolution/) 참고
	- [Up-sampling with Transposed Convolution](https://towardsdatascience.com/up-sampling-with-transposed-convolution-9ae4f2df52d0) 이 글도 좋습니다 
	- <img src="https://www.dropbox.com/s/ksuhdbpji514bqm/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-04%2021.46.09.png?raw=1">
	- Convolution Operation은 input values와 output values 사이에 공간 연결성을 가지고 있습니다. 3x3 kernel을 사용한다면, 9개의 values가(kernel) 1개의 value(output, 문지른 후의 결과물)와 연결됩니다. 따라서 many to one 관계라고 볼 수 있습니다
	- Transposed Convolution은 1개의 value를 9개의 values로 변경합니다. 이것은 one to many 관계라고 볼 수 있습니다
	- 필터의 값 사이에 0을 넣은 매트릭스를 Transpose한 후, 곱해줍니다
	- <img src="https://www.dropbox.com/s/bp3752jefh3afh0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-04%2021.45.07.png?raw=1"> 
	- Others names
		- Deconvolution (bad)
		- Upconvolution
		- Fractionally strided convolution
		- Backward strided convolution  
	- <img src="https://www.dropbox.com/s/cqctzx5cvltcij4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2020.49.58.png?raw=1">
	- <img src="https://www.dropbox.com/s/arpn3e0mv30hu3x/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2020.50.13.png?raw=1">
	- <img src="https://www.dropbox.com/s/1k0cadcrwnyd6gs/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2020.50.28.png?raw=1">
	
## Classification + Localization
---
- Single Object
- what the category is, where is that object in the image?
- Output : Bounding Box(around the region of label), label
- <img src="https://www.dropbox.com/s/z00qe7byrx5mfl7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.08.26.png?raw=1">
- localization은 regression 문제!
- Multi Task Loss를 계산
- 처음부터 학습하기 어려울 수 있으니, ImageNet의 pretrain 모델을 사용하기도 합니다(Transfer Learning)

### Aside: Human Pose Estimation
- <img src="https://www.dropbox.com/s/abkhej73sbr81ln/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.19.22.png?raw=1">
- Pose Estimation에도 활용할 수 있음. Image를 넣으면 14개의 join position이 나옴


## Object Detection
---
- Computer Vision의 핵심 Task
- Multiple Object
- Output : Bounding Box(around the region of label), label
- <img src="https://www.dropbox.com/s/4haq3yi3kofs97h/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.32.09.png?raw=1">
- 딥러닝을 활용한 이후부터 점점 성능이 좋아지고 있음
- <img src="https://www.dropbox.com/s/rkvak3iygc2x1mi/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.30.40.png?raw=1">
- Localization과의 차이점은 동일한 종류의 물체가 여러 개 있다면 Object Detection은 모두 잡음(Localization은 1개로 취급)
- Sliding Window Approach
	- <img src="https://www.dropbox.com/s/0yutw6hzkoi73lr/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.35.08.png?raw=1"> 
	- 다른 모양의 crop에서 물체인지 배경인지 분류
	- 거대하고 많은 crop이 필요한데, 이게 비싼 연산
- Region Proposals
	- Selective Search 방법으로 물체가 있을만한 Region을 1000~2000개 생성
	- CPU에서 연산 

### R-CNN
<img src="https://www.dropbox.com/s/15q9t3gob3uh5mk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.38.34.png?raw=1">

- 문제점
	- <img src="https://www.dropbox.com/s/xbi5yfdxzdd6vep/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.38.53.png?raw=1">	
	
### Fast R-CNN
<img src="https://www.dropbox.com/s/s06dn3m0kkva9yv/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.45.02.png?raw=1">

- ConvNet을 통해 나온 feature map에서 RoIs를 찾음
- RoI Pooling
	- <img src="https://www.dropbox.com/s/4rgyul9b1hhufb4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.46.55.png?raw=1">
	- Fully Connected Layer는 Fixed size input이 필요한데, RoI Pooling이 작업을 수행 
- <img src="https://www.dropbox.com/s/hkfp6hqroxnpa75/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.49.53.png?raw=1">
- <img src="https://www.dropbox.com/s/40whvs6gkf6nc72/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.50.55.png?raw=1">
- Fast R-CNN은 여전히 Bottleneck을 보유


### Faster R-CNN
<img src="https://www.dropbox.com/s/pltqmq00jhhxyg9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2021.51.26.png?raw=1">

- RPN(Region Proposal Network)을 추가해서 성능 개선
	- Output : Object 유무, Object Proposal
- <img src="https://www.dropbox.com/s/kz6ymlidnuuiwca/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.00.29.png?raw=1">

- [Faster R-CNN 논문 리뷰](https://zzsza.github.io/data/2018/05/09/Faster-RCNN-review/) 참고


<img src="https://github.com/zzsza/Deep_Learning_starting_with_the_latest_papers/raw/master/Lecture_Note/images/imagedetection011.png">



### Detection without Proposals: YOLO / SSD
<img src="https://www.dropbox.com/s/dkq9z8d36m9ctwd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.01.44.png?raw=1">

- 해당 논문을 꼭 보는 것이 좋을듯! CS231 설명은 너무 빈약
- [박진우님 YOLO 분석](https://curt-park.github.io/2017-03-26/yolo/)

### Aside: Object Detection + Captioning = Dense Captioning
<img src="https://www.dropbox.com/s/mmybjh7mgr2d62u/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.08.23.png?raw=1">

- region에 대한 예측보다 region에 대한 캡션을 작성하려고 함
- Faster R-CNN처럼 보임(region proposal stage, bounding box, processing per region)
- 그러나 실제론 각각의 region에 대한 캡션을 예측하는 RNN 모델

<img src="https://www.dropbox.com/s/6pzj07r7dgpuivz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.08.34.png?raw=1">

- 특정 문제로부터 배운 것을 다른 Task에 적용할 수 있음(Multi Task) 

## Instance Segmentation
---
- Object Detection에서 Bounding Box 대신 Segmentation

### Mask R-CNN
<img src="https://www.dropbox.com/s/ar2p00c0jokhelw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.17.02.png?raw=1">

<img src="https://www.dropbox.com/s/01zf2ahk9hb490b/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.18.28.png?raw=1">

<img src="https://www.dropbox.com/s/9aj4hanhstjwzdp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.18.41.png?raw=1">

<img src="https://www.dropbox.com/s/y8qrrxar9cuew1x/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-30%2022.18.54.png?raw=1">



## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)
- [이진원님의 PR-012: Faster R-CNN](https://youtu.be/kcPAGIgBGRs)
- [딥러닝에서 사용되는 여러 유형의 Convolution 소개](https://zzsza.github.io/data/2018/02/23/introduction-convolution/)
- [Up-sampling with Transposed Convolution](https://towardsdatascience.com/up-sampling-with-transposed-convolution-9ae4f2df52d0)
- [Faster R-CNN 논문 리뷰](https://zzsza.github.io/data/2018/05/09/Faster-RCNN-review/) 
