---
layout: post
title:  "딥모닝 2주차. PR12-007~011"
subtitle: "딥모닝 2주차. PR12-007~011"
categories: data
tags: paper
comments: true
---

- PR12 동영상을 하루에 1개씩 보는 “딥모닝” 스터디에서 본 영상을 정리하는 글입니다
- PR-007 : Deep Photo Style Transfer
- PR-008 : Reverse Classification Accuracy(역분류 정확도)
- PR-009 : Distilling the Knowledge in a Neural Network
- PR-010 : Auto-Encoding Variational Bayes
- PR-011 : Spatial Transformer Networks

---

## PR-007 : Deep Photo Style Transfer

- A Neural Algorithm for Artistic Style 논문을 먼저 살펴봄
- 어떤 사진이라도 명화처럼 만들자!
    - 사진 : Content
    - 명화처럼 : Style
- 이 논문 이전엔 feature를 뽑는데만 encoding만 관심 가짐
    - Understanding Deep Image Representations by Inverting Them
- Preliminary 1
    - conv layer로 feature를 뽑음 ⇒ content generation
        - 레이어가 깊어질수록 왜곡이 존재, 정보를 많이 날림
    - Loss function
        - <img src="https://www.dropbox.com/s/4h5uyapa60q13e4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-12%2009.00.17.png?raw=1">
        - Image x를 iterative하게 만듬, weight 학습이 아님
        - 여기선 y와 w페어가 주어짐 ⇒ x 업데이트
- Preliminary 2
    - Texture synthesis
    - 오리지날 텍스쳐를 가지는 것을 feature map으로 만들자 ⇒ style generation
    - <img src="https://www.dropbox.com/s/soyjgnce62frsaa/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-12%2009.03.36.png?raw=1">
    - texture와 periodicity가 유사하다고 봄, correlation에 texture(style) 정보가 숨어있다

## Neural Algorithm of Artistic Style

- Style generation from feature map
- Content generation from feature map
- 두 마리 토끼를 한번에!
- content를 적당히 뭉개며 style을 적당히 가미
- Loss는 2개를 더해줌
- <img src="https://www.dropbox.com/s/34nz6d68z35bx6x/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-12%2009.06.41.png?raw=1">

## Deep Photo Style Transfer

- Photorealism Regularization ⇒ 사진처럼 만들기
- Augmented Style loss with semantic segmentation
- <img src="https://www.dropbox.com/s/h4p6okeqf4t973n/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-12%2009.10.35.png?raw=1">
- Image Matting : foreground object를 뽑음, foreground object를 잘 뽑아내지 못하면 패널티
- affine transform
- Sky + building으로 구성된 이미지의 gram matrix를 생각해보자
    - sky^2+buidling^2+2\*sky\*building (cross term)
    - cross term을 없애버리기
    - feature map에 semantic segmentation mask를 통과시킴
        - sky, building에 대한 feature가 나옴
- 람다가 커질수록 원래 하늘과 유사해짐

---

## PR-008: Reverse Classification Accuracy(역분류 정확도)

- 세분화의 성능을 테스트 데이터 라벨 없이 예측하는 방법
- 문제 1 : 의료 이미지 세분화
- 문제 2 : 데이터가 모자르다
- Proposed method
    - 모든 데이터를 학습
- Pseudo Ground truth : 가짜 정답
- reverse classifier : 기존 모델과 비슷한 것을 학습
    - 테스트 데이터와 가짜 정답을 모델에 학습
- 역분류 정확도
    - 학습용 데이터에 대한 역분류기의 성능을 다양한 척도로 확인
    - 논문은 RCA가 실제 classifier의 결과와 선형적 관계를 지닐 것이라고 추정
- Calibration
    - Classifier와 Reverse classifier에 calibration
    - 정확도 보정
- 실습

    old_data.shape -> (2500, 100)
    new_data.shape -> (2500, 100)
    Y.shape -> (100,)
    
    from sklearn.linear_models import LogisticRegression
    Classifier = LogisticRegression()
    Classifier.it(old_data, Y)
    Y_pred = Classifier.predict(new_data)
    Classifier.fit(new_data, Y_pred)
    Classifier.score(old_data, Y)

- 요약
    - 데이터에 대한 정확도 평가하는 방법 필요
    - 의료 데이터는 검증 데이터 구하기가 어렵기 때문에 평가가 어려움. 평가가 제대로 안되면 오버피팅이 될 가능성이 있음
    - RCA를 통해 세분화의 정확도 판단

---

## PR-009 : Distilling the Knowledge in a Neural Network

- 힌튼이 발표한 논문
- 앙상블의 계산 시간이 느리기 때문에 이런 것을 해결하기 위해 앙상블의 정보를 싱글 모델로 이전하는 것
- Distilling
    - 앙상블의 정보를 싱글 모델로 이동시키는 것
    - 불순물이 섞였을 때 순수 물질만 남기는 것
    - 앙상블을 빠르게 학습하는 내용도 있는데 이건 다루지 않을게요
