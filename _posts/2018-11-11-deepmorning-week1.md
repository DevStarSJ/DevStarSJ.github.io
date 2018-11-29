---
layout: post
title:  "딥모닝 1주차. PR12-001~006"
subtitle:   "딥모닝 1주차. PR12-001~006"
categories: data
tags: paper
comments: true
---

- PR12 동영상을 하루에 1개씩 보는 "딥모닝" 스터디에서 본 영상을 정리하는 글입니다
- PR-001 : Generative adversarial nets
- PR-002 : Deformable Convolutional Networks
- PR-003 : RNN encoder-decoder
- PR-004 : Image Super-Resolution Using Deep Convolutional Networks
- PR-005 : Playing Atari with Deep Reinforcement Learning
- PR-006 : Neural Turing Machines

---

## PR-001 : GAN(Generative adversarial nets)
### Generative
- 생성!
	- 파인만 "내가 창조할 수 없는 것은 이해할 수 없다"
	- 뉴럴넷이 그림을 그릴 수 있다는 것은 라벨의 Feature를 품고있는 것이고 classification은 당연히 따라옴
- Unsupervised Learning에 속함
	- No label or curriculum => self learning
	- 1) 볼츠만 머신
	- 2) Auto-encoder or Variational Inference
	- 3) Generative Adversarial Network
- Stacker autoencodder - SAE
	- 자기 자신을 답으로 사용하고 L2 loss
	- 인코딩으로 latent space에 넣고 다시 디코딩
- Variational autoencoder
	- Variational inference를 사용
	- 우리가 알 수 있는 모델로 하한을 계산하고, 하한을 높이는 방식을 취함(Variational approximations)
	- Likelihood는 logistic regression과 유사 => min 값을 학습 => blur 

### Adversarial
<img src="https://www.dropbox.com/s/hgr7gfwqe8v1kvf/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-04%2014.55.41.png?raw=1">

- Generator, Discriminator 모델 2개 존재
- 모르는 Z space에 넣은 후, 우리가 가진 x와 g로 나온 아웃풋과 비교
- 경찰과 지폐위조범 사례
- z값을 줬을 때 x 이미지를 내보내는 모델(Q)를 정의하고 실제 데이터 모델 P에 가깝도록!
- <img src="https://www.dropbox.com/s/o5qi0rh9dj58154/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-04%2014.57.22.png?raw=1">
- 왼쪽에서 점점 우측으로 이동하며 원본과 유사해짐
- 수식이 min max가 정말 어려워 보이지만 극단적 예시를 넣으면 쉽게 이해할 수 있음
	- Discriminator가 잘한다고 했을 때, $$D(x)=1$$이라 로그 부분은 0이 됨
	- Discriminator 입장에선 0인게 max
	- Generator 입장에선 속이는 것이 좋기 때문에 min 

### Two Step Approach
- 아래와 같은 내용을 증명해야 함
	- <img src="https://www.dropbox.com/s/1246e4f5z4610wp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-04%2015.05.50.png?raw=1">
- Proposition 1
	- $$a \log(y)+b \log(1-y)$$를 미분하면 $$a(1-y)-by=0$$ 따라서 $$y = \frac{a}{a+b}$$
	- G가 fixed 되었을 때 D의 optimal 포인트는 다음과 같이 나타낼 수 있음
	- $$D_{G}^{*}(x)=\frac{p_{data}(x)}{p_{data}(x)+p_{g}(x)}$$
	- D에 관한 것을 껴넣고 표현!
- Main Theorem
	- <img src="https://www.dropbox.com/s/ns6f8110ln1n9gb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-04%2015.20.17.png?raw=1"> 
	- D가 optimal에 도달했을 때 G의 입장에서 어쩔 때 Global optima를 가지는지 확인
	- $$p_{g}=p_{data}$$일 경우 $$D_{G}^{*}(x)=\frac{1}{2}$$, 대입해서 풀면 $$C(G)=-log(4)$$
	- KL 다이버전스..! 검색해보기
	- $$C(G)$$ : discriminator를 fix한 상태에서 g로만 dependent한 loss function

### Convergence of the proposed algorithm
- minmax problem이 global optimal을 가짐
	- 모델 distribution이 실제 데이터 distribution과 정확히 일치할 때 뿐 
