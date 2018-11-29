---
layout: post
title:  "Semantic Textual Similarity Multilingual and Cross-lingual Focused Evaluation 리뷰"
subtitle:   "Semantic Textual Similarity Multilingual and Cross-lingual Focused Evaluation 리뷰"
categories: data
tags: paper
comments: true
---
[
SemEval-2017 Task 1: Semantic Textual Similarity - Multilingual and Cross-lingual Focused Evaluation](https://arxiv.org/abs/1708.00055)을 정리한 글입니다!

## SemEval-2017 Task 1: Semantic Textual Similarity Multilingual and Cross-lingual Focused Evaluation

- 의미론적 텍스트 유사성 평가(다국어/교차 언어)

## Abstract
Semantic Textual Similarity (STS)는 문장의 유사도를 측정

- 사용되는 곳
	- Machine Translation(MT)
	- Summarization
	- Generations
	- Questions Answering(QA)
	- Short answer grading
	- Semantic search
	- Dialog and conversations systems
	
MTQD 데이터를 기반으로 2017 Task가 이루어졌으며 총 31 팀이 참가. 17 팀이 all language tracks

## 1. Introduction
STS는 textual entailment, semantic relatedness and paraphrase detection을 포함

### STS와 Textual entailment, Paraphrase detection의 차이점
- gradations of meaning overlap을 포착 유무 (의미의 중첩)

### STS와 Semantic relatedness와 차이점
- 의미의 중첩은 둘 다 잘 표현하나 Semantic relatedness는 관계에 대해 명확하지 않음(예를 들어 밤과 낮은 관련성이 높으나 비슷하진 않음)


처음엔 형태가 매칭되거나 문법 유사성으로 나타나는 lexical sementics에 집중했으며, 그 이후엔 strong new similarity signal을 찾아냄  

가장 좋은 퍼포먼스는 **앙상블! feature engineered 모델과 deep learning 모델을 합친 경우**

English sentence pairs에 집중. 영어는 잘 연구된 문제라 인간의 판단과 70-80의 correlation을 보임

## 9. Conclusion
기존과 차이점은 아라비아어, 스페인어, 영어, 터키어에 초점을 맞췄다는 것. 그러나 Arbic-English, Turkish-English는 약한 상관관계를 얻음. 이것은 로버스트 모델을 더 개선할 필요가 있음

## 2. Task Overview
성능은 인간의 판단과 머신 점수의 Pearson상관 관계에 의해 0~5 점수로 측정. 중간 값은 의미상 해석할 수 없는 중첩 수준을 뜻합니다. 

<img src="http://www.dropbox.com/s/i688pd7en4saipn/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-02%2000.19.52.png?raw=1" width="400" height="500">

## 3. Evaluation Data
Stanford Natural Language Inference(SNLI) corpus (단, 교차 언어 중 하나는 WMT 데이터)

<img src="http://www.dropbox.com/s/l98ogyfmctjdku0/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-02%2000.15.15.png?raw=1" width="500" height="300">


Sentence Embedding 사용하며 meaning overlap은 cosine similarity 사용해 측정

<img src="http://www.dropbox.com/s/9f4wbtdb1p8t4sp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-02%2001.44.42.png?raw=1" width="400" height="700">


## 6. System Evaluation
### 6.4 Baseline
The baseline is the cosine of binary sentence vectors with each dimension representing whether an individual word appears in a sentence


### ECNU 팀
- 딥러닝 + feature engineers model(RF, GB, XGB) 앙상블
- Feature : n-gram overlap, edit distance, longest comment prefix/suffix/substring, tree-kernels, word alignments, summarization, MT evaluation metrics(BLEU, GTM-3, NIST, WER, ME_TEOR, ROUGE), kernel similarity of bags of words, bags of dependencies, pooled word-embedding
- 딥러닝 모델은 sentence embedding시 average word embedding, projected word embedding, deep averaging network 또는 lstm을 사용해 차별화함
- 4개의 딥러닝 + feature model 3개 평균점수

### BIT
- WordNet과 BNC word frequencies를 기반으로 한 sentence information content를 사용
- cosine similarity of summed word embeddings with an IDF weighting scheme 사용
- Setence IC는 ECNU를 제외한 모든 시스템보다 성능이 좋았음
- Senetence IC를 word embedding similarity와 결합하는 것이 가장 좋음


### HCTI
- Convolution Deep Structured Semantic Model(CDSSM) 사용
- Sentence embedding은 2개의 cnn에서 생성
- 아키텍쳐는 ECNU의 딥러닝과 유사

### MITRE
- ECNU와 유사. 딥러닝 + Feature Engineering
- Feature : alignment similarity, TakeLab STS, string similarity measures(matching n-grams, summarization, MT Metrics), RNN/RCNN, BiLSTM

### FCICU
- Sense-base alignment를 사용하는 BabelNet 사용

### CompiLIG
- Best Spanish-English 퍼포먼스
- Feature : cross-lingual conceptual similarity using DBNary, cross-language Multi-Veg word embeddings, Byrchcin and Svoboda’s improvements

### LIM-LIG
- 오직 weighted word embedding만 사용했으며 Arabic 2등
- Word embedding시 uniform sentence embedding과 POS, IDF weighting schemes를 합침

### DT_Team
- English에서 2등
- DSSM, CDSSM을 합친 딥러닝 모델과 Feature Engineering 
- Feature : unigram over-lap, summed word alignments scores, fraction of unaligned words, difference in word counts by type,
- Min to max ratios of words by type

### SEF@UHH
- Spanish-English 1등
- cosine, negation of Bray-Curtis dissimilarity and vector correlation을 사용한 Paragraph로 Unsupervised 유사도 구함
- $$L_1$$-$$L_2$$ PAIR를 단일 언어 $$L_1$$-$$L_1$$, $$L_2$$-$$L_2$$로 변경 




