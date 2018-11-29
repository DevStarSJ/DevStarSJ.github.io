---
layout: post
title: "CS231n 12강. Visualizing and Understanding"
subtitle: "Stanford CS231n Lecture 12.   Visualizing and Understanding"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0) 12강을 요약한 글입니다. 

## Question
---
- What's really going on inside convolutional networks?
- How did they do the things that they do?
- What kinds of features are they looking for?
- What are all these other layers in the middle doing?
- What are the intermediate features looking for?
- How ConvNets are working?
- What types of things in the image they are looking for?
- ConvNet 안에있는 레이어에서 어떤 일이 일어나고 있을까?
- 블랙박스라고 불리는 딥러닝 모델을 사람이 조금 더 해석할 수 있도록 도와주는 시각화 방법들에 대해 배웁니다


## First Layer : Visualize Filters
---
<img src="https://www.dropbox.com/s/4qolb65q8x3oo6p/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2012.05.49.png?raw=1">

- Filter로 구성됩니다. AlexNet은 여러개의 Convolution Filter가 존재합니다
- Get slide input image -> inner product
- Weight of filter and the pixel of the image
- Weight of filter를 시각화
	- oriented edges를 볼 수 있음(light bar and dark bar)
	- 다양한 각도에서 다양한 모습, 반대 색상 등
	- 강의 초반부에 말했듯, 사람의 뇌는 oriented edges를 찾음

## Intermediate layer
---
<img src="https://www.dropbox.com/s/h5u6yziqi1z6bza/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2012.16.47.png?raw=1">

- 생각보다 흥미롭지 않음. 해석하기 힘듬
- Input 이미지와 직접적으로 연결되어 있지 않음
- 그러나 두번째 레이어는 첫번째 레이어와 연결되어 있기 때문에 첫번째 이후의 Activation 패턴을 알 수 있음. 그러나 해석이 힘들기 때문에 다른 방법을 찾아야 합니다

## Last Layer
---
<img src="https://www.dropbox.com/s/gnpajyui0z3simg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2012.22.35.png?raw=1">

- AlexNet의 경우 4096차원의 feature vector
- ConvNet의 마지막 layer는 어떤 일을 하고 있을까?
- 알아보기 위해 많은 이미지를 네트워크에 돌려보고 마지막 레이어를 시각화

<img src="https://www.dropbox.com/s/qeozj796fwiipy0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2012.29.47.png?raw=1">

- 단순히 생각하면 Nearest Neighbors를 떠올릴 수 있음
- 2강에서 배운 것처럼 test image와 pixel space에서 이웃인 것을 찾습니다(좌측)
- ConvNet는 Semantic content가 유사하게 나옵니다. feature space에서 이웃인 것을 찾습니다
	- 코끼리의 좌측면이 Test image였는데 우측면이 이웃으로 나온 것은 pixel 관점에선 매우 다르지만 feature 관점에선 유사합니다!

<img src="https://www.dropbox.com/s/98rluzs2vwiibq5/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2012.42.57.png?raw=1">