- <img src="https://www.dropbox.com/s/uo80syly2yedv8h/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-04%2015.33.36.png?raw=1">
- D에 대해 supream(max)에 대한 loss 함수가 있고, 모든 p_{g}에 컨벡스하면 d_optimal 서드 드리프트(미분들의 set)에 포함됨
- convex 문제는 미분해서 gradient descent하면 global optimal에 도달하는 것이 보장되어 있음

### Gan do
- 이미지 생성
- vector arithmetic(벡터 산수)
- 이미지에서도 사용 가능!(DCGAN)
	- <img src="https://www.dropbox.com/s/6des3ge07sayvry/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-04%2015.42.37.png?raw=1"> 
- Rotation 되는 것처럼 이미지를 생성할 수 있음

### Difficuties
- 생성된 모델이 잘된건지 파악하기 힘듬
	- Inception Score
- Mode Collapse
	- min max problem때문에 생기는 문제
	- 뉴럴넷 입장에선 max min로 볼수도 있음

### Related works
- Super-resolution(SRGAN)
- Img2Img Translation(CycleGAN)
- Find a code(infoGan)


---

## PR-002 : Deformable Convolutional Networks

- Input 데이터에 대해 Transform(rotation, add noise 등)을 적용하는데 이걸 사람이 정해주는게 아닌, 자동으로 할 수 있을까?에 대한 논문

### Abstract
- 우리의 한계는 늘 고정된 convolution filter를 사용(3by3, 5by5) 
- 이런 것을 알고리즘이 배우게 하자!
- Convolution, RoI pooling을 자동으로 배워보자


### Introduction
- data augmentation한 것도 모두 같은 label
- crop, rotate, flip, jitter, occlude
- 레이블을 바꾸지 않는 data augmentation을 알고 있어야 함
- 그러나 특정한 도메인(의료, 암)은 size 스케일링을 하면 안됨
- Transformation-invariant feature를 찾는 것도 좋지만, 쉽지 않음
- drawback : assumed fixed and known
- 배경, 큰 물체, 작은 물체를 학습해야 할 때 같은 필터를 사용하는 것은 비효율..! filter size를 flexible하게!

### 핵심
- 1) Convolution -> deformable convolution
	- 점을 움직일 수 있도록 하면 되지 않을까
- 2) RoI pooling -> deformable RoI pooling
- RoI pooling
	- 다양한 사이즈에서 fixed size를 얻음
- Spatial Transform Network(STN)
	- 딥마인드
	- 인풋이 틀어진 경우 정방향으로 갖다두는 네트워크
	- 분류하기 좋도록 classification

### Deformable convnet
- Deformable convolution
	- $$p_{n}$$은 offset
	- $$\Delta p_{n}$$는 분수로 사용
	- interpolation하면 점을 얻을 수 있음
	- 학습할 때 convolution layer 사용
- Deformable ROI Pooling
	- 중심 값에 대해서 진행하는데, 역시 오프셋을 도입하자
	- 학습할 때 fully connected layer 사용 
- Deformable ConvNets
	- 기존 conv layer를 살짝만 바꿔도 작동
	- 1) conv feature를 학습
	- 2) classification, task specific network
	
### Result
<img src="https://www.dropbox.com/s/ynfu3vwhkjgd8mt/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-05%2009.19.34.png?raw=1">

