---
layout: post
title:  "프로세스 동기화 이해하기"
subtitle:   "프로세스 동기화 이해하기"
categories: development
tags: os
comments: true
---

프로세스 동기화에 대해 작성한 글입니다

---
## 프로세스 동기화
- Process Synchronization	- 사실 요새 OS는 Thread synchronization### Cooperating Processes- Processes	- Independent vs. Cooperating	- Cooperating process: one that can affect or be affected by other processes executed in the system. 다른 프로세스에 영향을 주거나 받음	- 프로세스간 통신: 전자우편, 파일 전송	- 프로세스간 자원 공유: 메모리 상의 자료들, 데이터베이스 등	- 명절 기차표 예약, 대학 온라인 수강신청, 실시간 주식거래- Process Synchronization: Why?	- Concurrent access to shared data may result in data inconsistency	- Orderly execution of cooperating processes so that data consistency is maintained. 순서를 지켜서 이상한 상태(수강 인원을 초과해서 신청된다거나 한명이 동시에 같은 시간에 2과목 등록 등)를 피해 데이터 일관성을 유지- Example: BankAccount Problem (은행계좌문제)	- 부모님은 은행계좌에 입금; 자녀는 출금	- 입금(deposit)과 출금(withdraw)은 독립적으로 일어난다.	- 입출금 동작 알기 위해 "+", "-" 출력하기	- 입출금 동작에 시간 지연 추가```void deposit(int amount) {// 변경된 값을 임시변수에 저장하고int temp = balance + amount;System.out.print("+");// 시간 지연 후balance = temp;// 잔액 업데이트}void withdraw(int amount) {// 변경된 값을 임시변수에 저장하고int temp = balance - amount;System.out.print("-"); // 시간 지연 후balance = temp;// 잔액 업데이트}
```
- 잘못된 결과값	- 이유: 공통변수(common variable)에 대한 동시 업데이트 (concurrent update), 하이레벨 언어로는 1줄이지만 로우한 언어에선 여러 줄. 도중에 스위칭 발생	- 해결: 한 번에 한 쓰레드만 업데이트하도록(Atomic) → 임계구역 문제


```
class Test {static final int MAX = 100; // 입출금 회수public static void main(String[] args) throws	InterruptedException {	// 은행계좌를 만들고	BankAccount b =	new BankAccount();	// 부모 쓰레드와	Parent p = new Parent(b, MAX);	// 자식 쓰레드를 만든 후	Child c = new Child(b, MAX);	// 각각 실행시킨다.	p.start();	c.start();	p.join();// 부모와 자식 쓰레드가	c.join();// 각각 종료하기를 기다린다.	System.out.println("Final balance = "	+ b.getBalance());// 최종 잔액 출력 }}

class BankAccount {	int balance;	void deposit(int amount) {		balance = balance + amount;	}	void withdraw(int amount) {		balance = balance - amount;	}	int getBalance() {		return balance;	}}

class Parent extends Thread {	BankAccount b;	int count;	Parent(BankAccount b, int count) {		this.b = b;		this.count = count;}	public void run() {		for (int i=0; i<count; i++)			b.deposit(1);	}}

class Child extends Thread {	BankAccount b;	int count;	Child(BankAccount b, int count) {		this.b = b;		this.count = count;}public void run() {	for (int i=0; i<count; i++)		b.withdraw(1);	}}
```

## 임계구역 문제
---
- The Critical-Section Problem, 치명적인 오류가 일어날 수 있는 공간- Critical section	- A system consisting of multiple threads(process)	- Each thread has a segment of code, called critical section, in which the thread maybe changing common variables, updating a table, writing a file, and so on. 
	- 같이 사용하는 것들을 write, update, change하는 경우- Solution	- Mutual exclusion (상호배타): 많아야 한 쓰레드만 진입	- Progress (진행): 진입 결정은 유한 시간 내(누가 들어갈지 유한 시간 내에 결정)
	- Bounded waiting (유한대기): 어느 쓰레드라도 유한 시간 내 진입(유한 시간 내에 Critical section에 진입해야 함)
- 프로세스/쓰레드 동기화	- 임계구역 문제 해결 (틀린 답이 나오지 않도록)	- 프로세스 실행 순서 제어 (원하는 대로)
	- Busy wait 등 비효율성 제거### 잠시 정리- OS의 역할
	- Process management
		- CPU scheduling
		- Synchronization
			- 임계구역 문제를 해결해야 하고 프로세스 실행 순서를 제어할 수 있어야 함
			- 비효율성 제거
			- 동기화 하기 위해 만든 도구 : 세마포, 모니터 
	- Memory management
	- File System
	- IO
	- ...## 세마포- Synchronization Tools (동기화 도구)	- Semaphores	- Monitors	- ......- Semaphores (세마포)	- n. (철도의) 까치발 신호기, 시그널; U (군대의) 수기(手旗) 신호	- 동기화 문제 해결을 위한 소프트웨어 도구	- 1960년대 네덜란드의 Edsger Dijkstra 가 제안	- 구조: 정수형 변수 + 두 개의 동작 (P, V)- 동작	- 마치 스택(stack)과 같이 ...: push() & pop()	- P: Proberen (test) → acquire()	- V: Verhogen (increment) → release()- 전체 구조	- 내부적으로는 프로세스(쓰레드)가 대기하는 큐(queue/list)가 포함되어있다.```class Semaphore {	private int value; // number of permits	Semaphore(int value) {		...	}	void acquire() { // P	...	}	void release() { // V	...	}}
```

- 세부 동작	- If the semaphore value is negative, its magnitude is the number of processes waiting on that semaphore.```void acquire() {	value--;	if (value < 0) {		add this process/thread to list;
		block;	}}
void release() {	value++;	if (value <= 0) {		remove a process P from list;		wakeup P;	}}
```

- 일반적 사용 (1): Mutual exclusion	- sem.value = 1; // Number(#) of permit	| sem.acquire(); |
	|:--------------:|
	|Critical-Section|
	| sem.release(); |- 예제: BankAccount Problem```import java.util.concurrent.Semaphore;class BankAccount {	int balance;	Semaphore sem;	BankAccount() {		sem = new Semaphore(1);// 초기값 = 1	}	void deposit(int amount) { // 입금		try {			sem.acquire(); // 진입 전: acquire()		} catch (InterruptedException e) {}		int temp = balance + amount;		System.out.print("+");		balance = temp;		sem.release(); // 나온 후: release()	}	void withdraw(int amount) { // 출금		try {		sem.acquire(); // 진입 전: acquire()		} catch (InterruptedException e) {}
		int temp = balance - amount;	System.out.print("-");	balance = temp;	sem.release(); // 나온 후: release()}int getBalance() {	return balance;}}
```
- 일반적 사용 (2): Ordering	- sem.value = 0; // # of permit
	- P1을 먼저 실행했으면 OK, P2가 먼저 실행했으면 sem.acquire()에 의해 -1이 되서 밑으로 못 내려감. Context Switch으로 S1이 진행한 후, sem.release()로 0이 되서 S2가 실행
	
	|        P1      |       P2       |
	|:--------------:|:--------------:|
	|                | sem.acquire(); |
	|       S1       |       S2       |
	| sem.release(); |                |
- 예제: BankAccount Problem	- (1) 항상 입금 먼저 (= Parent 먼저)		- 상호배타를 위한 sem 세마포어 외에 실행순서 조정을 위한 sem2 세마포어를 추가
		- 프로그램이 시작되면 부모 쓰레드는 그대로 실행되게 하고, 자식 쓰레드는 초기 값이 0인 sem2 세마포어에 대해 acquire() 를 호출하게 하도록 deposit(), withdraw() 메소드를 각각 수정
		- 즉 자식 쓰레드가 먼저 실행되면 세마포어 sem2에 의해 블록되고, 블록된 자식 쓰레드는 나중에 부모 쓰레드가 깨워주게 한다.

		|     Parent     |     Child      |
		|:--------------:|:--------------:|
		|                | sem.acquire(); |
		|    deposit     |   withdraw     |
		| sem.release(); |                |
		- (2) 항상 출금 먼저 (= Child 먼저)		- ☞ 위와 유사	- (3) 입출금 교대로 (P-C-P-C-P-C- …)		- 블록된 부모 쓰레드는 자식 쓰레드가 깨워주고, 블록된 자식 쓰레드는 부모 쓰레드가 각각 깨워주도록 한다
		- 상호배타를 위한 sem 세마포어 외에 부모 쓰레드의 블록을 위해 dsem 세마포어를, 자식 쓰레드의 블록을 위해 wsem 세마포어를 각각 사용한다
		
		|     Parent      |      Child      |
		|:---------------:|:---------------:|
		|                 | wsem.acquire(); |
		|    deposit      |    withdraw     |
		| wsem.release(); | dsem.release(); |
		| dsem.acquire(); |                 |
			- (4) 잔액이 항상 0 이상		- 출금하려는 액수보다 잔액이 작으면 자식 쓰레드가 블록되도록 하며 이후 부모 쓰레드가 깨워주게 한다
		- 상호배타를 위한 sem 세마포어 외에 sem2 세마포어를 사용하여 잔액 부족시 자식 쓰레드가 블록되도록 한다

## 전통적 동기화 예제
- Classical Synchronization Problems- (1) Producer and Consumer Problem	- 생산자-소비자 문제	- 유한버퍼 문제 (Bounded Buffer Problem)- (2) Readers-Writers Problem	- 공유 데이터베이스 접근- (3) Dining Philosopher Problem	- 식사하는 철학자 문제### 생산자-소비자 문제- 생산자가 데이터를 생산하면 소비자는 그것을 소비	- 예: 컴파일러 > 어셈블러, 파일 서버 > 클라이언트, 웹 서버 > 웹 클라이언트- 유한 버퍼 (bounded buffer)
	- producer가 생성하고, 저장 창고(buffer)에 저장하고 consumer가 사용(마치 메세지 큐 시스템 펍섭 같음)	- 생산된 데이터는 버퍼에 일단 저장 (속도 차이 등)	- 현실 세계에서 버퍼 크기는 유한	- 생산자는 버퍼가 가득 차면 더 넣을 수 없다.	- 소비자는 버퍼가 비면 뺄 수 없다

```
class Test {	public static void main(String[] arg) {		Buffer b = new Buffer(100);		Producer p =	new Producer(b, 10000);		Consumer c = new Consumer(b, 10000);		p.start();		c.start();		try {			p.join();			c.join();		} catch (InterruptedException e) {}		System.out.println(
		"Number of items in the buf is " + b.count);	}}
class Buffer {	int[] buf;	int size, count, in, out;	Buffer(int size) {		buf = new int[size];		this.size = size;		count = in = out = 0;	}void insert(int item) {	/* check if buf is full */	while (count == size)	;	/* buf is not full */	buf[in] = item;	in = (in+1)%size;	count++;}int remove() {	/* check if buf is empty */	while (count == 0)	;	/* buf is not empty */	int item = buf[out];	out = (out+1)%size;	count--;	return item;	}}
class Producer extends Thread {	Buffer b;	int n;	Producer(Buffer b, int n) {	this.b = b;	this.n = n;}	public void run() {		for (int i=0; i<n; i++)		b.insert(i);}}
class Consumer extends Thread {	Buffer b;	int n;	Consumer(Buffer b, int n) {		this.b = b;		this.n = n;}
public void run() {	int item;	for (int i=0; i<n; i++)	item = b.remove();	}}
```- 잘못된 결과	- 실행 불가, 또는	- count ≠ 0 (생산된 항목 숫자 ≠ 소비된 항목 숫자)	- 최종적으로 버퍼 내에는 0 개의 항목이 있어야- 이유	- 공통변수 count, buf[] 에 대한 동시 업데이트	- 공통변수 업데이트 구간(= 임계구역)에 대한 동시 진입- 해결법	- 임계구역에 대한 동시 접근 방지 (상호배타)	- 세마포를 사용한 상호배타 (mutual exclusion)	- 세마포: mutex.value = 1 (# of permit)

	
```
import java.util.concurrent.Semaphore;class Buffer {	int[] buf;	int size, count, in, out;	Semaphore mutex;	Buffer(int size) {
		buf = new int[size];		this.size = size;		count = in = out = 0;		mutex = new Semaphore(1);	}	void insert(int item) {		while (count == size);		try {			mutex.acquire();		} catch (InterruptedException e) {}		buf[in] = item;	in = (in+1)%size;	count++; // increase item count	mutex.release();	}	int remove() {		while (count == 0);			try {				mutex.acquire();				int item = buf[out];				out = (out+1)%size;				count--;				mutex.release();				return item;			} catch (InterruptedException e) {				return -1; // dummy		}	}}
```	

- Busy-wait	- 생산자: 버퍼가 가득 차면 기다려야 = 빈(empty) 공간이 있어야	- 소비자: 버퍼가 비면 기다려야 = 찬(full) 공간이 있어야
	- 세마포를 사용해 버퍼가 다 찼으면 프로듀서는 세마포에 들어가서 대기
	- 그리고 빈 공간이 생기면 들어감- 세마포를 사용한 busy-wait 회피 	- 생산자: empty.acquire() // # of permit = BUF_SIZE
		- empty.acquire();		- PRODUCE;		- full.release(); 	- 소비자: full.acquire() // # of permit = 0
		- full.acquire();		- CONSUME;		- empty.release();

```
import java.util.concurrent.Semaphore;class Buffer {	int[] buf;	int size, count, in, out;	Semaphore mutex, full, empty;	Buffer(int size) {		buf = new int[size];		this.size = size;		count = in = out = 0;		mutex = new Semaphore(1);		full = new Semaphore(0);		empty = new Semaphore(size);	}	void insert(int item) {		try {		empty.acquire();		// while (count == size);		mutex.acquire();		count++;		buf[in] = item;		in = (in+1)%size;		mutex.release();		full.release();		}		catch (InterruptedException e) {		}}	int remove() {		try {		full.acquire();		// while (count == 0);		mutex.acquire();		count--;		int item = buf[out];		out = (out+1)%size;		mutex.release();
		return item;		}		catch (InterruptedException e) {			return -1; // dummy		}	}}
```


### Readers-Writers Problem- 공통 데이터베이스	- Readers: read data, never modify it	- Writers: read data and modifiy it	- 상호배타: 한 번에 한 개의 프로세스만 접근 ☞ 비효율적
	- Database : Critical Section, 최대 한놈만 접근하도록 하면 비효율적임. 한 reader가 db에 들어가있는 경우 다른 reader가 들어와도 상관이 없음(읽기만 하니) 그러나 writer는 상호배제. reader가 들어갔으면 writer는 금지- 효율성 제고	- Each read or write of the shared data must happen within a critical section	- Guarantee mutual exclusion for writers	- Allow multiple readers to execute in the critical section at once- 변종	- The first R/W problem (readers-preference)	- The second R/W problem (writers-preference)	- The Third R/W problem### Dining Philosopher Problem - 5명의 철학자, 5개의 젓가락, 생각 → 식사 → 생각 → 식사 …- 식사하려면 2개의 젓가락 필요
- 젓가락을 들면 주변 사람이 사용 불가- 프로그래밍 ☞ 코드-6	- 젓가락: 세마포 (# of permit = 1)	- 젓가락과 세마포에 일련번호: 0 ~ 4	- 왼쪽 젓가락 → 오른쪽 젓가락

```
import java.util.concurrent.Semaphore;class Philosopher extends Thread {	int id; // philosopher id	Semaphore lstick, rstick; // left, right chopsticks	Philosopher(int id, Semaphore lstick, Semaphore rstick) {
		this.id = id;		this.lstick = lstick;		this.rstick = rstick;}	public void run() {		try {			while (true) {				lstick.acquire();				rstick.acquire();				eating();				lstick.release();				rstick.release();				thinking();			}		}catch (InterruptedException e) { }	}	void eating() {		System.out.println("[" + id + "] eating");	}	void thinking() {		System.out.println("[" + id + "] thinking");	}}class Test {	static final int num = 5; // number of 	philosphers & chopsticks	public static void main(String[] args) {	int i;	/* chopsticks */	Semaphore[] stick = new Semaphore[num];	for (i=0; i<num; i++)	stick[i] = new Semaphore(1);	/* philosophers */	Philosopher[] phil = new Philosopher[num];	for (i=0; i<num; i++)		phil[i] = new Philosopher(i, stick[i], stick[(i+1)%num]);	/* let philosophers eat and think */	for (i=0; i<num; i++)		phil[i].start();	}}

```

- 잘못된 결과: starvation	- 모든 철학자가 식사를 하지 못해 굶어 죽는 상황
	- 모두 왼쪽 젓가락을 들면 아무도 식사를 할 수 없음	- 이유 = 교착상태 (deadlock)


### 교착상태
- Deadlock- 프로세스는 실행을 위해 여러 자원을 필요로 한다.	- CPU, 메모리, 파일, 프린터, ……	- 어떤 자원은 갖고 있으나 다른 자원은 갖지 못할 때 (e.g., 다른 프로세스가 사용 중) 대기해야	- 다른 프로세스 역시 다른 자원을 가지려고 대기할 때 교착상태 가능성!
	- 꼬리물기- 교착상태 필요 조건 (Necessary Conditions)	- Mutual exclusion (상호배타)	- Hold and wait (보유 및 대기)	- No Preemption (비선점)	- Circular wait (환형대기)- 자원 (Resources)	- 동일 형식 (type) 자원이 여러 개 있을 수 있다 (instance)	- 예: 동일 CPU 2개, 동일 프린터 3개 등- 자원의 사용	- 요청 (request) → 사용 (use) → 반납 (release)- 자원 할당도 (Resource Allocation Graph)	- 어떤 자원이 어떤 프로세스에게 할당되었는가?	- 어떤 프로세스가 어떤 자원을 할당 받으려고 기다리고 있는가?	- 자원: 사각형, 프로세스: 원, 할당: 화살표- 교착상태 필요조건	- 자원 할당도 상에 원이 만들어져야 (환형대기)	- 충분조건은 아님!- 예제: 식사하는 철학자 문제	- 원이 만들어지지 않게 하려면?
	- 짝수번 사람은 왼쪽부터 홀수번 사람은 오른쪽부터

### 교착상태 처리- 4가지 방법 (Handling deadlocks)
	- 교착상태 방지 (Deadlock Prevention)	- 교착상태 회피 (Deadlock Avoidance)	- 교착상태 검출 및 복구 (Deadlock Detection & Recovery)	- 교착상태 무시 (Don't Care)- (1) 교착상태 방지	- Deadlock Prevention	- 교착상태 4가지 필요조건 중 한 가지 이상 결여되게 만듬		- 상호배타 (Mutual exclusion)		- 보유 및 대기 (Hold and wait)		- 비선점 (No preemption)		- 환형 대기 (Circular wait)	- 상호배타 (Mutual exclusion)		- 자원을 공유 가능하게
		- 원천적으로 불가할 확률이 큼
		- 따라서 교착 상태를 방지하기엔 부적절할 수 있음	- 보유 및 대기 (Hold & Wait)
		- 동시에 모두 잡도록 설정. 동시에 잡을 수 없으면 아예 잡지 않음 		- 자원을 가지고 있으면서 다른 자원을 기다리지 않게		- 예: 자원이 없는 상태에서 모든 자원 대기; 일부 자원만 가용하면 보유 자원을 모두 놓아주기		- 단점: 자원 활용률 저하, 기아 (starvation)	- 비선점 (No preemption)
		- 자원을 뺏어올 수 있도록 		- 자원을 선점 가능하게
		- 원천적 불가할 수도 (예: 프린터)
			- CPU는 강제로 context switch로 가능하지만...	- 환형대기 (Circular wait)		- 예: 자원에 번호부여; 번호 오름차순으로 자원 요청		- 단점: 자원 활용률 저하- (2) 교착상태 회피	- Deadlock Avoidance		- 교착상태 = 자원 요청에 대한 잘못된 승인 (≒ 은행 파산)
		- 데드락은 자원 요청에 잘못 응답해서 발생한 것이라고 생각	- 예제		- 12개의 magnetic tape 및 3개의 process		- 안전한 할당 (Safe allocation)

		| Process | Max needs | Current needs |
		|:-------:|:---------:|:-------------:|
		|    P0   |     10    |       5       |
		|    P1   |     4     |       2       |
		|    P2   |     9     |       2       |

		- 불안전한 할당 (Unsafe allocation)
				| Process | Max needs | Current needs |
		|:-------:|:---------:|:-------------:|
		|    P0   |     10    |       5       |
		|    P1   |     4     |       2       |
		|    P2   |     9     |       3       |	- 운영체제는 자원을 할당할 때 불안전 할당 되지 않도록		- 불안전 할당 → 교착상태		- 대출전문 은행과 유사: Banker's Algorithm- (3) 교착상태 검출 및 복구	- Deadlock Detection & Recovery
	- 필요한 자원을 모두 나눠줌	- 교착상태가 일어나는 것을 허용!!	- 주기적 검사	- 교착상태 발생 시 복구!!
	- 검출		- 검사(detection)에 따른 추가 부담 (overhead): 
		- 그 전의 상태를 기억해야 함 => 계산, 메모리 사용	- 복구(recovery)
		- 프로세스 일부 강제 종료		- 자원 선점하여 일부 프로세스에게 할당- (4) 교착상태 무시	- 교착상태는 실제로 잘 일어나지 않는다!		- 4가지 필요조건 모두 만족해도 …		- 교착상태 발생 시 재시동 (PC 등 가능)

## 모니터(Monitor)
- 요즘은 세마포보다 모니터를 더 많이 사용
- 자바에서 사용

- 세마포 이후 프로세스 동기화 도구- 세마포 보다 고수준 개념- 구조	- 공유자원 + 공유자원 접근함수	- 2개의 queues: 배타동기 + 조건동기
		- 배타동기 : 한 쓰레드만 접근할 수 있음
		- wait()를 부르면 조건동기 큐로 이동	- 공유자원 접근함수에는 최대 1개의 쓰레드만 진입	- 진입 쓰레드가 조건동기로 블록되면 새 쓰레드 진입가능	- 새 쓰레드는 조건동기로 블록된 쓰레드를 깨울 수 있다(notify())
	- 깨워진 쓰레드는 현재 쓰레드가 나가면 재진입할 수 있다- 자바의 모든 객체는 모니터가 될 수 있다.	- 배타동기: ```synchronized``` 키워드 사용하여 지정	- 조건동기: ```wait()```, ```notify()```, ```notifyAll()``` 메소드 사용	```
class C {	private int value, …;	synchronized void f() {		...	}	synchronized void g() {	...	}	void h() {	...	}}```
- 일반적 사용 (1): Mutual exclusion

```synchronized {Critical-Section}
```- 예제: BankAccount Problem```class BankAccount {	int balance;	synchronized void deposit(int amount) {		int temp = balance + amount;		System.out.print("+");		balance = temp;		notify();// 자식 쓰레드를 깨워준다.	}	synchronized void withdraw(int amount) {		// 잔액이 부족하면 블록된다.		while (balance < amount)
		try {
			wait();		}		catch (InterruptedException e) {}		int temp = balance - amount;		System.out.print("-");		balance = temp;		}	int getBalance() {		return balance;	}}
```

- 일반적 사용 (2): Ordering

|        P1      |       P2       |
|:--------------:|:--------------:|
|     wait()     |                |
|       S1       |       S2       |
|                |    notify()    |- 예제: BankAccount Problem	- 항상 입금 먼저 (= Parent 먼저)	- 항상 출금 먼저 (= Child 먼저)	- 입출금 교대로 (P-C-P-C-P-C- …)- 예제: 생산자-소비자 문제```class Buffer {	int[] buf;	int size, count, in, out;	Buffer(int size) {		buf = new int[size];		this.size = size;		count = in = out = 0;	}	synchronized void insert(int item) {		while (count == size)		try {			wait();		} catch (InterruptedException e) {}		buf[in] = item;		in = (in+1)%size;		count++;		notify();	}	synchronized int remove() {		while (count == 0)		try {
			wait();		} catch (InterruptedException e) {}		int item = buf[out];		out = (out+1)%size;		count--;		notify();		return item;	}}
```- 예제: 식사하는 철학자 문제```class Chopstick {	private boolean inUse = false;	synchronized void acquire() throws 		InterruptedException {		while (inUse)		wait();		inUse = true;	}	synchronized void release() {		inUse = false;		notify();	}}
```

## Reference
- [양희재 교수님 운영체제 강의](http://kocw.net/home/search/kemView.do?kemId=978503)
- [introduction to Operating System](https://www.slideshare.net/LukaXavi/introduction-to-operating-system-10938506)











