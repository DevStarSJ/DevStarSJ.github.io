---
layout: post
title:  "David Silver-Reinforcement Learning 1강"
subtitle:   "David Silver-Reinforcement Learning 1강"
categories: data
tags: rl
comments: true
---

- David Silver의 Reinforcement Learning 강의를 한국어로 해설해주는 팡요랩 영상을 보고 메모한 자료입니다


---

## Introduction
### 강화 학습의 특징
- Supervisor가 없고 오직 reward(보상) signal만 존재
	- Supervisor가 없다는 것은 답이 없다는 의미
	- 목적은 사람이 정해주는데 그것을 달성하려면 어떻게 해야할까?
	- 알아서 Reward를 maximise해라!
- 피드백이 늦어질 수 있음(즉각적이지 않음)
	- 내가 지금 한 행동이 바로 보상으로 연결되지 않을 수 있음
- 시간이 중요
	- sequential한 순서가 있는 데이터
- 에이전트의 액션이 그 이후의 데이터에 영향을 줌
	- 어떻게 Fitting하느냐에 따라 데이터가 달라짐

### 강화 학습의 예시
- 헬리콥터에서 스턴트 가동 
- backgammon에서 월드 챔피언 물리치기
- 투자 포트폴리오 관리
- 휴머노이드 로봇이 걷게 하기
- 아타리 게임

### 용어 설명
- Rewards
	- $$R_{t}$$은 scalar feedback signal
		- 벡터가 아닌 방향성이 없고 더하고 빼는 것만 있는 값
		- scalar reward가 아닐 경우 rl로 풀 수 없을수도 있음 
	- t번째 타임에 $$R_{t}$$만큼의 스칼라(숫자) 하나가 주어짐
	- 모든 목적(Goal)은 Cumulative reward를 maximise하는 것!
	- Reward를 잘 설계하는 것이 중요. 예를 들면 로봇이 걷는 문제에서 1초간 안넘어지면 +1, 넘어지면 -100 등을 줌! 
	 
	 
### Sequential Decision Making
- Sequential하게 결정을 잘 해야 함!	
- Action이 long term consequences
- Reward가 딜레이 될 수 있음

### Agent and Environment
- Agent : 우리가 학습시키는 것, 뇌로 표현
- Agent의 바깥에 있는 것이 모두 Environment
- Agent가 action을 하면 environment가 2가지 신호를 줌(reward, observation)

### History and State
- History ( $$H_{t}$$ )
	- Agent가 observations, actions, rewards를 시간순으로 저장
	- 사실 history는 많이 안쓰임
- State
	- 다음에 뭘 할지 결정하기 위해 쓰이는 정보들
	- State is the information used to determine what happens next
	- State는 history의 함수로 표현
	- $$S_{t}=f(H_{t})$$ 
- Environment State
	- $$S_{t}^{e}$$ : environment의 다음 값을 계산하기 위해 내적을 가진 표현형. 보통 Agent에게 보이지 않음 
- Atri Example
	- <img src="https://www.dropbox.com/s/cgquwru1tjkz6ni/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-30%2022.51.50.png?raw=1"> 	
	- observation
	- reward
	- action
	- 1024개를(게임기 안에 있는 정보) 참고해 다음 화면을 계산 => Environment state 
- Agent State
	- 내가 history를 보고 다음 action을 해야하는데 필요한 정보들
	- 다음 행동을 할 때 쓰이는 정보들
- Markov State(=Information State)
	- <img src="https://www.dropbox.com/s/gbs7eoq6jzsg1ie/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-30%2023.28.36.png?raw=1"> 
	- 어떤 State가 Markov한지 안한지?
	- 결정할 때 바로 이전 state만 보고 결정을 할 경우
	- The future is independent of the past given the present
	- $$S_{t}$$가 미래를 결정한다, State는 미래에 대한 통계치다
	- 예를 들어 헬리 콥터를 조종하는데 현재 위치 기울어진 각도, 가속도, 바람의 세기가 주어진 경우 이 헬리콥터가 어떻게 움직여야 중심을 잡을 수 있을까?
		- 10분 전의 상태를 기억하고 할 필요가 없음. 직전 상황이 중요 
	- Environment state는 Markov
	- History $$H_{t}$$는 Markov
	- 강화학습은 거의 Markov 상태에서만 문제를 품

