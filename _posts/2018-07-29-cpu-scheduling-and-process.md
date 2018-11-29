---
layout: post
title:  "CPU Scheduling, Process 이해하기"
subtitle:   "CPU Scheduling, Process 이해하기"
categories: development
tags: os
comments: true
---

CPU Scheduling, Process에 대해 작성한 글입니다

- OS의 역할
	- Process management
		- CPU scheduling
		- Synchronization
	- Memory management
	- File System
	- IO
	- etc
## CPU 스케쥴링
---
- Preemptive vs Non-preemptive (선점 (先占) : 비선점(非先占))
	- Preemptive : CPU가 어느 프로세스를 실행하고 있는데(아직 끝나지도 않았고 IO를 만난 것도 아닌데) 강제로 쫓아내고 새로운 것이 들어갈 수 있는 스케쥴링(응급실)
	- Non-preemptive : 프로세스가 끝나거나 IO를 만나기 전엔 안됨(은행)- Scheduling criteria : 스케쥴링 척도	- CPU Utilization (CPU 이용률) : CPU가 얼마나 놀지않고 부지런히 일하는가
	- Throughput (처리율) : 시간당 몇 개의 작업을 처리하는가
	- Turnaround time (반환시간) : 작업이 레디큐에 들어가서 나오는 시간의 차이(병원에서 진료 받을 때..대기하고 CT 찍고, ... 나오는 시간 차) 짧아야 좋음
	- Waiting time (대기시간) : CPU가 서비스를 받기 위해 Ready Queue에서 얼마나 기다렸는가
	- Response time (응답시간) : Interactive system에서 중요. 클릭-답, 타이핑-답. 첫 응답이 나올 때 까지 걸리는 시간## CPU Scheduling Algorithms- First-Come, First-Served (FCFS) : 먼저 온 놈 먼저 처리- Shortest-Job-First (SJF) :  작업 시간이 짧은 놈 먼저 처리	- Shortest-Remaining-Time-First- Priority : 우선 순위가 높은 놈부터- Round-Robin (RR) : 빙빙 돌면서 순서대로 - Multilevel Queue : 큐를 여러개 돌림- Multilevel Feedback Queue---
### First-Come, First-Served (FCFS) Scheduling
- 먼저 온 놈 먼저 서비스. 세상에서 많이 사용- Simple & Fair
- 꼭 좋은 성능을 내는 것은 아님- Example: Find Average Waiting Time
	- P1, P2, P3순일 경우 (0+24+27)/3 = 17
	- P3, P2, P1순일 경우 (6+3+0)/3 = 3
	- Gantt Chart
	
		| Process | Burst Time |
		|:-------:|:----------:|
		|    P1   |     24     |
		|    P2   |      3     |
		|    P3   |      3     |	
- Convoy Effect (호위효과) : 왕 뒤에 시중들이 따라다님. 다른 프로세스들이 시중들같이 따라다님- Nonpreemptive scheduling : 앞의 프로세스가 끝나야 뒤 프로세스가 진행### Shortest-Job-First (SJF) Scheduling
- 실행 시간이 짧은 놈을 먼저 실행
- 대기 시간을 줄이는 관점에선 SJF가 제일 좋음
- Example:

	| Process | Burst Time |
	|:-------:|:----------:|
	|    P1   |     6      |
	|    P2   |     8      |
	|    P3   |     7      |
	|    P4   |     3      |	- AWT = (3+16+9+0)/4 = 7 msec	- cf. 10.25 msec (FCFS)- Provably optimal- Not realistic; prediction may be needed. 비현실적임. 예측을 해야 함### Preemptive or Nonpreemtive- cf. Shortest-Remaining-Time-First (최소잔여시간 우선)- Example| Process | Arrival Time | Burst Time |
