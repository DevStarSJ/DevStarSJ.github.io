---
layout: post
title: "Pytorch를 활용한 Advanced Sequence models"
subtitle: "Pytorch를 활용한 Advanced Sequence models"
categories: data
tags: pytorch
comments: true
---
[김성동](https://github.com/dsksd)님의 Pytorch를 활용한 딥러닝 입문 중 Advanced Sequence Model 파트 정리입니다.

## Machine Translation
### Statistical Machine Translation
- Source Language(X)를 토대로 Target Language(Y)로 번역하는 Task
- 예시 : 스페인어를 Input으로 넣고, Output을 영어!

### 목적 함수
$$argmax_yP(y|x)$$  

source 문장이 주어졌을 때, 가장 좋은 Target 문장을 찾는 것  
$$argmax_yP(x|y)P(y)$$ 으로 식을 분해  
$$P(x|y)$$는 Translation Model : 어떻게 번역하는지 학습  
Parallel Corpus가 필요 (병렬 코퍼스)  
$$P(y)$$는 Language Model : 어순 및 문법 보정  
$$P(x|y)$$를 $$P(x,a|y)$$로 변경    
여기서 $$a$$는 Alignment로 Source language와 Target language의 **단어간 상호 관련성**을 의미  
one to one, one to many, many to many alignment가 필요


<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence1.png?raw=true">

- 실제로 이 확률을 계산하기 위해서는 모든 가능한 경우의 수를 다 대조해봐야 하기 때문에 너무 비싼 연산입니다. 실제론 너무 확률적으로 낮은 것들은 무시해버리고 Heuristic Search Algorithm 사용합니다


### Neural Machine Translation
#### Sequence to Sequence
- 번역에 Neural Network를 사용했습니다. 2014년부터 기존의 Machine Translation 성능을 엄청 끌어올렸습니다
- 특별히 Sequence-to-Sequence라는 새로운 형태의 뉴럴넷 구조를 사용하기 시작!

- Encoder와 Decoder 역할을 하는 2개의 RNN을 사용

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence2.png?raw=true">

- Decoder는 Encoder의 Last Hidden state를 초기 Hidden state로 사용하여 Target 문장에 대한 
Language model을 학습
- \<START>, \<END> 토큰 : 문장의 시작과 끝을 알려주며, 디코더 입장에선 condition에 따라 디코딩을 시작하고, end 토큰이 나오면 디코딩을 멈춰라  
NMT는 확률 $$P(y|x)$$을 바로 계산합니다(Statisctical에선 2개로 나눠서 계산했음)  
Source 문장(x)과 이전(T-1)까지의 Target 문장이 주어졌을 때 step T에 $$y_T$$일 조건부 확률

#### 학습
- End to End Training
- Decoder의 각 time step에서 발생한 Loss(Cross-Entropy)를 사용하여 두 모델의 파라미터를 한번에 업데이트
- torchtext에러 Field의 파라미터 eos : end of sentence, init token : start of sentence


#### Greedy Decoding
- 각 step에서 가장 확률이 높은 단어(토큰)를 디코딩(단어 level)
	- 가장 쉽고 계산 효율적
	- 문장 level의 확률을 고려하지 못함
	- 한번 디코딩한 단어는 무조건 사용되어야 합니다(취소나 변경이 안됨) 
- 단어 레벨에서 가장 좋은 것을 찾는 것이 반드시 올바른 문장을 만드는 것은 아닙니다

#### Beam Search Decoding
- 만약 Vocabulary의 크기가 V라고 할 때, 길이가 T인 문장 레벨의 모든 가능한 경우의 수를 고려하려면 $$O(V_T)$$의 계산복잡도 필요한데, 이것은 약간 비효율적인 방법
- 따라서 Beam Search Decoding을 사용
	- 각 step에서 가장 확률적으로 높은 K개만 고려하자! 최종적으로 $$K^T$$ 조합 중 가장 확률이 높은 시퀀스를 선택!
	
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence3.png?raw=true">


- Greedy Decoding
	- 구현이 간단함 
	- 계산 효율적 
	- 문장 level의 확률을 고려하지 못함

- Beam Search Decoding :
	- 문장 level의 확률을 고려
	- 좀 더 나은 디코딩 결과(Greedy와 비교해서)
구현 어려움
	- 좀 더 비싼 계산 복잡도
	- 학습 시 적용 어려움? (최근 나온 논문 -> [Sequence-to-Sequence Learning as Beam-Search Optimization](https://arxiv.org/pdf/1606.02960.pdf))

### 성능 평가	
#### BLEU score
- BiLingual Evaluation Understudy
	- 번역 시스템이 좋은지 안 좋은지 판단할 때 accuracy, f1 metric으로 평가하면 문제가 생김 => 여러 문장으로 표현할 수 있음
	- 정답을 여러가지로 제시
- Modified Precision
	- 문장 각각 해당 단어를 카운트해서 그 맥스값을 분자로 사용
	- 과대 평가나 중복 Count를 막을 수 있음

#### 유니그램

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence4.png?raw=true">	

#### 바이그램

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence5.png?raw=true">	

#### N gram

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence6.png?raw=true">

- BLEU Score는 최적의 평가 방법은 아니지만 자동 평가지표로서 매우 유용함
- 인간이 전부 정성적으로 평가하면 매우 비싸고,
그냥 일반적인 평가지표(Precision/Recall/F1/Accuracy)를 사용하면 제대로 평가할 수 없기 때문에 대안으로 사용
- 현대의 MT의 평가는 대부분 BLEU를 통해 하고 있음
- https://github.com/Maluuba/nlg-eval (직접 구현 못해도 오픈소스로 다수 존재)


## Other tasks using seq2seq
- Summarization (요약) : 본문 -> 요약문
- Dialogue (대화) : 상대방의 발언 -> 봇의 발언
- Parsing (파싱) : 단순 문장 -> 파싱된 결과
- Code generation (코드 생성) : 자연어 -> 파이썬 코드

## Attention
- Source Language의 정보를 하나의 고정된 벡터로 인코딩하기 때문에 디코더는 한정된 정보만 사용할 수 있습니다(Information Bottleneck!)
- 디코더의 각 step에서 Source sequence의 특정 부분에 집중하여 디코딩!
- 고정된 벡터에 의존하는게 아니라 동적으로 Source sequence를 가중합하여 디코딩에 사용합니다

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence7.png?raw=true">

- 1) 디코더의 hidden state와 인코더의 hidden states를 내적하여 attention score를 각각 구합니다
- 2) attention score에 Softmax를 사용하여 확률로 바꾼다(합이 1)
- 3) 인코더의 각 step에서 attention distribution과 hidden state를 사용하여 가중합을 구한다. ⇒ Context Vector
- 4) 디코더의 hidden state와 Attention을 사용해 구해낸 Context vector를 concat하여 디코딩! 

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence8.png?raw=true">

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence9.png?raw=true">

