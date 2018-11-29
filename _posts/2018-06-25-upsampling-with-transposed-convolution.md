---
layout: post
title: "Up-sampling with Transposed Convolution 번역"
subtitle: "Up-sampling with Transposed Convolution 번역"
categories: data
tags: dl
comments: true
---

[Naoki Shubuya](https://towardsdatascience.com/@naokishibuya)님의 [Up-sampling with Transposed Convolution](https://towardsdatascience.com/up-sampling-with-transposed-convolution-9ae4f2df52d0)을 허락받고 번역한 글입니다.  
번역이 어색한 경우엔 영어 표현을 그대로 사용했으며, 의역이 존재할 수 있습니다. 피드백 언제나 환영합니다!

---

# Up-sampling with Transposed Convolution

이 글은 Transposed convolution에 대해 들었본 적이 있지만 실제로 무엇을 의미하는지 모르는 사람을 위한 글입니다.  

이 글에서 다루는 컨텐츠는 다음과 같습니다

- Up-sampling의 필요성
- 왜 Transposed Convolution인가?
- Convolution 연산
- Going Backward
- Convolution Matrix
- Transposed Convolution Matrix
- Summary

노트북은 [Github](https://github.com/naokishibuya/deep-learning/blob/master/python/transposed_convolution.ipynb)에서 확인할 수 있습니다

## Up-sampling의 필요성
---

Neural networks를 사용해 이미지를 생성할 때, 일반적으로 저해상도에서 고해상도로 Up-sampling합니다

<img src="https://www.dropbox.com/s/bcovkp2hhf8j87m/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2019.15.53.png?raw=1">

up-sampling 연산을 수행하는 다양한 방법이 있습니다  

- Nearest neighbor interpolation
- Bi-linear interpolation
- Bi-cubic interpolation

> 역자 : [CS231 2017 11강](https://zzsza.github.io/data/2018/05/30/cs231n-detection-and-segmentation/)에선 Upsampling하는 방법으로 Unpooling, Transpose convolution을 말합니다

이런 방법들은 네트워크 아키텍처를 결정할 때 보간 방법을 필요로 합니다. 이것은 수동적인 feature engineering이며 network가 알 수 없습니다.

## 왜 Transposed Convolution인가?
---

Up-sampling을 최적으로 하려면 [Transposed convolution](https://arxiv.org/abs/1603.07285)를 사용하면 됩니다. Transposed convolution은 미리 정의된 보간 방법을 사용하지 않으며 학습 가능한 parameter들이 있습니다.  

다음과 같은 중요한 논문 및 프로젝트에서 사용되는 Transposed convolution을 이해하면 유용합니다

- [DCGAN](https://arxiv.org/pdf/1511.06434v2.pdf)의 generator는 무작위로 샘플링된 값을 사용해 full-size 이미지를 생성합니다
- [Semantic segmentation](https://people.eecs.berkeley.edu/~jonlong/long_shelhamer_fcn.pdf)은 convolutional 레이어를 사용해 encoder에서 feature를 추출한 다음, original 이미지의 모든 픽셀을 분류하기 위해 decoder에서 original 이미지 크기를 복원합니다.  

참고로 Transposed convolution은 아래와 같이 불리기도 합니다

- Fractionally-strided convolution
- Deconvolution

> 역자 : Upconvolution, Backward strided convolution라고도 불립니다

이 글에선 transposed convolution이란 단어만 사용하지만 다른 글에선 위처럼 쓰일 수 있습니다

## Convolution 연산
---

Convolution 연산이 어떻게 진행되는지 설명하기 위해 간단한 예시를 들겠습니다.  
4x4 matrix와 convolution 연산(3x3 kernel, no padding, stride 1)이 있다고 가정하겠습니다. 아래 이미지에서 볼 수 있듯, output은 2x2 matrix입니다.

<img src="https://www.dropbox.com/s/c4l6cgmaih3n3s6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2021.13.17.png?raw=1">

Convolution 연산은 input matrix와 kernel matrix간 element-wise 곱의 합으로 계산합니다. 패딩이 없고 stride가 1이라 4번의 연산만 할 수 있습니다. 따라서 output matrix는 2x2입니다.  

<img src="https://www.dropbox.com/s/j0pr994htyhke87/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2021.19.54.png?raw=1">

이런 convolution 연산의 한 가지 중요한 점은 input matrix와 output matrix 사이에 위치 연결성(positional connectivity)이 존재하는 것입니다

예를 들어, input matrix의 상단 왼쪽의 값은 output matrix의 상단 왼쪽값에 영향을 줍니다 
 
조금 더 구체적으로, 3x3 커널은 input matrix의 9개의 값을 output matrix 1개의 값에 연결할 때 사용됩니다. convolution 연산은 many-to-one 관계를 형성합니다. 추후 이 개념이 필요하므로 꼭 기억해주세요.

## Going Backward
---

이제 다른 것을 해보겠습니다. matrix의 값 1개를 다른 matrix의 값 9개와 연결하려고 합니다. 이는 one-to-many 관계입니다. convolution 연산을 반대로 하는 것과 같으며, transposed convolution의 핵심 개념입니다.  

예를 들어, 2x2 matrix 4x4 matrix로 up-sampling합니다. 이 연산은 1-to-9 관계를 형성합니다.  

<img src="https://www.dropbox.com/s/7nduoohyfthas3m/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2021.49.50.png?raw=1">

그러나 이런 연산을 어떻게 수행할까요?

설명을 위해, convolution matrix와 transposed convolution matrix를 정의하겠습니다.  

## Convolution matrix
---

Matrix를 사용해 convolution 연산을 표현할 수 있습니다. convolution 연산을 수행하고 matrix 곱을  위해 kernel matrix를 재배치합니다

<img src="https://www.dropbox.com/s/juw4z76hghpcb0w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2022.12.31.png?raw=1" width="300" height="300">

3x3 kernel을 4x16 matrix로 재배치하겠습니다:

<img src="https://www.dropbox.com/s/t5e6crl9cba98bc/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-10%2022.14.53.png?raw=1">

Convolution matrix입니다. 각 row는 1개의 convolution 연산을 뜻합니다. 이것을 처음 본다면 아래 다이어그램이 도움이 될 수 있습니다. convolution matrix는 그냥 zero padding을 포함해 재배치한 kernel matrix라고 생각하면 됩니디

<img src="https://www.dropbox.com/s/p1ol30wf8njno7f/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-25%2015.56.13.png?raw=1">

이 개념을 사용해, input matrix(4x4)를 column vector(16x1)로 펴보겠습니다(flatten)

<img src="https://www.dropbox.com/s/td7a57rwavco38p/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-25%2017.25.13.png?raw=1" weight="400" height="670">


4x16 convolution matrix와 1x16 input matrix를 곱할 수 있습니다 (16 차원의 column vector)

<img src="https://www.dropbox.com/s/b76456td2olo94g/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-25%2015.58.30.png?raw=1">

output 4x1 matrix는 전과 같은 결과를 가지는 2x2 matrix로 reshape할 수 있습니다

<img src="https://www.dropbox.com/s/1chqyx92ski9wr6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-25%2016.00.46.png?raw=1" width="300" height="240">

> 역자 : [Convolution 연산](#convolution-연산)의 이미지를 비교해보면 쉽게 이해될 거에요 :)

요약하면, convolution matrix는 kernel weights의 재배치일 뿐이고 convolution 연산은 convolution matrix를 사용해 표현할 수 있습니다.

그래서?

핵심은 convolution matrix는 4x16이기 때문에 16(4x4)에서 4(2x2)로 갈 수 있습니다. 그리고 16x4 matrix가 있는 경우 4(2x2)에서 16(4x4)으로 갈 수 있습니다


헷갈리신가요?

계속 읽어주세요

## Transposed Convolution Matrix
4(2x2)에서 16(4x4)로 가고 싶습니다. 따라서 우리는 16x4 matrix를 사용합니다. 또한 1 to 9의 관계를 유지하길 원합니다. 

Convolution matrix C(4x16)를 C.T(16x4)로 Transpose 했다고 가정하겠습니다. C.T(16x4)와 column vector(4x1)를 행렬 곱해서 output matrix(16x1)를 구할 수 있습니다. Transposed matrix는 1개의 값을 9개의 값들과 연결합니다.

<img src="https://www.dropbox.com/s/fpj67wntpap2m9c/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-25%2016.20.29.png?raw=1">

output은 4x4로 reshape할 수 있습니다

<img src="https://www.dropbox.com/s/m8lvvaka50gbx58/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-25%2016.21.03.png?raw=1" width="250" height="250">


작은 matrix(2x2)를 더 큰 matrix(4x4)로 up-sampling했습니다. Transposed Convolution은 가중치를 배치하는 방식 때문에 1-9 관계를 유지합니다

주의 : matrix의 실제 가중치는 기존의 convolution matrix로 계산되지 않아도 됩니다. 중요한 것은 가중치 배치가 convolution matrix의 transpose에 의해 바뀌는 것입니다.

## Summary
Transposed convolution 연산은 일반적인 convolution 연산과 동일한 연결성을 형성하지만 반대 방향으로 연결됩니다.

Transposed convolution을 up-sampling시 사용할 수 있습니다. 또한 Transposed convolution의 가중치들은 학습 가능하기 때문에 미리 정의된 보간 방법이 필요하지 않습니다.

Transposed convolution이라고 부르지만, 기존에 있던 convolution matrix를 Transpose해서 사용하는 것을 의미하진 않습니다. 핵심은 input과 output간의 연관성이 일반 convolution matrix와 비교할 때 역방향으로 처리되는 것입니다(many-to-one이 일반 convolution matrix, one-to-many가 transposed convolution)

따라서 Transposed convolution은 convolution이 아닙니다. 그러나 convolution을 사용해 transposed convolution을 모방할 수 있습니다. 

Transposed convolution과 동일한 효과를 내는 직접적인 convolution을 만들기 위해 input matrix에 0을 추가해 input을 up-sampling합니다. 이런 방식으로 Transposed convolution를 설명하는 글을 볼 수 있습니다. 그러나 Convolution 연산 전에, up-sampling을 위해 input matrix에 0을 추가하는 작업은 효율성이 떨어집니다

- 1가지 주의점 : Transposed convolution는 이미지 생성시 checkerboard artifacts를 만듭니다. [이 글](https://distill.pub/2016/deconv-checkerboard/)에선 이런 문제를 줄이기 위해 convolution 연산을 뒤따르는 up-sampling(즉, 보간법)을 권장합니다. 주된 목적이 그런 artifacts이 없는 이미지를 생성하는 것이라면 해당 글을 읽을 가치가 있습니다

> 역자 : Transposed convolution 과정에서 네모 모양이 남습니다. 그걸 checkerboard artifacts라고 부릅니다

## References
#### [1] A guide to convolution arithmetic for deep learning  
Vincent Dumoulin, Francesco Visin

[https://arxiv.org/abs/1603.07285](https://arxiv.org/abs/1603.07285)

#### [2] Unsupervised Representation Learning with Deep Convolutional Generative Adversarial Networks  
Alec Radford, Luke Metz, Soumith Chintala

[https://arxiv.org/pdf/1511.06434v2.pdf](https://arxiv.org/pdf/1511.06434v2.pdf)

#### [3] Fully Convolutional Networks for Semantic Segmentation  
Jonathan Long, Evan Shelhamer, Trevor Darrell

[https://people.eecs.berkeley.edu/~jonlong/long_shelhamer_fcn.pdf](https://people.eecs.berkeley.edu/~jonlong/long_shelhamer_fcn.pdf)

#### [4] Deconvolution and Checkerboard Artifacts  
Augustus Odena, Vincent Dumoulin, Chris Olah

[https://distill.pub/2016/deconv-checkerboard/](https://distill.pub/2016/deconv-checkerboard/)