|:-------:|:------------:|:----------:|
|    P1   |       0      |      8     |
|    P2   |       1      |      4     |
|    P3   |       2      |      9     |
|    P4   |       5      |      5     |
- Preemptive: AWT = (9+0+15+2)/4 = 26/4 = 6.5 msec- Nonpreemptive: (0+7+15+9)/4 = 7.75 msec### Priority Scheduling- Priority (우선순위): typically an integer number	- Low number represents high priority in general (Unix/Linux)- Example
 | Process | Burst Time | Priority |
|:-------:|:----------:|:--------:|
|    P1   |     10     |     3    |
|    P2   |      1     |     1    |
|    P3   |      2     |     4    |
|    P4   |      1     |     5    |
|    P5   |      5     |     2    |


- AWT = P2, P5, P1, P3, P4 = (6+0+16+18+1)/5 = 8.2
- Priority	- Internal(내부적 요소): time limit, memory requirement, i/o to CPU burst, …	- External: amount of funds being paid(유료 컴퓨터일 경우), political factors, …- Preemptive or Nonpreemptive- Problem	- Indefinite blocking: starvation (기아) 외부에서 새로운 프로세스가 들어오는데, 그 프로세스가 우선 순위가 높으면 기다리던 프로세스보다 먼저 작업	- Solution: aging. 오래 기다릴수록 우선 순위를 올림### Round-Robin (RR) Scheduling
- 수건 돌리기하듯 돌아가며 진행
- 시간을 쪼개서 프로세스 진행
- 쪼갠 동일한 시간을 Time Quantum, Time Slice라 부름	
	- Time quantum 시간양자 = time slice (10 ~ 100msec)- Time-sharing system (시분할/시공유 시스템)- Preemptive scheduling : 끝나지 않아도 타임 퀀텀이 지나가면 다른 프로세스가 실행- Example| Process | Burst Time |
|:-------:|:----------:|
|    P1   |     24     |
|    P2   |      3     |
|    P3   |      3     |- Time Quantum = 4msec- AWT = (6+4+7)/3 = 17/3 = 5.66 msec- Time Quantum이 1이면 AWT이 변함! 퀀텀을 얼마나 잡아야 성능이 좋을까?- Performance depends on the size of the time quantum (Δ), 타임 퀀텀에 의존적	- Δ → ∞는 FCFS와 동일	- Δ → 0는 Processor sharing : 스위칭이 빈번하게 돌아서 같이 도는 것처럼 보임(* context switching overhead가 빈번하게 발생)- Example: Average turnaround time (ATT)

| Process | Burst Time |
|:-------:|:----------:|
|    P1   |      6     |
|    P2   |      3     |
|    P3   |      1     |
|    P4   |      7     |

- Average Turnaround Time- ATT = (15+9+3+17)/4 = 11.0 msec (Δ = 1)- ATT = (15+8+9+17)/4 = 12.25 msec (Δ = 5)
- 데이터에 따라 성능이 다름

### Multilevel Queue Scheduling- Process groups
	- 프로세스를 그룹화. 은행에서 간단한 업무 / 대출 업무 구분해서 받는 것과 유사	- System processes : OS에서 작업. 가상 메모리, IO, 통신. 가장 빨리 처리해야 함	- Interactive processes : 사용자랑 대화하는 프로그램. 게임(<-> 컴파일하는 것은 대화하지 않는 프로그램임)	- Interactive editing processes : 편집하는 프로그램	- Batch processes : 대화형이 아닌 프로세스. 꾸러미로 일괄적으로 처리	- Student processes - Single ready queue → Several separate queues	- 각각의 Queue에 절대적 우선순위 존재	- 또는 CPU time을 각 Queue 에 차등배분
	- 그룹에 따라 다르게 스케줄링	- 각 Queue 는 독립된 scheduling 정책### Multilevel Feedback Queue Scheduling- 복수 개의 Queue- 다른 Queue로의 점진적 이동	- 모든 프로세스는 하나의 입구로 진입	- 너무 많은 CPU time 사용 시 다른 Queue로	- 기아 상태 우려 시 우선순위 높은 Queue로
	- 한 Queue에만 있지 않고 옮겨가는 방식## 프로세스 생성과 종료- 프로세스는 프로세스에 의해 만들어진다!	- 부모 프로세스 (Parent process)	- 자식 프로세스 (Child process)
	- 제일 첫 프로세스는? 부팅하고 OS가 첫 프로세스(init)를 생성	- cf. Sibling processes : 부모가 같은 형제 프로세스	- 프로세스 트리 (process tree)- Process Identifier (PID)	- Typically an integer number	- cf. PPID : Parent PID- 프로세스 생성 (creation)	- fork() system call = 부모 프로세스 복사	- exec() = 실행파일을 메모리로 가져오기- 예제: Windows 7 프로세스 나열 : ctrl + alt + delete- 예제: Ubuntu Linux 프로세스 나열 : ps- 프로세스 종료 (termination)	- exit() system call
	- 해당 프로세스가 가졌던 모든 자원은 O/S에게 반환 (메모리, 파일, 입출력장치 등)