### Result
- NMT system의 성능을 엄청 상승시켰음
- (Seq2Seq를 사용하는 다른 테스크들의 성능도 상승)
- Information Bottleneck을 해결함
- Vanishing gradient 문제 역시 완화(Gradient path 증가)
- 약간의 Interpretability 얻을 수 있음(Alignment)


## Advanced-Attention
### Abstractive Summarization
- Text Summarization 테스크
- 본문 -> 요약문
- 기존 요약 모델들은 조금만 길게 요약하려고 하면 같은 말이나 의미의 문장을 반복하는 경향이 있었음
- NMT와 비슷하게 sequence to sequence를 사용

#### Intra-Temporal Attention

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/sequence10.png?raw=true">

- 이전 디코딩 step에서 집중했던 부분은 이번 step에서는 덜 집중하게 만든다 (중복된 요약을 막는 효과)

#### Self Attention
- 일반적인 Attention은 Encoder와 Decoder의 hidden state 사이에서 Attention score 구했습니다
- Self Attention은 Decoder의 hidden state들 사이에서 Attention score을 구합니다
- Seq2Seq뿐만 아니라 일반적인 RNN의 구조에서
각 hidden state 간의 attention을 적용하는 방법들을
Self-Attention(Intra-Attention)이라 부름. (Hidden states 간의 Multiple Weighted Sums) 

## Transformer
### 기존 RNN의 단점
- 기존의 RNN 기반의 Sequence model은 순차적인 연산탓에 병렬화하기 어려움(=느리다)
- Long term Dependency의 문제를 해결하기 위해 Attention mechanism 사용

### Transformer 사용
- 기계 번역 테스크
- Encoder - Decoder 컨셉 유지
- RNN이나 CNN 구조 사용 X
- 모든 것을 Self-Attention으로 처리 (Multi-Head Attention)

- Key의 개수가 많아질수록 Softmax 안에 있는
QK^T의 값의 분산이 커질 수 있어서 Key vector의 크기로 스케일링


Q = V = K
Word vector들을 쌓아서 서로가 서로에게 Attention(self-Attention)  
한 단어와 다른 단어 사이의 어텐션(dot-product)은 한번에 하나씩 밖에 할 수 없기 때문에 워드 벡터에 Linear 연산 후, 병렬로 다른 단어들과도 h번의 attention을 수행(Multi-Head Attention)