- 뉴럴넷
    - 파라미터가 많아서 오버피팅이 생길 수 있음
- 오버피팅을 피하기 위해 앙상블을 사용
- 이니셜 파라미터를 다르게 하는 것이 효과가 있음
- 단점
    - 저장 공간이 많이 들고, 계산 시간이 오래 걸림
    - 병렬 처리를 해도 모델의 개수가 코어 개수보다 많으면 더 오래 걸림
    - 모바일 폰엔 저장 공간 이슈로 사용 불가능
- 딥러닝도 용량이 큼(VGG는 500메가쯤)

## Distilling Ensemble : Single Model

- 싱글, shallow한 모데을 만들고 싶음
    - 좋은 성능
    - 적은 계산 시간, 저장 공간이 조금만
- 앙상블을 만들어 싱글 shallow에 전이
- 1) 관측치가 많다면 앙상블을 쓰지 않아도 성능이 일반화될 것이다
    - over sampling ⇒ 레이블이 붙어있지 않은 상태로 진행
    - 기존에 학습된 앙상블 모델으로 예측 ⇒ 오버 샘플링된 데이터의 클래스에 레이블을 붙임
    - RMSE로 평가했는데, training size가 커질수록 성능이 좋아짐
- 2) 클래스의 확률 분포를 알면 잘 학습이 되지 않을까
    - ba라는 사람이 제안
    - 레이블 대신 logit값을 줘서 분포를 알아보자
    - logit : 클래스의 점수, 확률분포
    - 로짓에 noise를 줘서 학습 ⇒ regularizer 역할
    - 다시 single shallow에서 학습
    - 힌튼은 soft max를 사용해 확률값 구함
    - 확률을 계산해서 학습하는 것이 regularizer라고 힌튼이 말했음
    - activation 함수를 sigmoid에서 softmax로 변환
    - 모든 확률값을 더했을 때 1이 되도록
    - temperature 도입
        - 이게 낮으면 logit이 큰 값에 대해선 확률값이 1이고 나머지는 0이 됨
        - 확률이 클래스가 1이 되면 확률 분포를 알 수 없음 (모두 1을 가짐)
        - 2~5 정도 사용
        - 너무 높으면 모두 같은 확률값을 가짐 (0.33)
        - 모든 경우에 대해 실험을 해봐야 함
    - cross entropy의 변형을 사용

        <img src="https://www.dropbox.com/s/g13b2kuhxxwwdpj/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-14%2009.23.35.png?raw=1">

        <img src="https://www.dropbox.com/s/blj8yahfvm0zahx/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-14%2009.24.22.png?raw=1">

## 실험 결과

<img src="https://www.dropbox.com/s/rblonfv4zit08u4/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-14%2009.24.48.png?raw=1">

## 결론

- 앙상블만큼 좋은 성능을 가지고 적은 계산 시간을 가짐
- softmax보다 logit이 더 좋았다고 말하는 중

---

## PR-010 : Auto-Encoding Variational Bayes

