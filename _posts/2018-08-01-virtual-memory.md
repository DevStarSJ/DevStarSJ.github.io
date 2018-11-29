---
layout: post
title:  "가상 메모리 이해하기"
subtitle:   "가상 메모리 이해하기"
categories: development
tags: os
comments: true
---

가상 메모리에 대해 작성한 글입니다

---

## 가상 메모리- Virtual Memory- 물리 메모리 크기 한계 극복	- 물리 메모리보다 큰 프로세스를 실행?	- e.g. 100MB 메인 메모리에서 200MB 크기의 프로세스 실행- 어떻게?	- 프로세스 이미지를 모두 메모리에 올릴 필요는 없다.	- 현재 실행에 필요한 부분만 메모리에 올린다!	- 오류 처리 제외, 배열 일부 제외, 워드프로세스에서 정렬, 표 기능 제외 ☞ 동적 적재(dynamic loading)와 비슷한 개념### 요구 페이징- Demand Paging
	- 가상 메모리는 거의 Demand Paging을 사용(다른 방법도 있지만..) 	- 프로세스 이미지는 backing store에 저장	- 프로세스는 페이지의 집합	- 지금 필요한 페이지만 메모리에 올린다(load) ☞ 요구되는 (demand) 페이지만 메모리에 올린다- 하드웨어 지원	- valid 비트 추가된 페이지 테이블
		- valid 비트 : 메모리에 없으면 0, 있으면 1 	- backing store (= swap device)- 페이지 결함(Page Fault)	- 접근하려는 페이지가 메모리에 없다 (invalid) = 페이지 부재	- Backing store에서 해당 페이지를 가져온다.	- Steps in handling a page fault- 용어	- pure demand paging : 처음 실행할 때 0개의 페이지로 시작, 속도가 느리지만 메모리가 절약됨	- prepaging : 미리 페이지를 가지고 옴- 비교: swapping vs demand paging
	- backing 스토어와 메모리를 왔다갔다 하는 것은 유사
	- swapping : 프로세스 단위
	- demang paging : 페이지 단위- 유효 접근 시간	- Effective Access Time
	- 메인 메모리에 올라와있는지에 따라 어떤 것은 빠르게 어떤 것은 느리게 읽혀짐. 평균적으론 얼마일까?를 나타내는 값
	- p: probability of a page fault = page fault rate	- $$T_{eff} = (1-p)T_{m} + pT_{p}$$- 예제	- $$T_{m}$$ = 200 nsec (DRAM)	- $$T_{p}$$ = 8 msec (seek time + rotational delay + transfer time)	- $$T_{eff}$$ = (1-p)200 + p8,000,000 = 200 + 7,999,800p	- p = 1/1,000 ☞ $$T_{eff}$$ = 8.2usec (40배 느림)	- p = 1/399,990 ☞ $$T_{eff}$$ = 220nsec (10% 느림)- 지역성의 원리	- Locality of reference
		- local : 지역에 모여있다	- 메모리 접근은 시간적, 공간적 지역성을 가진다!
		- 컴퓨터는 반복문이 많아 근처를 읽을 확률이 큼	- 실제 페이지 부재 확률은 매우 낮다
	- 공간적 지역성 : 1000번째를 읽은 후 근접 부분을 읽을 확률이 큼- 다른 방법	- HDD 는 접근 시간이 너무 길다 ☞ swap device 로 부적합	- SSD 또는 느린 저가 DRAM 사용### 페이지 교체- Page Replacement	- 요구되어지는 페이지만 backing store 에서 가져온다	- 프로그램 실행 계속에 따라 요구 페이지가 늘어나고,	- 언젠가는 메모리가 가득 차게 된다 ☞ Memory full!	- 메모리가 가득 차면 추가로 페이지를 가져오기 위해	- 어떤 페이지는 backing store로 몰아내고 (page-out)	- 그 빈 공간으로 페이지를 가져온다 (page-in)	- 용어: victim page- Victim Page
	- 쫓겨난 페이지. 희생양 	- 어느 페이지를 몰아낼 것인가?	- i/o 시간 절약을 위해	- 기왕이면 modify 되지 않은 페이지를 victim으로 선택	- 방법: modified bit(= dirty bit)
		- 수정되었으면 1- 여러 페이지 중에서 무엇을 victim으로?	- Random : 성능도 랜덤
	- First-In First-Out (FIFO)	- 그외	- 용어: 페이지 교체 알고리즘 (page replacement algorithms)- 페이지 참조 스트링 (Page reference string)
	- 페이지 참조 열. 몇 번째 페이지를 읽으려고 하는가?	- CPU가 내는 주소: 100 101 102 432 612 103 104 611 612	- Page size = 100 바이트라면	- 페이지 번호 = 1 1 1 4 6 1 1 6 6
		- 연속된 페이지에선 page faults가 일어나지 않음
		- 따라서 이어지는 숫자는 스킵하는 것이 Page reference string	- Page reference string = 1 4 6 1 6- Page Replacement Algorithms	- FIFO (First-In First-Out)	- OPT (Optimal)	- LRU (Least-Recently-Used)

