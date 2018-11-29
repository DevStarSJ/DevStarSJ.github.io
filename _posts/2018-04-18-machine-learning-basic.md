---
layout: post
title: "머신러닝(Machine Learning)의 수학적 기초"
subtitle: "머신러닝(Machine Learning)의 수학적 기초"
categories: data
tags: ml
comments: true
---
카이스트 문일철 교수님의 [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 1주차 강의를 보고 정리한 포스팅입니다!

## MLE(Maximum Likelihood Estimation)
압정을 던져서 앞면과 뒷면이 나오는 게임을 하고 있습니다. 압정을 5번 던져서 앞면(head)이 3번, 뒷면(tail)이 2번 나왔습니다. 이것을 아무것도 모르는 사람에게 설명해야 한다면 어떻게 해야할까요?

### Binomial Distribution(이항 분포)
- discrete한(이산적인) 사건에 대한 확률 분포입니다. ex) (앞, 뒤)
- 이것을 계속 실험해보는 것을 베르누이 실험이라고 합니다
- iid(independent and identically distributed)를 가정하고 있습니다 
	- 각 이벤트는 독립적이며 동일한 분포를 가진다는 뜻
- $$P(H)=\theta$$,  $$P(T)=1-\theta$$ 
	- 가지는 성질 : 항상 양수, 합하면 1 

$$P(HHTTT) = \theta\theta(1-\theta)\theta(1-\theta) = \theta^{3}(1-\theta)^{2}$$  

$$n$$=5, $$k=a_{H}$$=3, $$p=\theta$$라고 할 경우,  $$\theta$$가 주어졌을 때, 데이터 $$D$$가 관측될 확률  
$$P(D|\theta) = \theta^{a_{H}}(1-\theta)^{a_{T}}$$

- 가정 : 압정 게임의 결과는 $$\theta$$라는 확률 분포를 따른다
- 가정을 강하게 하려면? 
	- binomial 분포보다 맞는 분포를 제시 -> 추후 강의
	- $$\theta$$를 최적화(best candidate theta를 찾아 D를 설명) -> MLE
		

### MLE	
- 관측된 데이터들이 등장할 확률을 최대화하는 $$\theta$$를 찾기!
- 어떤 모수가 주어졌을 때, 원하는 값들이 나올 Likelihood를 최대로 만드는 모수를 선택하는 방법입니다. 점추정 방식에 속합니다
- 수식  

$$\hat\theta = argmax_{\theta}P(D|\theta) = argmax_{\theta}\theta^{a_{H}}(1-\theta)^{a_{T}}
$$  

$$ = argmax_{\theta}lnP(D|\theta) = argmax_{\theta}ln\{\theta^{a_{H}}(1-\theta)^{a_{T}}\}$$  

$$ = argmax_{\theta}\{a_{H}ln\theta+a_{T}ln(1-\theta)\}$$  

$$\frac{d}{d\theta}(a_{H}ln\theta+a_{T}ln(1-\theta)) = 0$$  

$$\frac{a_{H}}{\theta} - \frac{a_{T}}{1-\theta} = 0$$  

$$\hat\theta = \frac{a_{H}}{a_{H}+a_{T}}$$


### 추가 질문
추가적으로 압정을 더 던져서 앞면이 30회 뒷면이 20번 나온 경우, 5번 던진 것과 확률상으론 같은데, 과연 5번 던진 것과 50번 던진 것과는 같을까요?

그에 대한 답은 "여러 번 시도하면서 파라미터 $$\hat\theta$$를 추론한 것이지, 확정된 값은 아닙니다. 계속 던져보며 error가 줄어든 것입니다!"

$$P(|\hat\theta - \theta^*| \ge \epsilon) \le 2e^{-2N\epsilon^{2}}$$

좌측의 $$\epsilon$$(error bound)가 커질수록 우측의 확률은 작아집니다. 또한 우측의 $$N$$이 커질수록 우측 값이 작아집니다

이런 것들을 Probably Approximate Correct(PAC) Learning이라고 합니다.  
ex) 0.01% case의 probably에 $$\epsilon$$=0.01의 Apporiximate?



## MAP (Maximum a Posteriori Estimation)
MLE는 관측값에 따라 값이 너무 민감하게 변한다는 단점이 있기 때문에, 다른 관점으로 바라보자는 사람들이 점점 생겼습니다. 그 중 한명은 베이즈로, 사전 정보를 가미한 $$\theta$$를 찾아보자고 했습니다


$$ P(\theta\mid D) = \dfrac{P(D\mid\theta)P(\theta)}{P(D)} $$

좌측은 Posterior, 우측은 Likelihood * Prior knowledge / Normalizing constant  
Normalizing constant는 이미 주어진 사실이라 컨트롤을 할 수 없습니다.  
$$\theta$$가 바뀌는 것에 영향을 줄 수 없기 때문에 수식에서 많이 생략하곤 합니다

따라서 우리도 이렇게 정리하겠습니다  
$$ P(\theta\mid D) \propto P(D\mid\theta)P(\theta) $$

$$P(D\mid\theta) = \theta^{a_{H}}(1-\theta)^{a_{T}}$$라는 것을 이미 MLE에서 알게 되었는데요, 그렇다면 $$P(\theta)$$는 무엇일까요? 이 값은 베타 분포를 따른다고 합니다!