- 차원 축소의 효과도 있습니다
- 4096 차원을 2 차원으로 압축	
- PCA, t-SNE도 같은 효과
- t-SNE
	- natural clustering
	- <img src="https://www.dropbox.com/s/dbkoa9uhy17wez9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2012.46.43.png?raw=1">
	- [karpathy의 CNN 코드](https://cs.stanford.edu/people/karpathy/cnnembed/) 참고
	- [김홍배님 Slideshare](https://www.slideshare.net/ssuser06e0c5/visualizing-data-using-tsne-73621033) 참고 

## Visualizing Activation
---
<img src="https://www.dropbox.com/s/o7xoy2nlz81a8uj/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2012.51.52.png?raw=1">

- 중간 레이어를 가중치를 시각화하는 것은 해석하기 힘들었지만, Activation을 시각화하는 것은 어떤 경우 해석 가능합니다
- 데이터를 네트워크에 넣고 어떤 이미지에서 특정 뉴런이 최대 활성화를 가지는지 봅니다. 그러면 입력 이미지와 연결된 영역을 볼 수 있습니다
- 왼쪽 아래 사진은 사람의 얼굴 feature로 보임
- 요약
	- Feature Map은 계층적인 응답을 보여줍니다. 예를 들어 눈 2개 + 혀 + 코 + 귀 => 개 얼굴
	- 각각의 Feature Map은 강하게 그룹화합니다
	- 높은 layer(layer 5)에서 변화가 큽니다
	- 이미지 내에서 다양한 위치의 영상을 선택할 수 있습니다

## Maximally Activating Patches
---
<img src="https://www.dropbox.com/s/vuaa6qn9k6glrye/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2013.19.50.png?raw=1">

- Visualizing intermediate feature의 다른 방법
- Input image의 특정 patch를 시각화
- conv5는 $$128 \times 13 \times 13$$, 17번 채널(총 128 중)을 선택
- 네트워크에 이미지를 많이 돌린 후, 선택된 채널의 value를 기록
- 그 후, 최대 activation에 해당하는 이미지 패치를 시각화합니다


## Occlusion Experiments
---
<img src="https://www.dropbox.com/s/vnwzj45x9v3sy7f/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2013.25.53.png?raw=1">

- Occlusion : 폐쇄
- input 이미지의 어떤 부분이 classification에 영향을 많이 미치는지 찾아보는 방법
- cnn에 넣기 전에, 이미지의 일부를 마스크하고 마스크 위치에서 확률의 히트맵(heatmap of probability)를 그립니다
- 이 실험은 이미지의 특정 부분을 block하면 network score가 극단적으로 변할것이고, 그러면 특정 부분은 classification decision에 매우 중요할 것이라는 아이디어에서 나왔습니다
- 빨간 색은 low probability고 하얀색/노란색은 high probability입니다. go-kart 부분을 block out하면 go-kart class 확률은 꽤 내려갈 것입니다
- 이 작업의 목적은 성능을 향상시키는 것이 아니라 사람이 조금 더 잘 이해할 수 있도록 돕는 것입니다

## Saliency Maps
---
<img src="https://www.dropbox.com/s/n8zt9s0i28jaohq/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2013.36.42.png?raw=1">

- saliency : 중요한
- 이미지 픽셀에 대해 class score의 gradient를 계산하고, 절대값을 취하기 + RGB 채널을 최대로 취하는 방식(이미지를 흔든다고 표현했음) 
- Input에서 어떤 이미지가 classification에 중요한지 파악하는 방법!(Occlusion Experiments처럼)
- Semantic Segmentation을 수행하기 위해 해당 작업을 하기도 함
- <img src="https://www.dropbox.com/s/h0ym48ycdcoow8v/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2013.49.26.png?raw=1">
- <img src="https://www.dropbox.com/s/dawuia4wibmjdz9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2013.56.18.png?raw=1">
- 이미지 내의 Object를 추출할 수 있어서 정말 좋음! 그러나 다루기 어렵고 효과를 보려면 엄청 많은 접근을 해야합니다. 따라서 이게 실용적인진 모르겠음
- 그러나 supervision과 함께 훈련된 것보다 훨씬 효과적일듯!
- fixed input image
- [위키피디아](https://en.wikipedia.org/wiki/Saliency_map) 참고

## Intermediate Features via (guided) backprop
---
<img src="https://www.dropbox.com/s/waxqanp7q40w4ry/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2018.57.25.png?raw=1">

- 이해가 잘 안됨..
- DeConv를 이용해 뉴런의 Gradient를 시각화하는 과정에서 사용하는 Back Propagation의 일종
- 일반적인 Back Propagation과 달리 Positive influence만 반영해 관심있는 뉴런의 Gradient를 선명하게 시각화 가능
- 이미지의 어떤 부분이 최고로 영향을 미치는지 확인할 수 있는 방법
- <img src="https://www.dropbox.com/s/g7y27b558qd8q9s/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2023.47.54.png?raw=1">
- fixed input image
- [Grad-CAM: 대선주자 얼굴 위치 추적기](http://jsideas.net/python/2018/01/12/grad_cam.html) 참고

## Gradient Ascent
---
<img src="https://www.dropbox.com/s/mrn5cbfftaea81k/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2000.21.19.png?raw=1">

- 참고 자료 : [Grad Cam을 이용한 딥러닝 모형 해석](http://freesearch.pe.kr/archives/4685), [엄태웅님 글](https://www.facebook.com/terryum/posts/10154593107119417)
- 일부 Input image에서 의존성을 제거합니다
- Gradient Ascent를 실행해 이미지를 합성
- Weight는 고정한 후, Input image의 픽셀을 변경
	- "하늘"이라는 초기 이미지를 주고 "새"의 속성을 갖도록 gradient ascent로 점점 변형 => 딥드림, 딥러닝 아트의 원리 
- Regularization Term
	- 특정 뉴런의 값을 Maximize
	- 그러나 자연스러운 이미지로 보이기

<img src="https://www.dropbox.com/s/mxchl8mryawjd85/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2000.21.38.png?raw=1">

- gradient ascent를 이미지 자체의 픽셀에 적용

<img src="https://www.dropbox.com/s/py1xr2napf5qg55/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2000.22.08.png?raw=1">

- Simple Regularizer : 생성된 이미지의 L2 norm을 penalize
- 이미지를 생성하기 시작


<img src="https://www.dropbox.com/s/9ui0hkcjpz42ekn/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2000.22.30.png?raw=1">

- 가우시안 블러 이미지를 추가하고, 작은 value를 가진 픽셀을 0으로 바꾸고, 작은 그라디언트를 가지는 픽셀을 0으로 바꿈 
- 위 결과로 조금 더 나은 시각화를 보여주고 있습니다
 
<img src="https://www.dropbox.com/s/wl67whk1new17r8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2000.22.49.png?raw=1">

<img src="https://www.dropbox.com/s/hc80l86fdfi38wy/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2000.23.00.png?raw=1">


<img src="https://www.dropbox.com/s/4sboypbf9j27fpk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2001.34.22.png?raw=1">

- Pixel space 대신 FC6 latent space를 최적화
- 궁금하면 논문을 꼭 읽어볼 것
- 해당 강의에서 깊게 들어가진 않겠음


## Fooling Images / Adversarial Examples
---

- 이미지를 속이는 것!
	- 임의의 이미지를 선택한 후, 다른 이미지의 점수를 최대화
	- 코끼리의 사진에 코알라의 점수를 최대화
	- 네트워크는 코끼리 사진을 코알라로 분류합니다 
- (1) Start from an arbitrary image
- (2) Pick an arbitrary class
- (3) Modify the image to maximize the class
- (4) Repeat until network is fooled

<img src="https://www.dropbox.com/s/k91g3bbm9claoy0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2000.50.07.png?raw=1">

- 위와 같은 행동이 어떻게 가능한지는 이안 굿펠로우의 강의를 통해서 알아볼 예정입니다

## DeepDream : Amplify existing features
---

<img src="https://www.dropbox.com/s/s4vcexd9hlofqxx/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2001.42.25.png?raw=1">

- 참고 자료 : [텐서플로우를 이용해서 딥드림(DeepDream) 알고리즘 구현해보기](http://solarisailab.com/archives/535)
- amplify : 증폭시키다
- image와 layer를 선택한 후, 아래 작업을 반복 
	- Forward
	- 선택된 레이어에서 Activation 값과 같은 Gradient를 설정
	- Backward
	- Update Image
- 한마디로 하면 Neural Networks의 Feature를 시각화하고 이를 Input 이미지와 결합해 환각적인 이미지를 만들어내는 알고리즘
- 하나의 뉴런이 아니라 레이어로 확장 

<img src="https://www.dropbox.com/s/fm27c1q42f37xyr/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2001.47.22.png?raw=1">

- 코드에서 사용한 몇가지 트릭
	- Jitter : 이미지를 두 픽셀씩 옮김
	- L1 Normalize
	- Clip pixel values

## Feature Inversion
---

- 이미지에 대한 feature vector가 주어지면, 다음과 같은 이미지를 찾습니다
	- 주어진 feature vector와 일치한 이미지
	- 자연스러운 이미지
	
<img src="https://www.dropbox.com/s/5jwscyjtxsxnlag/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2002.05.31.png?raw=1"> 

- relu2_2가 완벽히 재현되어 있는 것을 보면, 해당 레이어는 버리면 안된다는 뜻입니다
- relu5_3의 시각화는 이미지의 공간 구조는 유지한 채, 점점 색상 및 질감이 달라지고 있습니다
- 네트워크가 깊어지며 점점 Feature를 잃어버립니다


## Texture Synthesis
---

- 어떤 texture의 샘플 patch가 주어졌을 때, 같은 texture의 더 큰 이미지를 생성할 수 있을까요?
- 컴퓨터 그래픽에서 오래된 문제
- 동일한 texture를 가지는 두 이미지가 있다면, 두 이미지의 spatial statistics는 같다는 가정에서 진행
- 현재 픽셀 주변의 이웃을 계산한 후, 입력 이미지에서 한 픽셀을 복사
- 고전적인 알고리즘도 많이 있다는 것을 알려주고 싶었음. 자세히 몰라도 됨


## Neural Texture Synthesis
---

<img src="https://www.dropbox.com/s/b8ca9fbso1defk8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2002.16.59.png?raw=1">

## Neural Style Transfer
---

- [[코드](https://github.com/jcjohnson/neural-style)]

<img src="https://www.dropbox.com/s/zfl952phto2s483/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2002.19.04.png?raw=1">

<img src="https://www.dropbox.com/s/unq7wo4igefklv8/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2002.19.24.png?raw=1">

- 문제점 : many forward / backward가 필요해서 매우 느림
- 해결책 : 다른 neural network를 사용 => Fast Style Transfer

### Fast Style Transfer
- [[코드](https://github.com/jcjohnson/fast-neural-style)]

<img src="https://www.dropbox.com/s/k8tuhnb6uiikk6c/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2002.22.27.png?raw=1">


## Summary
---

<img src="https://www.dropbox.com/s/ncg1jjkfwjopf7q/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-05%2002.21.52.png?raw=1">



## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)
- [김홍배님 Slideshare](https://www.slideshare.net/ssuser06e0c5/visualizing-data-using-tsne-73621033)
- [Grad-CAM: 대선주자 얼굴 위치 추적기](http://jsideas.net/python/2018/01/12/grad_cam.html)