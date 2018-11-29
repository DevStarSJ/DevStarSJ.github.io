---
layout: post
title:  "Learning Natural Language Inference using Bidirectional LSTM model and Inner Attention 리뷰"
subtitle: "Learning Natural Language Inference using Bidirectional LSTM model and Inner Attention 리뷰"
categories: data
tags: paper
comments: true
---
[
Learning Natural Language Inference using Bidirectional LSTM model and Inner Attention](https://arxiv.org/pdf/1605.09090v1.pdf)을 정리한 글입니다!


## Abstract
- encoding-based model for recognizing text en-tailment
- 2가지 과정을 겪음
	- word-level의 bidi-rectional LSTM에 Sentence representation을 만들기 위해 Average Pooling
	- 더 나은 representation을 얻기 위해 average pooling을 attention으로 대체
- ```Inner Attention``` : 첫 단계에서 얻는 representation
- 더 적은 파라미터로 나은 퍼포먼스


## 1. Introduction
- 한 쌍의 문장이 주어질 때, 전제로부터 합리적 추론을 할 수 있는지 측정하는 것이 목표

<img src="https://www.dropbox.com/s/0m0vu19clej2ftk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-08%2015.13.34.png?raw=1" width="400" height="200">


- RTE의 3가지 types
	- Entailment(=true)
	- Contardiction(=false)
	- Neutral(=unknown) 
- 지금까지 제안된 딥러닝 접근법은 크게 두 그룹이 존재
	- sentence encoding-based models : core of former methods
	- matching encoding based models : 문장 사이의 관계를 모델링하고 sentence representation을 생성하지 않음
- 일반적으론 sentence encoding-based model에 초점을 맞춤 : LSTMs-based model, GRUs-based model, TBCNN-based model, SPINN based model
- Single directional LSTM과 GRU는 문맥 정보를 활용하지 못하는 약점이 있으며, CNN은 단어 순서(word order)에 대한 정보를 활용하지 못함
- Bidirectional LSTM은 위에서 언급된 단점을 해결하기 위해, 두 방향으로 sequence를 처리해 이전과 이후의 context를 사용

<img src="https://www.dropbox.com/s/0pbit688g5bw6au/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-08%2015.15.28.png?raw=1">

- Feature Engineering이나 외부 리소스를 필요하지 않는 RTE를 위해 통합된 프레임 워크를 제안함
	- 기본 모델은 Premise와 Hypothesis에 BiLSTM을 구축
	- basic mean pooling이 대략 이 문장이 무엇을 말하는지에 대한 직감을 만들어 줍니다. 이 representation을 만든 후, 양쪽에 Inner-Attention을 적용
- 이 메커니즘은 분류에 정확하고 집중 sentence representation을 생성에 도움이 됨
- 또한 hypothesis와 premise에서 동일한 단어를 제거해 성능을 향상시킴

## 4. Conclusion and Future work
- RTE를 풀기 위해 Inner-Attention을 사용한 BiLSTM based model을 제안
- Our future work
	- QA, Para-phrase and Sentence Text Similarity 등에도 사용 시도
	- sentence vector를 완전히 사용하는 방법 시도

	
## 2. Our approach
### 2.1 Sentece Encoding Module
- 이 모델의 핵습
- 2가지 방식
	- average pooling은 sentence vector를 생성하기 위해 BiLSTM 위에 구축
	- 같은 문장에 attention 메카니즘 적용 + 이전 단계에서 생성된 representation을 사용 	
- Inner-attention 아이디어는 사람이 한 문장을 읽을 때, 과거의 경험에 따라 문장의 어느 부분이 더 중요한지에 대한 직관을 형성할 수 있다는 생각으로 만들었습니다

$$M = tanh(W^{y}Y+W^{h}R_{ave}\otimes e_L)$$  
$$\alpha = softmax(w^{T}M)$$  
$$R_{att}=Y\alpha^T$$  

- $$Y$$는 biLSTM의 output vector로 구성된 행렬
- $$R_{ave}$$는 mean pooling layer의 output
- $$\alpha$$는 attention vector
- $$R_{att}$$는 attention-weighted sentence representation


### 2.2 Sentence Matching Module
- 3가지 matching methods(premise와 hypotheses의 관계를 추출)
	- Concat ( two representation )
	- Element-wise product
	- Element-wise difference
- Finally, SoftMax layer

## 3. Experiments
### 3.2 Parameter Setting
- trainging objective : cross-entropy loss, minibatch SGD with the Rmsprop for optimization
- batch size : 128
- dropout rate : 0.25
- pretrained 300D Glove 840B vector use to initialize the word embedding
- Out-of-vocabulrary words are randomly initialize
- during training, all of these embedding are not updated
	