---
layout: post
title: "Pytorch를 활용한 자연어 처리(NLP)"
subtitle: "Pytorch를 활용한 자연어 처리(NLP)"
categories: data
tags: pytorch
comments: true
---
[김성동](https://github.com/dsksd)님의 Pytorch를 활용한 딥러닝 입문 중 자연어처리 파트 정리 파일입니다.

# Distributed Word Representation

NLP Task는 지금까지 봤던 접근법이랑(CNN류) 많이 다릅니다. RNN을 배우기 전에 Word Vector를 알아야 하기 때문에 이 내용을 추가했습니다  

```
파이토치가 짱이야. 
아닌데? 텐서플로우가 짱이지 구글이 만들었잖아
그래도 파이토치는 쉬워 페북도 장난 아니야
아마존이 만든 맥스넷이란 것도 좋더라
```
다음 대화에서 어떤 정보를 얻을 수 있을까요?

```
파이토치(페북) ≈ 텐서플로우(구글) ≈ 맥스넷(아마존)
```

사람은 문맥을 통해 각 단어의 유사함과 관계를 쉽게 추론할 수 있음! 컴퓨터에게 넣기 위해선 컴퓨터가 이해할 수 있도록 변형해줘야 합니다. 이 과정을 Word Representation이라고 합니다

## Word Representation
Idea/Thing을 여러 Symbol로 표현할 수 있습니다.(같은 것을 다르게 표현할 수 있습니다) 여기서 각 단어간의 관계도 알 수 있습니다(유사한지)  


<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-1.png?raw=true">

### WordNet 

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-2.png?raw=true">

- 단어 의미를 그래프 형태로 출력
- 사람이 직접 구축해야 함(비싼 비용)
- 신조어의 의미를 이해 못함
- 뉘앙스를 놓치기 쉬움
- 주관적임
- 단어 간의 정확한 유사도 계산이 어려움(얼마나 유사한지) 그래프상 몇 노드가 연결되는지 정도만 알 수 있음


### One-hot Vector

```
파이토치		 [1,0,0,0,0,0,0,0]
짱		  [0,1,0,0,0,0,0,0]
텐서플로우		 [0,0,1,0,0,0,0,0]
구글		 [0,0,0,1,0,0,0,0]
쉽다		 [0,0,0,0,1,0,0,0]
페북		 [0,0,0,0,0,1,0,0]
맥스넷		 [0,0,0,0,0,0,1,0]
아마존		 [0,0,0,0,0,0,0,1]
```

- 단어 하나를 하나의 Discrete Variable로 취급
- 각 단어의 구분은 가능하자 유사도를 측정할 수는 없음
- 두 벡터를 내적해서 유사도를 측정!
- 만약 1만개의 단어를 One-hot vector로 표현하면?
	- 1만 차원의 벡터가 필요해 차원의 저주가 발생함

### Distributed word representation
- 그렇다면, 단어의 의미를 분산시켜 벡터로 표현하자!
- 그 단어의 속성은 함꼐 쓰이는 단어(맥락)에 의해 결정될 것이다
- Dense한 Vector를 만들어봄!

```
파이토치	 [0.6, -0.2, 0.7, 0.3, 0.7, -0.2, 0.1, 0.1]
텐서플로우	[0.4, -0.1, 0.6, -0.2, 0.6, -0.2, 0.3, 0.4]
고양이	  [-0.3, 0.2, 0.1, 0.2, -0.2, 0.1, -0.3, 0.1]

유사도
파이토치^T * 텐서플로우 = 1.15
파이토치^T * 고양이 = -0.26
```

- 비교적 낮은 차원의(50 ~ 1000차원) 벡터에 단어의 의미를 분산해 Dense한 벡터로 표현
- Word vector라고 부름


## NLP Task
[NLP Task](https://github.com/DSKSD/Pytorch_Fast_Campus_2018/blob/master/week6/1_Bag_of_Words.ipynb) 연습

Bag of Words : Count 방식으로 표현

### 1. Tokenize
- 문장을 단어 또는 형태소 단위로 토큰화
	- 형태소 : 언어를 이루는 최소 단위
- 문장이란 것은 단어의 연속이기 때문에 리스트로 표현할 수 있음
- 토큰은 문장, 단어, character, 형태소가 될 수 있음
	- 한국어는 형태소로 쪼개는 방법에 유효함
	
```
token = nltk.word_tokenize("Hi, my name is sungdong. What's your name?")
print(token)
>>> ['Hi', ',', 'my', 'name', 'is', 'sungdong', '.', 'What', "'s", 'your', 'name', '?']
```

```
# 꼬꼬마 형태소 분석기
token = kor_tagger.morphs("안녕하세요! 저는 파이토치를 공부하는 중입니다.")
print(token)
>>> ['안녕', '하', '세요', '!', '저', '는', '파이', '토치', '를', '공부', '하', '는', '중', '이', 'ㅂ니다', '.']
```

### 2. Build Vocab
- 단어의 인덱스를 가지고 있어야 함(각 자리에 맞게 넣어주기 위해)
- 따라서 Vocab을 구축
	- 각 단어의 ID를 붙여주는 작업
	
```
word2index={} # dictionary for indexing
for vo in token:
    if word2index.get(vo)==None:
        word2index[vo]=len(word2index)
print(word2index)
>>> {'하': 1, '.': 13, '를': 8, '중': 10, '안녕': 0, '파이': 6, '세요': 2, '토치': 7, '저': 4, '!': 3, '공부': 9, 'ㅂ니다': 12, '이': 11, '는': 5}
``` 

### 3. One-hot Encoding
- 자신의 인덱스에는 1을 채우고, 나머지엔 0을 채움

```
def one_hot_encoding(word,word2index):
    tensor = torch.zeros(len(word2index))
    index = word2index[word]
    tensor[index]=1.
    return tensor
```

```
torch_vector = one_hot_encoding("토치",word2index)
print(torch_vector)
>>> 
 0
 0
 0
 0
 0
 0
 0
 1
 0
 0
 0
 0
 0
 0
```

- 유사도를 계산해보면, (One Hot Encoding의 한계)

```
py_vector = one_hot_encoding("파이",word2index)
py_vector.dot(torch_vector)
>>> 0.0
```

### Bag of Words를 통한 분류
```
train_data = [["배고프다 밥줘","FOOD"],
                    ["뭐 먹을만한거 없냐","FOOD"],
                    ["맛집 추천","FOOD"],
                    ["이 근처 맛있는 음식점 좀","FOOD"],
                    ["밥줘","FOOD"],
                    ["뭐 먹지?","FOOD"],
                    ["삼겹살 먹고싶어","FOOD"],
                    ["영화 보고싶다","MEDIA"],
                    ["요즘 볼만한거 있어?","MEDIA"],
                    ["영화나 예능 추천","MEDIA"],
                    ["재밌는 드라마 보여줘","MEDIA"],
                    ["신과 함께 줄거리 좀 알려줘","MEDIA"],
                    ["고등랩퍼 다시보기 좀","MEDIA"],
                    ["재밌는 영상 하이라이트만 보여줘","MEDIA"]]

test_data = [["쭈꾸미 맛집 좀 찾아줘","FOOD"],
                   ["매콤한 떡볶이 먹고싶다","FOOD"],
                   ["강남 씨지비 조조 영화 스케줄표 좀","MEDIA"],
                   ["효리네 민박 보고싶엉","MEDIA"]]


# 0. Preprocessing
train_X,train_y = list(zip(*train_data))

# 1. Tokenize
train_X = [kor_tagger.morphs(x) for x in train_X]

# 2. Build Vocab
word2index={'<unk>' : 0}
for x in train_X:
    for token in x:
        if word2index.get(token)==None:
            word2index[token]=len(word2index)
            
class2index = {'FOOD' : 0, 'MEDIA' : 1}
print(word2index)
print(class2index)

# 3. Prepare Tensor
def make_BoW(seq,word2index):
    tensor = torch.zeros(len(word2index))
    for w in seq:
        index = word2index.get(w)
        if index!=None:
            tensor[index]+=1.
        else:
            index = word2index['<unk>']
            tensor[index]+=1.
    
    return tensor
    
train_X = torch.cat([Variable(make_BoW(x,word2index)).view(1,-1) for x in train_X])
train_y = torch.cat([Variable(torch.LongTensor([class2index[y]])) for y in train_y])

# 4. Modeling
class BoWClassifier(nn.Module):
    def __init__(self,vocab_size,output_size):
        super(BoWClassifier,self).__init__()
        
        self.linear = nn.Linear(vocab_size,output_size)
    
    def forward(self,inputs):
        return self.linear(inputs)
        
# 5. Train
STEP = 100
LR = 0.1
model = BoWClassifier(len(word2index),2)
loss_function = nn.CrossEntropyLoss()
optimizer = optim.SGD(model.parameters(),lr=LR)

for step in range(STEP):
    model.zero_grad()
    preds = model(train_X)
    loss = loss_function(preds,train_y)
    if step % 10 == 0:
        print(loss.data[0])
    loss.backward()
    optimizer.step()
    
# 6. Test
index2class = {v:k for k,v in class2index.items()}

for test in test_data:
    X = kor_tagger.morphs(test[0])
    X = Variable(make_BoW(X,word2index)).view(1,-1)
    
    pred = model(X)
    pred = pred.max(1)[1].data[0]
    print("Input : %s" % test[0])
    print("Prediction : %s" % index2class[pred])
    print("Truth : %s" % test[1])
    print("\n")           
```

- \<unk>란 단어는 모르는 단어를 처리하기 위해 넣은 단어(인덱스가 존재하지 않으면 unk!)
- Long Tensor로 변환


## Word2Vec
- 우린 엄청 많은 Text를 가지고 있음(인터넷상에 텍스트는 많음)
- 모든 단어는 fixed vocabulary (Train에 정의한 단어가 fixed voca가 됨)
- 단어의 속성은 주변 단어로부터 결정된다라는 전제가 있었는데, 주변 단어가 Input이고 중심 단어가 Output이 나오는 CBOW 모델과 중심 단어가 Input이고 주변 단어가 Output인 Skip-gram이 있습니다 

### Skip-gram
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-3.png?raw=true">


- 중심 단어가 있으면 주변 단어가 나올 조건부 확률을 구할 수 있음
- 윈도우 사이즈는 하이퍼 파라미터

### Learnable Embedding Matrix
- 7개의 단어를 5차원의 Vector로 임베딩하고 싶은 경우엔 7*5의 Embedding Matrix가 필요함
- 1\*7와 7\*5를 행렬곱하면 자신의 Index로 인덱싱
- Embedding Matrix를 학습하는 것이 Word2Vec

```
# Pytorch
embed = nn.Embedding(총 단어의 갯수, 임베딩 시킬 벡터의 차원)
embed.weight
>>> Parameter Containing : 학습 가능
```

- Embedding 모듈은 index를 표현하는 LongTensor를 인풋으로 기대하고 해당 벡터로 인덱싱합니다
- 따라서 원핫벡터로 명시적으로 바꿔주지 않아도 됩니다


### Object Function
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-4.png?raw=true">


- Corpus : 텍스트의 뭉치
- 각 토큰마다 그 단어가 중심단어가 될 수 있음
- 중심 단어가 등장했을 때, 맥락 단어가 함께 등장할 확률을최대화하는 방향으로 Parameter를 업데이트 
	- 최적화를 쉽게하기 위해 Log로 바꿔서 곱을 합으로 변경
	- -를 붙여서 Log-Likelihood를 **최소화** 

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-5.png?raw=true">


- 각 단어는 Center Word와 Context word가 될 수 있음
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-6.png?raw=true">


$$u_o^T*v_c$$ : 내적을 해서 유사도를 구함

- 데이터셋 예시
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-7.png?raw=true">


```
list(nltk.ngrams(tokenized, 5))
```
### 예시
```
I have a puppy . His name is Bori . I love him .
```

```
Corpus : 텍스트의 뭉치
T : 14 (코퍼스 내의 단어의 갯수)
m : 2 (Window size, 모델러가 정할 하이퍼 파라미터)
V : 11 (코퍼스 내의 단어의 집합. 중복을 제거한 집합)
```

1. Corpus에서 단어 집합**(Vocabulary)**을 구해서 **Index**를 매긴다.
2. **Window size**를 정하고 **T개의 데이터셋**를 준비한다.
3. **Center word**와 **Context word**를 표현할 **2개의 Embedding Matrix**를 선언한다.
4. **P(o\|c)**를 구해서 **Negative log-likelihood(loss)**를 구한다.
5. **Gradient Descent**를 사용하여 **loss**를 최소화한다.
6. 학습이 끝난 뒤에는 **Center vector와 Context vector를 평균**해서 사용한다.

### 코드 예시
- 1 Corpus에서 단어 집합을 구해 Index를 매김

```
corpus = "I have a puppy. His name is Bori. I love him."
tokenized = nltk.word_tokenize(corpus)
vocabulary = list(set(tokenized)) # 단어의 집합(중복 x)
print(tokenized)
print(vocabulary)

word2index={}
for voca in vocabulary:
    if word2index.get(voca)==None:
        word2index[voca]=len(word2index)
print(word2index)
```

- 2 Window size를 정하고 데이터를 준비

```
WINDOW_SIZE = 2
windows = list(nltk.ngrams(['<DUMMY>'] * WINDOW_SIZE + tokenized + ['<DUMMY>'] * WINDOW_SIZE, WINDOW_SIZE * 2 + 1))

train_data = []

for window in windows:
    for i in range(WINDOW_SIZE * 2 + 1):
        if i == WINDOW_SIZE or window[i] == '<DUMMY>': 
            continue
        train_data.append((window[WINDOW_SIZE], window[i]))

print(train_data[:WINDOW_SIZE * 2])
# >>> [('I', 'have'), ('I', 'a'), ('have', 'I'), ('have', 'a')]
# 각 단어를 index로 바꾸고 LongTensor로 바꿔주는 함수
def prepare_word(word, word2index):
    return Variable(torch.LongTensor([word2index[word]]))

X_p,y_p=[],[]

for (center,context) in train_data:
    X_p.append(prepare_word(center, word2index).view(1, -1))
    y_p.append(prepare_word(context, word2index).view(1, -1))
    
train_data = list(zip(X_p,y_p))
train_data[0]
```

- 3 Center word와 Context word를 표현할 2개의 Embedding Matrix를 선언

```
center_embed = nn.Embedding(len(word2index),3)
context_embed = nn.Embedding(len(word2index),3)

print(center_embed.weight)
print(context_embed.weight)

center,context = train_data[0]

center_vector = center_embed(center)
context_vector = context_embed(context)
print(center_vector)
print(context_vector)
# 배치 사이즈 : 1 
```

- 4 P(o\|c)를 구해서 Negative log-likelihood(loss)를 구한다 

```
# 분자값
score = torch.exp(context_vector.bmm(center_vector.transpose(1,2))).squeeze(2)
score

# 분모값
#  시퀀스(단어들의 연속된 리스트)가 들어오면 LongTensor로 매핑
def prepare_sequence(seq, word2index):
    idxs = list(map(lambda w: word2index[w], seq))
    return Variable(torch.LongTensor(idxs))

vocabulary_tensor = prepare_sequence(vocabulary,word2index).view(1,-1)
print(vocabulary_tensor)

vocabulary_vector = context_embed(vocabulary_tensor)

norm_scores = vocabulary_vector.bmm(center_vector.transpose(1, 2))
norm_scores = torch.sum(torch.exp(norm_scores,1))
print(norm_scores)

# 결과
score/norm_scores
```

- 이 정도의 문장이라면 T*2m 만큼의 배치 사이즈로 한번에
J(θ) 구할 수 있지만, 보통은 코퍼스의 크기가 매우 크기 때문에 미니 배치로 Negative log likelihood를 구해서 업데이트한다.(SGD)
- 학습 후에는 두 벡터를 평균내서 최종 Word Vector로 사용함
- 빈도 수가 적은 단어는 stopwords로 지정

### [실습](https://github.com/DSKSD/Pytorch_Fast_Campus_2018/blob/master/week6/2_Embedding_basic.ipynb)

## Negative Sampling
- word2vec의 비효율성을 개선하려고 한 논문
	- 기존 방식의 문제점 : J(θ)를 계산하는 것이 매우 비싸고 비효율적
	- 보통의 코퍼스는 Vocabulary의 크기가 
1만개 이상이다. 즉, 이  Softmax 연산이 매우 비싼 연산이다. (== 학습이 느림)
- 문제점을 해소하기 위해 2가지 방법을 제시. 그 중 1개가 Negative Sampling

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-8.png?raw=true">

- $$P(w)=U(x)^(3/4)/Z$$
- Unigram 분포!
- 3/4라는 지수의 역할 : 빈도가 낮은 단어가 샘플링될 확률을 높여줌(Negative Sample)
- SoftMax는 비싼 연산이기 때문에 다른 방법이 많이 고안됨(면접 질문~)
- Negative Sampling을 하면 vector간 연산이 가능해짐

<img src="https://adriancolyer.files.wordpress.com/2016/04/word2vec-plural-relation.png?w=600">


## Glove : Global Vector
- Timestep t 기준으로만 다른 주변단어와 co-occurrence를 포착했는데, 코퍼스(문서) 전체 기준으로 모든 Co-occurrence를 반영할 수는 없을까?

```
I have a puppy . His name is Bori . I love him . 
And also I have a lovely cat. 
```

| word | frequency |
|------|---|
| have | 2 |
| . | 1 |
| love | 1 |
| also | 1 |

### Co-occurrence
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-9.png?raw=true">

- 위 두 방식을 융합함! 통계적 정보를 반영해 fixed voca에 적용

### Object Function
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-10.png?raw=true">

- 코퍼스 내의 모든 단어 W에 대해, 두 단어 벡터의 내적(유사도)과 두 단어의 Co-occurrence 확률($$P_{ij}$$)의 차이를 최소로 만들자
- 특정 단어 간의 Co-occurrence는 다른 것들에 비해 과하게 높을 수가 있습니다. 그래서 이렇게 Co-occurrence가 너무 큰 경우의 영향을 줄이기 위한 Weighting Function 을 사용합니다($$f(P_{ij})$$)

$$f(x)= if x < x_{max} : (x/x_{max})^a$$
$$otherwise : 1$$


### Process
1. Corpus에서 단어 집합(Vocabulary)을 구해서 Index를 매긴다.
2. Window size를 정하고 T개의 데이터셋를 준비한다.
3. Center word와 Context word를 표현할 2개의 Embedding Matrix를 선언한다.
4. 전체 코퍼스에 대해 Co-occurrence matrix를 구축한다. => 단어셋이 클수록 메모리 에러가 남(VxV = 1억..)
5. Objective function을 이용해 J(θ)를 구하고 여기에 -를 붙여서 loss로 만든다
6. Gradient Descent를 사용하여 loss를 최소화한다.
7. 학습이 끝난 뒤에는 Center vector와 Context vector를 덧셈해서 사용한다.


### Pretrained word vector
[https://github.com/stanfordnlp/GloVe](https://github.com/stanfordnlp/GloVe)  
[https://github.com/mmihaltz/word2vec-GoogleNews-vectors](https://github.com/mmihaltz/word2vec-GoogleNews-vectors)  

- 대용량의 코퍼스에 미리 학습된 Word Vector들을 다운받아 사용할 수 있음. 많은 딥러닝 기반의 NLP 모델에선 이러한 Pre-trained word vector를 사용해 초기화함


## Word Vector Evaluation
- Intrinsic
	- a:b == c:?
	- 데이터셋을 4개의 pair를 준비하고 구멍을 만듬
	- cosine similarity를 사용해서 Distance가 가장 짧은 i를 찾음
	$$d = argmax_i((x_b-x_a+x_c)^T*x_i)/(||x_b-x_a+x_c||)$$ 
	- GloVe의 경우 더 오랜 훈련시킬수록 모델의 정확도가 더 높아지는 경향이 있음(수렴 역시 더 빠름!)
	- 무조건 GloVe가 좋다고할 순 없지만 대체로 좋은 편
	- 여러 사람이 두 단어의 관계에 대한 상관관계를 1~10 사이의 점수를 매기면 이를 평균내서 Test Set으로 구축하긴 함(But.. 하기 힘듬
- Extrinsic
	- 실제 task를 평가

	
## TensorboardX를 사용한 시각화
[코드](https://github.com/DSKSD/Pytorch_Fast_Campus_2018/blob/master/week6/5_Skip-gram-Negative-Sampling.ipynb)

- 필요한 데이터셋
	- 학습이 끝난 weight matrix를 가지고 옴(345, 30)
	- 각 인덱스에 맞는 단어(라벨)
- Search에 토치를 검색해서 볼 수 있음

```
from tensorboardX import SummaryWriter
import pickle
import os

# 텐서보드 데이터 파일 초기화
try:
    shutil.rmtree('runs/')
except:
    pass

writer = SummaryWriter(comment='-embedding')
matrix = (model.embedding_u.weight.data + model.embedding_v.weight.data)/2
label = [index2word[i] for i in range(len(index2word))]

writer.add_embedding(matrix, metadata=label)
writer.close()

!tensorboard --logdir runs --port 6006    
``` 

- 이미지를 크게 보시려면 우측마우스 클릭 후 새 창에서 이미지를 열어주세요!

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-12.png?raw=true">

## Using Pretrained Word Vector

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-11.png?raw=true">

- 자신이 가지고 있는 코퍼스보다 더 큰 코퍼스로 학습 된 매트릭스!! using Word2Vec, GloVe, FastText….
- 이전 Transfer Learning에서 Fine tuning했던 것과 
비슷한 효과를 기대함.
- 단어 단위에서의 Representation Power 빌리기!
거의 모든 딥러닝 NLP 모델에서의 기본재료
- Unsupervised Learning! 레이블과 상관없이 큰 코퍼스로 학습을 시킨 후, 우리가 사용하려는 embedding matrix에 반영
- [코드](https://github.com/DSKSD/Pytorch_Fast_Campus_2018/blob/master/week6/6_Using_Pretrained_Word_Vector.ipynb)
- Gensim : 오직 word vector만을 위한 라이브러리! 굉장히 빠름!

```
import torch
import torch.nn as nn
from torch.autograd import Variable
import torch.optim as optim
import torch.nn.functional as F
import numpy as np
import nltk
import torchtext
from konlpy.tag import Kkma

tagger = Kkma()
import gensim

torchtext.vocab.pretrained_aliases

corpus = open('data/corpus.txt','r',encoding="utf-8").readlines()
corpus = [c[:-1] for c in corpus]

tokenized = [tagger.morphs(c) for c in corpus]

model = gensim.models.Word2Vec(tokenized, size=15, window=5, min_count=2, workers=4)

model.most_similar("토치")

model.wv.save_word2vec_format("data/word_vector_sample.bin",binary=True) # 저장

pretrained_vectors_model = gensim.models.KeyedVectors.load_word2vec_format("data/word_vector_sample.bin",binary=True)

pretrained_vectors_model['토치']

vocab = list(pretrained_vectors_model.vocab.keys()) # Word2Vec에서 사용한 vocab

pretrained_vectors=[]
for vo in vocab:
    pretrained_vectors.append(pretrained_vectors_model[vo])
    
pretrained_vectors = np.vstack(pretrained_vectors)

pretrained_vectors.shape

# Init embedding matrix
class MyModel(nn.Module):
    def __init__(self,vocab_size,embed_size):
        super(MyModel,self).__init__()
        
        self.embed = nn.Embedding(vocab_size,embed_size)
        
    def init_embed(self,pretrained_vectors):
        self.embed.weight.data = torch.from_numpy(pretrained_vectors).float()
    
    def forward(self,inputs):
        return self.embed(inputs)

model = MyModel(len(vocab),15)
model.embed.weight
model.init_embed(pretrained_vectors)
model.embed.weight
    
```

### CNN을 사용한 Sentence Classification 예시

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/nlp-13.png?raw=true">

### FastText
- Word2Vec이나 GloVe와 같은 Word level representation model의 문제점은 선정의한 단어셋에 대한 매트릭스만을 학습시킬 수 있다는 것입니다
- 즉, 단어셋에 없는 단어를 만나면 아예 Indexing 자체를 할 수 없게 됩니다. 이러한 문제를 Out of Vocabulary(OOV)라고 부릅니다
- FastText는 Subword Information을 이용하여 Word representation을 시도합니다. OOV 문제를 어느 정도 중화시켰습니다