---

- (1) First-In First-Out (FIFO)	- Simplest		- Idea: 초기화 코드는 더 이상 사용되지 않을 것	- 예제		- 페이지 참조 스트링 = 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1
			- 7 0 1 -> 2 0 1 -> 2 3 1 -> 2 3 0 -> ... 		- number of frames = 3		- 15 page faults	- Belady's Anomaly		- 프레임 수 (= 메모리 용량) 증가에 Page Fault 회수 증가
		- 상식에 어긋나는 일- (2) Optimal (OPT)	- Rule: Replace the page that will not be used for the longest period of time
	- 최적 알고리즘 (제일 좋음)
	- 앞으로 가장 오랜 기간동안 사용이 안될 것을 victim으로!	- 예제		- 페이지 참조 스트링 = 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1
			- 7 0 1 -> 2 0 1 -> 2 0 3 -> 2 4 3 -> ... 		- number of frames = 3		- 9 page faults	- Unrealistic		- 미래는 알 수 없다!		- cf. SJF CPU scheduling algorithm
			- 레디큐 안에 프로세스가 여러 개 있을 때, 작업 시간이 제일 작은 것을 선택
			- 작업 시간이 제일 작은 것은 실제로 알 수 없음- (3) Least-Recently-Used (LRU)
	- Rule: Replace the page that has not been used for the longest period of time
	- 과거를 보고 미래를 짐작하는 알고리즘
	- 최근에 가장 적게 사용된 것을 victim으로!(근사화)
	- 대부분 LRU를 사용	- Idea: 최근에 사용되지 않으면 나중에도 사용되지 않을 것
		- 저번 학기에 공부를 잘한 사람은 이번 학기에 공부를 잘할 확률이 높다..?	- 예제		- 페이지 참조 스트링 = 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1
			- 7 0 1 -> 2 0 1 -> 2 0 3 -> 4 0 3 -> ...		- number of frames = 3		- 12 page faults	- Global replacement		- 메모리 상의 모든 프로세스 페이지에 대해 교체	- Local replacement		- 메모리 상의 자기 프로세스 페이지에 대해 교체	- 성능 비교		- Global replacement가 더 효율적일 수 있다.### 프레임 할당- Allocation of Frames
- 프레임 : 물리 메모리를 일정한 크기로 나눈 블록, 메모리 단편화 문제를 해결하기 위해 고안된 기법- CPU utilization vs Degree of multiprogramming
	- Degree of multiprogramming : 메인 메모리에 올라온 프로세스의 개수	- 프로세스 개수 증가 ☞ CPU 이용률 증가	- 일정 범위를 넘어서면 CPU 이용률 감소	- 이유: 너무 많은 프로세스로 서로 메모리가 부족 -> 빈번한 page in/out	- 쓰레싱 Thrashing: 디스크 i/o 시간 증가 때문- 쓰레싱 극복	- Global replacement 보다는 local replacement	- 프로세스당 충분한/적절한 수의 메모리(프레임) 할당
	- 적절한 수를 어떻게 알 수 있을까?
		- 정적 할당 
		- 동적 할당 - 정적 할당 (static allocation)
	- 프로세스에 맞게 할당	- 균등 할당 (Equal allocation)	- 비례 할당 (Proportional allocation) : 사이즈에 비례해 할당- 동적 할당 (dynamic allocation)	- Working set model	- Page fault frequency
	- etc- Working set model	- Locality(모여져 있음) vs working set(과거를 참고)	- Working set window	- Working set 크기 만큼의 프레임 할당- Page-Fault Frequency (PFF)	- Page fault 발생 비율의 상한/하한선	- 상한선 초과 프로세스에 더 많은 프레임 할당	- 하한선 이하 프로세스의 프레임은 회수### 페이지 크기- Page size	- 일반적 크기: 4KB ~ 4MB	- 점차 커지는 경향을 보임- 페이지 크기 영향	- 내부 단편화 : 작아야 좋음
		- 프로세스가 35 byte 1 페이지는 10 byte일 경우, 이 프로세스는 4개의 페이지가 필요. 마지막 5 byte를 버려야 함	- Page-in, page-out 시간 : 커야 좋음	- 페이지 테이블 크기 : 커야 좋음	- Memory resolution : 정밀도, 작아야 좋음(크면 필요없는 것도 가져올 것)	- Page fault 발생 확률 : 커야 좋음- 페이지 테이블	- 원래는 별도의 chip (TLB 캐시)	- 기술 발달에 따라 캐시 메모리는 on-chip 형태로	- TLB 역시 on-chip 내장
## Reference
- [양희재 교수님 운영체제 강의](http://kocw.net/home/search/kemView.do?kemId=978503)
- [introduction to Operating System](https://www.slideshare.net/LukaXavi/introduction-to-operating-system-10938506)