## 쓰레드(Thread)
- 프로세스 내에서 실행되는 세부 작업의 단위- 프로세스 내부의 흐름, 맥
```class Test {	public static void main(String[] args) {	int n = 0;	int m = 6;	System.out.println(n+m);	while (n < m)		n++;	System.out.println("Bye");}}
```
- 다중 쓰레드 (Multithreads)	- 한 프로그램에 2개 이상의 맥	- 맥이 빠른 시간 간격으로 스위칭 된다 ⇒ 여러 맥이 동시에 실행되는 것처럼 보인다	- concurrent(공존하는) vs simultaneous(동시에)- 예: Web browser	- 화면 출력하는 쓰레드 + 데이터 읽어오는 쓰레드- 예: Word processor	- 화면 출력하는 쓰레드 + 키보드 입력 받는 쓰레드 + 철자/문법 오류 확인 쓰레드- 예: 음악 연주기, 동영상 플레이어, Eclipse IDE, 요즘 사용하는 대부분의 프로그램들
- 요즘 프로그램들은 Context 변화하는 단위가 프로세스가 아닌 쓰레드- Thread vs Process	- 한 프로세스에는 기본 1개의 쓰레드		- 단일 쓰레드 (single thread) 프로그램	- 한 프로세스에 여러 개의 쓰레드		- 다중 쓰레드 (multi-thread) 프로그램	- 쓰레드 구조		- 프로세스의 메모리 공간 공유 (code, data)		- 프로세스의 자원 공유 (file, i/o, …)		- 비공유: 개별적인 PC, SP, registers, stack	- 프로세스의 스위칭 vs 쓰레드의 스위칭- 예제: 자바 쓰레드	- java.lang.Thread
	- 주요 메소드		- public void run() // 새로운 맥이 흐르는 곳 (치환)		- void start() // 쓰레드 시작 요청		- void join() // 쓰레드가 마치기를 기다림		- static void sleep() // 쓰레드 잠자기		- Thread.run()			- 쓰레드가 시작되면 run() 메소드가 실행된다			- ⇒ run() 메소드를 치환한다		```class MyThread extends Thread {	public void run() { // 치환 (override)	// 코드	}}
```
- 예제: 글자 A 와 B 를 동시에 화면에 출력하기	- 모든 프로그램은 처음부터 1개의 쓰레드는 갖고 있다 (main)	- 2개의 쓰레드: main + MyThread	```class Test {	public static void main(String[] arg) {	MyThread th = new MyThread();	th.start();	for (int i=0; i<1000; i++)		System.out.print("A");	}}class MyThread extends Thread {	public void run() {	for (int i=0; i<1000; i++)		System.out.print("B");}
```



## Reference
- [양희재 교수님 운영체제 강의](http://kocw.net/home/search/kemView.do?kemId=978503)
- [introduction to Operating System](https://www.slideshare.net/LukaXavi/introduction-to-operating-system-10938506)
- [위키백과](https://ko.wikipedia.org/wiki/%EC%8A%A4%EB%A0%88%EB%93%9C_(%EC%BB%B4%ED%93%A8%ED%8C%85))