### 예시
- Rat Example
	- <img src="https://www.dropbox.com/s/m8e5r6mxm2nleqs/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-30%2023.44.06.png?raw=1"> 
	- 전구를 키는 것, 레버를 당기는 것, 종을 울리는 것 3가지의 신호
	- 3번째에 감전을 당할까? 치즈를 받을까?
	- State 정의에 따라 다름
		- 맨 앞을 무시하고 맨 뒤 3번을 보면, 3번째도 감전이겠구나! 생각할 수 있음
		- 전구의 개수와 레버 개수 종의 개수를 State로 정의하면 치즈를 얻겠구나! 생각할 수 있음
		- state를 4개 모두로 하면 알 수 없음

### Fully Observable Environments
- environment state를 볼 수 있는 환경을 fully observable하다고 함
- 이럴 경우 $$O_{t}=S_{t}^{a}=S_{t}^{e}$$
- Formally, Markov decision process(MDP)라고 부름


### Partial Observability
- Agent state와 environment state가 같지 않음
	

### RL Agent의 구성 요소
- 3가지를 모두 가지고 있을 수 있고, 하나만 가지고 있을 수 있음
- 1) Policy
	- Agent의 행동을 나타냄
	- State를 넣으면 Action을 뱉어냄
	- Deterministic policy : s를 넣어주면 action가 나옴	- Stochastic policy : 각 액션별 확률을 뱉음 
- 2) Value function
	- 상황이 얼마나 좋은지
	- 게임이 끝날 때까지 받을 수 있는 총 미래의 reward의 합산을 예측
	- 현재 state가 좋은지 안좋은지를 판단
	- 수식에 익숙해져야 함!! 
	- $$v_{\pi}(s)=E_{\pi}[R_{t+1}+\gamma R_{t+2}+ \gamma^{2}R_{t+3}+... | S_{t}=s]$$
	- 이 state로부터 특정 policy 파이를 따라갔을 때 받을 수 있는 총 리워드의 기대값
- 3) Model
	- 환경(environment)이 어떻게 될지 예측 
	- Enviornment의 역할 2개를 모델링
		- Reward 예측
		- State transition 예측
	- 이 모델을 RL에서 사용할 수도 있고 아닐수도 있고

### RL Agent의 분류 (1)
<img src="https://www.dropbox.com/s/c86xgk93zanfyfk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-01%2000.22.35.png?raw=1">

- 1) Value Based
	- Value Function만 존재 
		- 이 친구만 있어도 Agent 역할 가능
		- 어느 위치가 좋은지만 알면 그곳을 Go
- 2) Policy Based
	- Policy만 존재 
- 3) Actor Critic
	- Policy, Value Function 2개 존재

### RL Agent의 분류 (2)
- 1) Model Free
	- 내부적으로 모델을 만들지 않고 Policy 또는 Valu Function만 가지고 행동 
- 2) Model Based 
	- 내부적으로 모델(환경의)을 추측해서 만들어서 움직임

### Learning and Planning
- 강화 학습이 크게 두개의 문제에 직면
- Reinforcement Learning
	- Environment를 모름. 그냥 던져짐
	- 환경과 인터랙션을 하며 계속 개선
- Planning
	- Environment를 알고 있음
		- Reward가 어떻게 되는지, Transition을 알고 있음
	- Agent가 내부적으로 연산을 통해 다른 곳을 갈 수 있음(알파고의 몬테카를로)

### Exploration and Exploitation
- Exploration
	- Environment에 관한 더 많은 정보를 찾음
- Exploitation
	- Reward를 maximise!
- 2개는 Trade-off 관계
- 예시
	- <img src="https://www.dropbox.com/s/ygkimoafzgq4ld5/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-11-01%2000.54.12.png?raw=1">

### Prediction and Control
- Prediction 문제
	- Value function을 잘 학습시키는 것
	- Policy가 주어졌을 때 미래를 평가하는 것
	- State에 따른 value를 찾는 것
- Control 문제
	- Best policy를 찾음
	- 미래를 최적화하는 것
	- State에서 어떻게 움직여야 하는지를 찾는 문제


### Example
- Maze Example
	- <img src="https://www.dropbox.com/s/5tnkqw8uuslg6ip/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-31%2000.21.45.png?raw=1">
	- <img src="https://www.dropbox.com/s/qgp4z9nzoe4zokw/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-31%2000.23.09.png?raw=1">
	- <img src="https://www.dropbox.com/s/lz9e0dvtrpjqb6z/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-31%2000.23.22.png?raw=1">
	- <img src="https://www.dropbox.com/s/d8mhbopmkqeh1pq/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-31%2000.23.37.png?raw=1">
	
	
	
	
## Reference
- [팡요랩](https://www.youtube.com/watch?v=wYgyiCEkwC8)