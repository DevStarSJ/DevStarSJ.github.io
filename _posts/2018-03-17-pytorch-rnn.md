---
layout: post
title: "Pytorch를 활용한 RNN"
subtitle: "Pytorch를 활용한 RNN(Recurrent Neural Network)"
categories: data
tags: pytorch dl
comments: true
---
[김성동](https://github.com/dsksd)님의 Pytorch를 활용한 딥러닝 입문 중 RNN 파트 정리입니다.

## Language Modeling

```
철수와 영희는 식탁에 앉아 사과를 __(A)__
```

- (A)에 들어올 단어는? **먹었다!**

- 이런 아이디어 기반해서 만들어진 것이 Language Model

$$P(x^{(t+1)}=w_j|x^{(t)}, ...,x^{(1)})$$

- 키보드의 자동 완성 기능, 서치 엔진에서 쿼리 자동 완성 기능 모두 Language Model을 적용한 Application으로 볼 수 있음
- 음성 인식을 할 때도 Language Model이 쓰임! 해당 단어만 잘못 들었을 경우(noise가 껴있다거나) 이전까지 인지한 단어를 기반으로 단어를 추론!
- N-gram으로 모델링을 합니다. gram은 gramma의 줄임말

```
철수와 영희는 식탁에 앉아 사과를 ______
```

- Unigram : 토큰 하나가 변수가 됨 : "철수", "와", "영희", "는", "식탁", "에"  
- Bigram : 두개의 토큰이 하나의 변수가 됨 : "철수 와", "와 영희", "영희 는", "는 식탁", "식탁 에", "에 앉아"  
- Trigram : 3개의 토큰이 하나의 변수 : "철수 와 영희", "와 영희 는", "영희 는 식탁", "는 식탁 에", "식탁 에 앉아"  
- 4-gram : 4개의 토큰 : "철수 와 영희 는", "와 영희 는 식탁", "영희 는 식탁 에", "는 식탁 에 앉아"  
- N-gram : N개의 토큰이 하나의 변수가 됨

#### 가정 : t+1의 확률은 이전 n-1개의 단어(토큰)에만 의존한다


<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn1.png?raw=true">


### 문제점 
- 앞의 정보를 무시하고 있음. 가정 자체에 한계 존재
- n-1 이전의 맥락을 모델링할 수 없음
- 해당 n-gram이 Corpus에 없거나 희소한 경우 확률이 0이나 매우 낮게 나올 수도 있음
- n이 커질수록 더욱 확률은 희박해짐
- Corpus에 있는 n-gram을 모두 카운트해서 저장해야 하기 때문에 모델의 공간 복잡도가 O(exp(n))
- **위 문제점 때문에 Neural Language Model로 접근하기 시작함**

### Window-based Language Model
- 고정된 Window size(~n-1)를 인풋으로 받는
FFN(Feed Forward Neural Network)
- 카운트할 필요가 없기 때문에 Sparsitiy 문제 없음
- 모델의 사이즈도 작음
- **여전히 고정된 window size에 의존하기 때문에 Long-term Context를 포착하지 못함**
- **토큰의 윈도우 내의 위치에 따라 다른 파라미터를 적용 받음(Parameter sharing이 없음)**

### Recurrent Neural Network
- 모든 Timestamp에서 같은 Parameter를 공유!
- Input의 길이가 가변적입니다


<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn2.png?raw=true">

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn3.png?raw=true">

- time t의 hidden state는 이전 모든 time step x를 인풋으로 받는 함수 g의 아웃풋으로 볼 수 있습니다(모두 연결되어 있으니까-!)

#### Notation
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn4.png?raw=true">
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn5.png?raw=true">

- 인풋의 차원에 대한 감이 있어야 합니다!
- x는 word vector
- 모든 Time Step에서 Parameter를 Sharing!

[RNN 참고 자료](https://ratsgo.github.io/natural%20language%20processing/2017/03/09/rnnlstm/)


#### 예시
```
뭐 먹 을까?
```

D=3로 총 4개의 Timestamp가 있어서 4x3 매트릭스를 indexing했습니다

| 0.1 	| 0.1 	| 0.2 	|
|-----	|-----	|-----	|
| 0.5 	| 0.2 	| 0.3 	|
| 1.0 	| 0.0 	| 0.2 	|
| 0.1 	| 0.1 	| 0.  	|

첫 행이 $$h^{(0)}$$! 

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn6.png?raw=true">

- 마지막 step의 Hidden state는 "뭐 먹을까?"라는 문장을 인코딩한 벡터로 볼 수 있습니다


```
input_size = 10 # input dimension (word embedding) D
hidden_size = 30 # hidden dimension H
batch_size = 3
length = 4

rnn = nn.RNN(input_size, hidden_size,num_layers=1,bias=True,nonlinearity='tanh', batch_first=True, dropout=0, bidirectional=False)

input = Variable(torch.randn(batch_size,length,input_size)) # B,T,D  <= batch_first
hidden = Variable(torch.zeros(1,batch_size,hidden_size)) # 1,B,H    (num_layers * num_directions, batch, hidden_size)

output, hiddne = rnn(input, hidden) 
output.size() # B, T, H   
hidden.size() # 1, B, H
# (배치 사이즈, 시퀀스 길이, input 차원)을 가지는 Input 
# (1,배치 사이즈, hidden 차원)을 가지는 초기 hidden state

```

```
나는 너 좋아
오늘 뭐 먹지
```

- Batch Size, 2
- Time : 문장의 길이, 3
- Dimension : 인풋의 차원, 10
- Style마다 먼저 쓰는 것이 다른데, B, T, D로 많이 사용하곤 함 (batch_first=Ture)
- hidden은 마지막 hidden state를 뜻합니다

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn7.png?raw=true">


#### 하이퍼 파라미터 세팅
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn8.png?raw=true">

- ?에 들어갈 것은 무엇일까요?  
$$E$$ : VxD  
$$W_e$$ : DxH  
$$W_h$$ : HxH  
$$U$$ : HxV  


- 모든 timestep에서 그 다음에 올 단어를 예측하고 그 오차를 Cross Entropy로 구하면 됩니다! 



# TorchText
- [링크](http://mlexplained.com/2018/02/08/a-comprehensive-tutorial-to-torchtext/)
- Tokenize, Vocab 구축, Tensor로 감싸주는 프로세스등을 진행할 수 있습니다

- Field 
	- 데이터 전처리 파이프라인을 정의하는 클래스
	- Tokensize, Unkwown 태그, Vocab 구축, 문장에서 숫자는 Num이란 태그로 대체 등등의 과정을 파이프라인이라고 할 수 있는데, 이것을 정의하는 클래스

## Code
```
# 1. Field 선언
tagger = Kkma()
tokenize = tagger.morphs

TEXT = Field(tokenize=tokenize,use_vocab=True,lower=True, include_lengths=True, batch_first=True) 
# tokenize는 함수!, lower는 대문자를 소문자로 바꿔줌, include_lengths는 input을 (input, length)로 쪼개줌
LABEL = Field(sequential=False,unk_token=None, use_vocab=True)
# sequential이 true면 토크나이즈를 함

# 2. 데이터셋 로드
train_data, test_data = TabularDataset.splits(
                                   path="data/", # 데이터가 있는 root 경로
                                   train='train.txt', validation="test.txt",
                                   format='tsv', # \t로 구분
                                   #skip_header=True, # 헤더가 있다면 스킵
                                   fields=[('TEXT',TEXT),('LABEL',LABEL)])
# TabularDataset은 csv, tsv 포맷을 갖는 데이터셋 

# 꺼내오고 싶다면
one_example = train_data.examples[0]
one_example.TEXT
one_example.LABEL

# 3. Vocabulary 구축
TEXT.build_vocab(train_data)
LABEL.build_vocab(train_data)

TEXT.vocab.itos
  
# 4. iterator 선언
train_iter, test_iter = Iterator.splits(
    (train_data, test_data), batch_size=3, device=-1, # device -1 : cpu, device 0 : 남는 gpu
    sort_key=lambda x: len(x.TEXT),sort_within_batch=True,repeat=False) # x.TEXT 길이 기준으로 정렬

TEXT.vocab.itos[1]

for batch in train_iter:
    print(batch.TEXT)
    print(batch.LABEL)
    break

# 5. 모델링
  
```

- \<pad> token
	- 길이를 맞춰주기 위한 padding 토큰



## Backpropagation for RNN
- 최대한 간단한 RNN. $$h^{(t)} = W_hh^{(t-1)}$$
- 타입 스텝마다 $$J^{(t)}/W_h$$ 미분한 것을 더하면 됩니다	

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn9.png?raw=true">

- backpropagation through time(BPTT)
- [이찬우님 Back Propagation 영상](https://www.youtube.com/watch?v=4jgHzgxBnGY) 

# LSTM(Long Short Term Memory)
- 기본 RNN은 Timestamp이 엄청 길면 vanish gradient가 생기고 hidden size를 고정하기 때문에 많은 step을 거쳐오면 정보가 점점 희소해집니다
- 이것을 극복하기 위해 만들어진 LSTM
- 긴 Short term Memory
- hidden state말고 cell state라는 정보도 time step 마다 recurrent!

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn10.png?raw=true">

### Forget Gate
- 이번 시점의 인풋 $$x_t$$와 이전까지의 hidden state $$h_{t-1}$$을 인풋으로 받아서 Cell state 중
잊어버릴 부분을 결정합니다

### Input Gate
- time step t의 새로운 정보 중 얼마나 Cell state에 반영할지 결정 하는 Input gate

- 기존의 Cell state에 까먹을만큼 까먹고,새로운 정보를 받아들일만큼 받아들인다

### Output Gate
- Cell state에 tanh한 결과 정보 중 얼마만큼의 비율로 이번 hidden state로 만들지 정하는 Output gate

## Shortcut connection
- NN에서 하나 이상의 layer를 skip하는 구조
- ResNet에서 실험한 여러 Shortcut connection 중
exclusive gating과 같은 아이디어
- Cell state에 여러 gate function을 사용하여 해당 layer의 연산을 거치지 않은 Information이 계속 그 다음 step으로 전달 될 수 있습니다

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn11.png?raw=true">

- 전부 **곱셈**으로 이루어져있는 RNN의 해당 부분(이전 Hidden state에서 다음 Hidden state로 Recurrent하는)을 gate function을 이용해 **덧셈**으로 대체합니다!

## Code
```
input_size = 10
hidden_size = 30
output_size = 10
batch_size = 3
length = 4
num_layers = 3

rnn = nn.LSTM(input_size,hidden_size,num_layers=num_layers,bias=True,batch_first=True,bidirectional=True)

input = Variable(torch.randn(batch_size,length,input_size)) # B,T,D
hidden = Variable(torch.zeros(num_layers*2,batch_size,hidden_size)) # (num_layers * num_directions, batch, hidden_size)
cell = Variable(torch.zeros(num_layers*2,batch_size,hidden_size)) # (num_layers * num_directions, batch, hidden_size)

output, (hidden,cell) = rnn(input,(hidden,cell))

print(output.size())
print(hidden.size())
print(cell.size())


linear = nn.Linear(hidden_size*2,output_size)
output = F.softmax(linear(output),1)
output.size()


```

# GRU(Gated Recurrent Unit)
<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn12.png?raw=true">

- 조경현 박사님이 제안한 구조
- LSTM과 유사하게 생겼는데, LSTM을 더 간략화한 구조
- hidden state만 흘러가고 cell state는 없음
- Update gate는 이번 step에서 계산한 hidden을 얼마나 update할지 결정한다. (update 되는만큼 기존의 정보를 잊는다.)
	- LSTM의 forget, input gate를 하나의 Update gate로!  
- 만약 z가 0이라면 이번 step의 히든 스테이트는 
이전 레이어의 히든 스테이트를 그대로 Copy합니다(identity mapping)

## Code
```
input_size = 10 # input dimension (word embedding) D
hidden_size = 30 # hidden dimension H
batch_size = 3
length = 4

rnn = nn.GRU(input_size,hidden_size,num_layers=1,bias=True,batch_first=True,bidirectional=True)
input = Variable(torch.randn(batch_size,length,input_size)) # B,T,D
hidden = Variable(torch.zeros(2,batch_size,hidden_size)) # 2,B,H

output, hidden = rnn(input,hidden)

print(output.size())
print(hidden.size())
```

# Bidirectional RNN
- 인풋 시퀀스를 양방향(forward, backward)으로
연결하며 hidden state를 계산 
- 2개의 hidden state가 필요

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn13.png?raw=true">

- RNN에선 레이어를 많이 쌓는다고 반드시 좋아지는 것은 아닙니다!

## Standard From(RNN)
```
class RNN(nn.Module):
    def __init__(self,input_size,embed_size,hidden_size,output_size,num_layers=1,bidirec=False):
        super(RNN,self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        if bidirec:
            self.num_directions = 2
        else:
            self.num_directions = 1
            
        self.embed = nn.Embedding(input_size,embed_size)
        self.lstm = nn.LSTM(embed_size,hidden_size,num_layers,batch_first=True,bidirectional=bidirec)
        self.linear = nn.Linear(hidden_size*self.num_directions,output_size)
        
    def init_hidden(self,batch_size):
        # (num_layers * num_directions, batch_size, hidden_size)
        hidden = Variable(torch.zeros(self.num_layers*self.num_directions,batch_size,self.hidden_size))
        cell = Variable(torch.zeros(self.num_layers*self.num_directions,batch_size,self.hidden_size))
        return hidden, cell
    
    def forward(self,inputs):
        """
        inputs : B,T
        """
        embed = self.embed(inputs) # word vector indexing
        hidden, cell = self.init_hidden(inputs.size(0)) # initial hidden,cell
        
        output, (hidden,cell) = self.lstm(embed,(hidden,cell))
        
        # Many-to-Many
        output = self.linear(output) # B,T,H -> B,T,V
        
        # Many-to-One
        #hidden = hidden[-self.num_directions:] # (num_directions,B,H)
        #hidden = torch.cat([h for h in hidden],1)
        #output = self.linear(hidden) # last hidden
        
        return output
```

### Dropout / Layer Normalization

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn14.png?raw=true">

- Recurrent connection(가로 방향)에는 Dropout을 적용하지 않고, 나머지 connection(세로 방향)에만 Dropout을 적용합니다!!
- Recurrent Connection에 Dropout을 적용하면 과거의 정보까지 잃어버리게 되기 때문입니다-

### Layer Normalization
- RNN에선 레이어 노말라이제이션이 표준이 되가고 있습니다
- Batch와는 독립적으로 Layer의 Output 자체를
Normalization합니다. (Batch size의 의존성 X)
- LSTM, GRU에 적용하는 것은 복잡할 수 있지만, RNN에 적용한다면!

<img src="https://github.com/zzsza/zzsza.github.io/blob/master/assets/img/rnn15.png?raw=true">

- Pytorch에서는 0.4 버전부터 정식으로 사용 가능할 것으로 예상됩니다(현재 0.3.1)


## Sequence Tagging
- 연속된 시퀀스에 태그를 다는 테스크
- POS tagging, NER, SRL
- Text 분류는 many to one
- Language Model, Sequence Tagging은 many to many

### Named Entity Recognition(NER)
- 엔티티의 이름을 인지
- 보통 2개 이상의 토큰이 하나의 Entity를 구성
	- B : Entity의 시작
	- I : B로 시작한 Entity에 속함
	- O : Entity가 아님