- Generative가 핫해지는 중
- 레퍼런스가 다양하고 각자 설명하는 방식이 다 다름
- [추천 글](http://www.openias.org/variational-coin-toss)

## Motivation(논문을 선택한 이유)

- 제대로 이해해 보자!
- 2014년 논문이라 Classic
- 다양한 관점으로 해석이 됨
- 수식이 어려워 보이지만 그렇게 어렵진 않음(학부 졸업생 수준으로 커버 가능)

## Manifold hypothesis

- 딥러닝 자체가 manifold에 기반
- 우리가 다루는 데이터들이 사실은 저차원의 벡터 공간이 살고 있다
    - mnist가 784차원인데, 실제로 데이터는 작은 차원에 augmentation을 한 것
- 그 공간을 찾아내자!가 generative 모델의 목표

## Autoencoder

- Input이 들어오면 hidden layer를 통해 다시 output이 생김
    - latent presentation을 학습

## Linear Regression

- 점들의 경향성을 찾는 것
- 여기에 확률적 관점을 가미하면 점들의 확률 분포를 찾는 문제로 변형
- <img src="https://www.dropbox.com/s/d8k5e82ra6rnmao/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.07.32.png?raw=1">
- 그래피컬로 표현 가능
- Autoencoder가 선을 찾는 것이라면 variational autoencoder는 점들의 확률분포까지 찾아내는 것
- 각 축(Z, X)을 고차원으로 높이면 latent representation 데이터를 찾아내는 것이 목표

## 이론

- Maximum likelihood를 사용
    - 그러나 $$p_{x}$$를 모름, 체인룰을 사용해 전개해도 여전히 모름
- Variational inference를 사용
    - 복잡한 $$p_{x}$$를 간단한 $$q_{x}$$로 근사하겠다
    - 어떤 확률 분포가 있고, 그걸 직접 계산하기 어려울 때 계산 어려운 것을 인정하고 단순한 확률 분포로 근사

## Math

- <img src="https://www.dropbox.com/s/50h0ndlepmznadj/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.13.52.png?raw=1">
- KL-divergence
    - 기본적으로 distance 개념인데 distance는 아니다..라고 말함
    - P,Q를 바꾸면 값이 달라짐
    - Distance 비슷한 것이다 라고 생각하면 될 듯
    - 확률 분포 P와 Q 차이를 구하는 것
- 식 전개
    - <img src="https://www.dropbox.com/s/vs2ani1uljxnnbl/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.15.39.png?raw=1">
        - 천천히 전개하고, 모르겠으면 영상 13분 참고
        - L을 최대화
    - <img src="https://www.dropbox.com/s/zct65yiq1c9fwqg/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.17.35.png?raw=1">
        - 몬테카를로 q(zㅣx)로 샘플링한 값으로 L을 계산
        - 몇개를 뽑는거니 variance가 존재
    - <img src="https://www.dropbox.com/s/bs4lqaselx9jkgf/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.19.00.png?raw=1">
        - 전개를 조금 다르게 하면, 애널리틱하게(수학적으로) 표현 가능
        - variance를 적게 가능
    - <img src="https://www.dropbox.com/s/e1b2cmmlc1x2cvp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.21.01.png?raw=1">
        - 전개할 때 2번째 식을 주로 사용
    - <img src="https://www.dropbox.com/s/8v3svjx3xpj2o1k/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.21.22.png?raw=1">
        - 논문의 어펜딕스에 있음
- Reparametrization Tricks
    - <img src="https://www.dropbox.com/s/4o95mqng6lo8ma5/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.21.41.png?raw=1">
    - 중간에 샘플링 과정이 있는데, 샘플링은 미분이 안됨
    - 그래서 샘플링을 밖으로 빼내고 표현력은 유지함

## 네트워크 구조

- <img src="https://www.dropbox.com/s/7qa9xmknsyonozu/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.24.22.png?raw=1">
- 평균과 시그마를 inference하고 x를 계산
- stochastic autoencoder + regularization using prior
    - prior는 노말 정규 분포(0,1)로 가정

## 결과

- Visualization 결과
- <img src="https://www.dropbox.com/s/pxpejjwmpxrd43p/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-15%2009.26.38.png?raw=1">
- 다 잘 찾는중
- 벡터 스페이스 커지면 좋음
- 왜 오토 인코더는 안될까?
    - prior를 걸어주지 않음

## 레퍼런스

- [수학을 사용하지 않고 전개한 쉬운 글](http://kvfrans.com/variational-autoencoders-explained/)

---

## PR-011: Spatial Transformer Networks

- 2015년 닙스, 구글 딥마인드
- <img src="https://www.dropbox.com/s/mt649p3r1lah2ys/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-16%2009.10.57.png?raw=1">

## Introduction

- 동적으로 변하는 네트워크를 설계하겠다
- CNN의 한계
    - spatial invariant하지 못하다
        - Scale, Rotation : No
        - Translation : 부분적으로
- max pooling
    - 이게 spatial invariant하게 만들긴 하나 유동적이진 않음
- <img src="https://www.dropbox.com/s/ede5sdacx0zdxbh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-16%2009.12.38.png?raw=1">

## Architecture

- <img src="https://www.dropbox.com/s/stvyf0cb612gy22/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-16%2009.13.13.png?raw=1">
- Localisation net : transformer 할 좌표를 찾음
    - 마지막단에 regression이 있어야 함
- Grid generator : 좌표를 변환(Affine transform)
    - <img src="https://www.dropbox.com/s/my82tk19ha4n1ng/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-16%2009.15.23.png?raw=1">
- Sampler : 하나씩 읽어옴, interpolation
    - integer sampling
    - bilinear sampling
    - Differentiable image sampling : 미분 가능하도록!
- multiple spatial transformer가 가능
    - 앞에, 뒤에, 병렬 등 다양하게 사용 가능

## Experiment

- MNIST
- 번지 표지판
    - 앞단에 1개만
    - 중간에 여러개 넣음 (4개)
- 새 200종

## Conclusion

- <img src="https://www.dropbox.com/s/1795ftxsmmo74n7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-16%2009.26.52.png?raw=1">
- <img src="https://www.dropbox.com/s/zg5zf4ifxchmcd7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-16%2009.28.09.png?raw=1">
- deformable을 offset을 계산을 따로
- spatial은 트랜스폼의 파라미터만 찾아줌
    - 샘플링하며 intepolation할 때 계산량이 적음
    - 그러나 간단한 연산만 가능