- 효과적으로 늘어나는 것을 볼 수 있음
- [구현물](https://github.com/felixlaumon)
- Scaled MNIST에선 deformable이 더 잘됨	
- 다른 것과 비교
	- STN와 비교
		- Linear Transform을 학습 => 한계
		- 정면으로 바꾸는 것(interpolation), 각 픽셀에 대해 진행하니 expensive
		- deformable convolution은 filter weight에 집중하지 않고 filter의 어떤 샘플(x)을 쓰느냐에 신경
	- Effective Receptive Field
		- receptive fielld size는 루트에 비례해서 커짐 
		- deformable은 확확 커짐
	- Atrous convolution
		- 팽창하는 conv, 정방
		- deformable은 정방이 아닌 틀어져도 가능
	- Dynamic Filter
		- 상황에 맞게 dynamic filter를 다양하게 생성
		- deformable은 filter가 아닌 x를 중요시

### 질문  
- 연산량
	- STN보단 조금임
	- 서브 네트워크 하나를 더 배우는 것 

---

## PR-003 : RNN encoder-decoder
- 기계번역을 위한 자연어 표현 학습
- RNN Encoder-Decoder
	- RNN을 활용해 문장 구절 학습 (다양한 길이에 적용)
	- Encoder-Decoder라는 새로운 구조 제안
	- 새로운 Hidden Unit 제안
- Stastical Machine Translation의 성능을 개선
	- 제안하는 RNN 모델로 기존의 SMT의 성능 개선 
- SMT 이외의 가능성도 보여줌
	- 학습된 Vector가 의미와 문법을 포착

### RNN
- sequence data를 사용
- 김성훈 교수님 강의 참고


### 기계 번역(Machine Translation)
- Rule-based MT : dictionary, 문법 기반의 번역(Parser, Analyzer, Transfer Lexicon)
- Statistical MT : 이미 번역된 문서들을 바탕으로한 통계 기반의 번역, 확률로 나타냄
- Hybrid MT : Rule-based + Statistical
- Neural MT : Depp Learning을 활용한 번역

### SMT
<img src="https://www.dropbox.com/s/18o89ld3ma0ehg9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-06%2009.02.37.png?raw=1">

### RNN Encoder-Decoder 구조 소개
<img src="https://www.dropbox.com/s/p9fy9whs4g16r2e/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-06%2009.03.46.png?raw=1">

- decoder : 제네레이터같은 역할, c를 포함

### Hidden Unit
<img src="https://www.dropbox.com/s/zzbdbx10136z25z/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-06%2009.06.18.png?raw=1">

- 게이트가 2개 존재
- r이 완전히 열리면 이전 state를 버림
- update gate는 새로운 것을 얼마나 반영할 것인가

### RNN Encoder
<img src="https://www.dropbox.com/s/8y2vtwkb1i04j4n/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-06%2009.08.41.png?raw=1">

### RNN Decoder
<img src="https://www.dropbox.com/s/kh0m66her5h8zf2/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-06%2009.10.39.png?raw=1">

### 학습
<img src="https://www.dropbox.com/s/hxoa089tsvj9oxb/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-06%2009.11.29.png?raw=1">

### 활용
- SMT에 적용
	- RNN Encoder-Decoder에서 구한 확률 값이 feature 함수로 들어감

### 왜 성능이 잘 나올까?
- CSLM의 contribution과 많이 겹치지 않음
- 통계적으로 도출된 Score가 아님
	- 출현 빈도가 많지 않은 표현들에 대한 보완이 가능
- RNN Encoder-Decoder가 짧은 표현을 선호
	- 일반적으로 BLEU 값은 짧은 표현에서 높게 나옴

### 이외의 활용 방안
- SMT를 완전히 대체
- 범용적인 Phrase Representation
	- 의미와 문법 모두 담아냄
	- word2vec처럼 표현, 의미를 담아냄

### 결론
- SMT의 성능을 높일 수 있었다
- 기존 번역 시스템에 쉽게 적용
- 완전히 SMT를 대체할 수 있음
- 범용적인 Phrase Representation
   

---

## PR-004 : Image Super-Resolution Using Deep Convolutional Networks

- ILL-posed problem
	- 다양한 솔루션이 존재하는 문제
- 저해상도 이미지로부터 고해상도 이미지를 만드는 문제
- 위성 영상, 의료 영상, 천체 영상 등에서 많이 사용되고 있음
- 적은 수의 데이터를 사용하고 있음

### 배경지식
- 평가 방식
	- 영상이 얼마나 개선되었는지, 우리가 만드려고 하는 ground truth랑 우리가 만든 것이 얼마나 유사한지 평가하는 방식들
	- PSNR (Peak Signal-to-Noise Ratio)
		- 최대 신호 대 잡음비(영상 화질 손싱정보에 대한 평가)
	- SSIM (structural similarity index)
		- 밝기, 명암, 구조를 조합해 두 영상의 유사도 평가
	- MS-SSIM (Multi-scal SSIM)
		- 다양한 배율에 대한 SSIM 평가
	- IFC(Information fidelity criterion)
		- 서로 다른 두 확률분포에 대한 의존도 평가
- SISR 관련 선행 연구
	- Example-Based Super-Resolution
		- 데이터셋이나 학습 모델을 구축하기 어려움
	- Image Super-resolution
		- sparse를 사용해 어떻게 고해상도를 얻을까

### 방법론
- 핵심 아이디어
	- <img src="https://www.dropbox.com/s/7sqxzvxu6b8tyi1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-11%2012.27.06.png?raw=1">
	- Convolutional Neural Networks with 3-layers
	- super-resolution 문제에서 최초로 딥러닝을 적용
	- index를 바꿔서 쓰는 중, image가 Y고 ground truth가 X
	- resolution image에서 하나의 픽셀(값)을 regression하는 문제
- 수식화
	- 6분쯤 이미지 추가 
	- conv-relu-conv-relu-conv 
	- 차이가 작으면 작을수록 PSNR이 올라감

### 실험 결과
- 나비 이미지 사례
- 필터 사이즈를 늘렸을 때, PSNR이 늘어남(동시에 트레인 시간도)
- RGB 채널을 그대로 사용하지 않고, YCbCR에 적용

### 리뷰 의견
- Sparse-coding과 같은 맥락의 표현을 CNN으로 구현
- End to End라 효율적
- Single Image Super Resolution 문제에서 최초로 딥러닝 적용
	- 모델 구조가 독창적이진 않았음 
- 2014년 이후 모두 SRCNN을 기반으로 함 

### 질문
- patch based로 하면 바운더리 펙트로 문제가 생기는데, 학습을 한 후 파인튜닝을 하는가?
	- 그러진 않고 inference시 전체 이미지 사용 
- GAN에 적용해서 사용할 수 있을까?
	- 합성된 이미지에서 적용해 성능을 늘릴 수 있을까? Generative는 structure 정보가 없기 때문에 해상도는 늘릴 수 있지만 원점(앵커 포인트)는 틀어지는 문제가 생길 수 있음 => 진짜 고해상도 이미지인지?
- data augmentation 언급은 없음
- 2배로 해상도 늘리고 나온 아웃풋을 다시 인풋으로 넣으면 계속 해상도가 늘어날 수 있을까?
	- 8배까지가 눈으로 봤을 때 정상적이고 16배부턴 잘 안되는듯  


## Accurate Image Super Resolution using Very Deep Convolutional Networks
- 이번엔 논문 2개
- 모델을 복잡하게 할 수 있을까?

### 방법론
<img src="https://www.dropbox.com/s/m4muppp8i8wwzw7/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-11%2012.26.19.png?raw=1">

- Receptive field를 키우고, scale factor를 2배 3배 4배 고려
- 이미지 learning decay
- 레이어 자체를 vgg처럼 비슷하게 3x3을 20개 쌓고, 마지막에 residual 부분을 넣음
- 원 이미지를 학습하는 것이 아닌 경계 값만 학습
	-  두 이미지의 차는 달라지는 부분이 없음
- 너무 high하지 않도록 gradient를 조절

### 실험 결과
- 경계 부분이 확실히 더 살아남
- scale factor가 깊어질수록 좋아짐

### 리뷰 의견
- Edge 부분만 학습해서 뛰어남
- SRCNN을 20개의 레이어로 확장해서 표현력 증가됨
- Residual learning과 adhustable gradient clipping을 통해 빠른 학습 가능
- Image restoration 문제에서 input-output의 유사성을 residual learning 적용
- 학습 속도 대폭 개선하고, SRCNN과 비교해 확연히 개선됨

---

## PR-005 : Playing Atari with Deep Reinforcement Learning
- 논문의 스토리 텔링이 엄청 좋음
- 모범적인 논문

### Abstract
- First deep learning model
	- Successfully learn control policies directly 
	- High-dimensional sensory input 
- CNN model trained on variant of Q-learning
- 아타리 2600 게임 3은 사람보다 잘함

### Introduction
- 문제 제기
	- High dimensional sensory input으로부터 직접 학습하고 싶음
	- 대부분 RL은 hand-crafted feature를 가지고 했음
- 인사이트
	- 컴퓨터 비전과 음성 인식에서 잘되고 있음
	- 그냥 딥러닝을 Reinforcement에 적용하면 안됨, 그 이유는
		- DL은 레이블된 데이터를 사용
			- 이걸 해결하기 위해 CNN with a variant Q-learning을 사용 
		- 대부분 딥러닝 논문은 데이터 샘플이 independent라는 것을 가정, 지금은 시퀀스 데이터를 받음  
			- Experience replay

### Background
- 수학은 딱 1페이지
- Agent, Environment
- State
- Policy : 특정 상황에서 내가 뭘 해야되는지 알려줌
	- Deterministic하면 바로 나오고, Stochastic하면 확률로 나옴
- Value Fuction : 어떤 상태에 내가 있다면 가치가 얼마인지?
	- Q를 학습하는 과정 	
- Value-Based learning
- Q-Networks
	- w라는 weight를 하나 더 갖는 함수로 정의, $$Q(s, a, w)$$


### Deep Q-Networks(DQN)
- 딥러닝할 때 (셔플하고) 배치로 읽는 것과 비슷한 아이디어
- state를 다 저장했다가, 셔플해서 사용
	- 이 작업으로 correlation을 제거
- DQN in Atari
	- 화면 하나만 보여주면 어디로 움직이는지 모름
	- 화면 4개 이미지를 동시에 사용하고, 액션을 예측 

### Training and Stability
- 그 당시엔 Q가 converge될 것인가를 네트워크에서 설명하지 못했는데, 이걸 설명함
- 에피소드마다 리워드가 어떻게 변화하는지 보여줌, 마치 학습이 잘 안되는 것처럼 왔다갔다 함
- 그러나 우리는 리워드가 아니라 Q를 approximate하고 싶은 것, Q를 보니 점수가 계속 상승하고 있음

### Visualizing the value functions
- 적과 같은 선상에 있으면 Q의 기대치가 상승
- 맞기 직전에서 상승
- 적이 없어지면 Q의 기대치가 하락

### Experience Replay
- 네트워크를 target과 학습하려는 weight으로 분리
- 이 부분은 여기서 자세히 다루진 않음
- 이걸 진행하면 3배 높은 스코어를 얻을 수 있음


---

## PR-006 : Neural Turing Machines
- 2014년에 처음 나온 논문

### Tuning Machine
- 컴퓨터 모델
- 읽기 쓰기 장치 존재
- 프로그램이 칸을 이동하며 Read/write
- Discrete해서 backpropagation 불가


### Neural Turing Machine
- 알고리즘은 못하지만 일반화를 잘 함
- 프로그램을 배울 수 있음
- Differentiable(미분 가능한) Turing machine
- **Sharp** functions made smooth and can train with backpropagation

- 계산과 메모리가 분리된 뉴럴넷
	- 뉴럴넷 : CPU, 메모리 : RAM
- 알고리즘의 입력과 출력을 보고 알고리즘을 배울 수 있음
	- 복사, 반복, 정렬 알고리즘에 대한 실험 결과를 나타냄

### 구조
<img src="https://www.dropbox.com/s/xgwcmzv9yabx6kc/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-09%2009.05.28.png?raw=1">

- 그냥 Turing 머신과 다른 점은 read/write 헤드가 여러개 있을 수 있는 점
	- 여러 헤드가 있어서 더 효율적

### RNN or LSTM
- RNN이나 LSTM은 메모리 수를 증가시키면 네트워크가 커지고, 계산량이 많아짐
- RNN은 계속 내용이 업데이트 되서 전 내용을 쓸 수 없음
	- LSTM이 이걸 해결해주긴 하는데, 이 논문에선 이 아이디어를 더 앞서서 NTM을 만듬
- Hidden state의 size를 증가시키기 위해 사용

### Innovations
- 메모리와 뉴럴넷이 나뉘어짐
- 2014년에 Attention 메커니즘이 거의 없었음
- Memory Networks에서 발전된 End-to-End Memory는 Read만 있는데 NTM은 Read, Write 둘 다 있음 

### Detail

<img src="https://www.dropbox.com/s/ipmha2fswb8d9rn/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-09%2009.09.36.png?raw=1">

- Addresing
	- 주소 찾기
		- Content Only
			- 위치를 대략적으로 찾음
		- Location Only 
			- Shift iterates from the last focus
	- Content -> interploation -> Conv Shift -> Sharpening
	- Content Addressing
		- 근사값을 찾는 과정
		- softmax
	- Interpolation
		- Location addressing
		- contetn와 locate 방식을 얼마나 할지 정함
	- Convolutional Shift
		- 얼마나 많은 지점에 영향을 받는지 계산
	- Sharpening
		- 최종 주소 weight를 구함
- Writing
	- Erase 후 Add
	- Erase
		- w는 어디를 지울지 e는 얼마나 지울지
		- w가 커질수록 더 많이 지워짐
	- Add
		- w는 어디를 추가할지
		- a는 뉴럴넷에서 나온 것
	- Erase후 Add하면 업데이트됨!  
- Read
	- w는 어디를 읽을지
- Flow
	- Input을 정렬되지 않은 리스트와 정렬된 리스트(정답값)을 받음
	- 뉴럴넷을 통해 Addressing, Writing, Memory 연산, Reading, $$r_{t}$$를 구함

### What to improve
- Memory management probelm : Dynamic Allocation
- Time Retrieval Memory in Order : Temporal Matrix
- Graph Algorithm for wider range of tasks
- Reinforcement Learning