$$P(\theta) = \dfrac{\theta^{\alpha-1}(1-\theta)^{\beta-1}}{B(\alpha, \beta)},  {B(\alpha, \beta)}=\frac{\Gamma(a)\Gamma(b)}{\Gamma(a+b)},  \Gamma(\alpha)=(\alpha-1)!$$

다시 $$ P(\theta\mid D) \propto P(D\mid\theta)P(\theta) $$를 정리하면,

$$ P(\theta\mid D) \propto  \theta^{a_{H}}(1-\theta)^{a_{T}} \theta^{\alpha-1}(1-\theta)^{\beta-1} $$  

$$=\theta^{a_{H}+\alpha-1}(1-\theta)^{a_{T}+\beta-1}$$

MLE에서 나왔던 모양과 비슷한데, $$\alpha$$, $$\beta$$가 존재할 뿐! $$\alpha$$, $$\beta$$를 조절해(=사전 정보) $$\hat\theta$$를 추출합니다

베이즈는 이것을 보고 $$a_{H}$$와 $$a_{T}$$가 점점 커지면, $$\alpha$$, $$\beta$$의 영향이 작아져서 결국 MLE와 MAP는 동일하게 될 것이라고 이야기했습니다


## MLE와 MAP의 비교
### MLE

$$\hat\theta = argmax_{\theta}P(D\mid\theta) \to \frac{a_{H}}{a_{H}+a_{T}}$$

### MAP

$$\hat\theta = argmax_{\theta}P(\theta\mid D) \to \frac{a_{H}+\alpha-1}{a_{H}+\alpha+a_{T}+\beta-2}$$

## Probability(확률)
$$P(E) \in R, P(E)\ge0, P(\Omega)=1$$  
$$P(E_{1}\cup E_{2}..) = \Sigma_{i-1}^{\infty}P(E_{i}) $$  
$$ if A \subseteq B, then  P(A)\le P(B) $$  
$$P(\phi)=0$$  
$$0\le P(E) \le 1$$  
$$P(A\cup B) = P(A) + P(B) - P(A\cap B)$$  

### 조건부 확률
- 조건이 붙는 확률
- ~일 경우에 -일 확률은?
- 베이즈 정리  
$$ P(D|S) = \dfrac{P(S|D)P(D)}{P(S)} $$

### Probability Distribution
- assign, mapping이라고 합니다
- 어떤 이벤트가 발생하는 것을 특정한 값으로 assign
- 확률밀도 함수, Probability Density Function(PDF) = $$f(x)$$
- 누적분포 함수, Cumulative Distribution Function(CDF) = $$\int_{-\infty}^{\infty}f(x)dx$$

### Normal Distribution
- 파라미터나 식을 수정해 균일하게 만든 분포  
- Notation : $$\mathcal{N}(\mu, \sigma^2)$$
- Mean : $$\mu$$
- Variance : $$\sigma^2$$

$$ \mathcal{N}(x; \mu, \sigma^2) = \dfrac{1}{\sqrt{2\pi\sigma^2}} \exp \left(-\dfrac{(x-\mu)^2}{2\sigma^2}\right) $$

### Beta Distribution
- 범위가 정해진 것을 표현할 경우 주로 사용
- 확률을 모델링시 사용
- Notation : $$\text{Beta}(\alpha, \beta)$$
- Mean : $$\frac{\alpha}{\alpha+\beta}$$
- Variance : $$\frac{\alpha\beta}{(\alpha+\beta)^{2}(\alpha+\beta+1)}$$  

$$\text{Beta}(\theta; \alpha, \beta) = \dfrac{\theta^{\alpha-1}(1-\theta)^{\beta-1}}{B(\alpha, \beta)},  {B(\alpha, \beta)}=\frac{\Gamma(a)\Gamma(b)}{\Gamma(a+b)},  \Gamma(\alpha)=(\alpha-1)!$$

### Binomial Distribution
- Notation : $$\text{Bin}(N, \theta)$$
- Mean : $$N \theta$$
- Variance : $$N \theta(1-\theta)$$  

$$ \text{Bin}(x;N,\theta) = \binom N x  \theta^x(1-\theta)^{N-x} $$  

$$ \binom N x =\dfrac{N!}{x!(N-x)!} $$

### Multinomial Distribution
- binomial을 일반화
- 군집화, 자연어 처리시 사용
- Notation : $$ \text{Mu}(N,\theta)$$
- Mean : $$\text{E}[x_k] = N\theta_k$$
- Variance : $$\text{Var}[x_k] = N\theta_k(1-\theta_k)$$

$$ \text{Mu}(x;N,\theta) = \binom N x  \prod_{k=1}^K \theta_k^{x_k} = \binom N {x_1, \cdots, x_K} \prod_{k=1}^K \theta_k^{x_k} $$

이 식에서 
$$ \binom N {x_1, \cdots, x_K} = \dfrac{N!}{x_1! \cdots x_K!} $$


## Reference
- [인공지능 및 기계학습 개론1](http://www.edwith.org/machinelearning1_17) 
- [다크 프로그래머님 블로그](http://darkpgmr.tistory.com/62)
- [sanghyukchun님 블로그](http://sanghyukchun.github.io/58/)