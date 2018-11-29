---
layout: post
title:  "OS 디스크 스케쥴링 이해하기"
subtitle:   "OS 디스크 스케쥴링 이해하기"
categories: development
tags: os
comments: true
---

디스크 스케쥴링에 대해 작성한 글입니다

---

## 디스크 스케쥴링
- 대표적인 보조 기억장치 : 하드 디스크
- 실린더의 헤드를 움직여야 함- Disk Scheduling- 디스크 접근 시간	- Seek time + rotational delay + transfer time	- 탐색시간 (seek time) 이 가장 크다.- 다중 프로그래밍 환경	- 대부분의 프로그램은 디스크를 사용하기 때문에 디스크 큐(disk queue)에는 많은 요청(request)들이 쌓여있다	- 요청들을 어떻게 처리하면 탐색시간을 줄일 수 있을까?- 디스크 스케쥴링 알고리즘	- FCFS (First-Come First-Served)		- 음식점같은 방법
	- SSTF (Shortest-Seek-Time-First)
	- SCAN### FCFS Scheduling- First-Come First-Served	- Simple and fair- 예제	- 200 cylinder disk, 0 .. 199	- Disk queue: 98 183 37 122 14 124 65 67	- Head is currently at cylinder 53
		- 53 -> 98 -> 183 -> 37 ... 	- Total head movement = 640 cylinders	- Is FCFS efficient?
		- No..
		
### SSTF Scheduling
- Seek Time이 최소화되는 것부터 처리
	- Seek Time : 디스크 헤더를 움직이는 시간 - Shortest-Seek-Time-First	- 현재 헤드 위치에서 seek time이 가장 작은 요청을 선택- 예제	- 200 cylinder disk, 0 .. 199	- Disk queue: 98 183 37 122 14 124 65 67	- Head is currently at cylinder 53	- Total head movement = 236 cylinders
- 문제점	- Starvation
		- Seek time이 많이 떨어진 프로세스는 계속 기다림.. 그러면서 외부에서 새로운 놈이 들어옴(그러나 Seek Time이 짧음) 그러면 기존 프로세스는... 안녕... 	- Is SSTF optimal? No! (e.g., 53 → 37 → … = 208 cyl)### SCAN Scheduling- Scan disk
	- 헤드가 디스크를 계속해서 앞뒤로 스캔
	- 스캔하는 방향에 따라 결과가 달라짐- 예제	- 200 cylinder disk, 0 .. 199	- Disk queue: 98 183 37 122 14 124 65 67	- Head is currently at cylinder 53 (moving toward 0)	- Total head movement = 53+183 cylinders (less time) = 236- 토론
	- 프로세스가 많으면 실린더에 대한 요청은 골고루 있다고 가정
	- Circular SCAN is necessary!
		- 최고 안쪽은 최고 바깥이랑 연결된 C-SCAN - SCAN Variants: C-SCAN, LOOK, C-LOOK- C-SCAN	- Treats the cylinders as a cicular list that wraps around from the final cylinder to the first one- LOOK	- The head goes only as far as the final request in each direction	- Look for a request before continuing to move in a given direction- C-LOOK	- LOOK version of C-SCAN- Elevator Algorithm
	- 스캔 알고리즘을 엘레베이터라고 부름(기존 그래프를 90도 rotate하면 엘레베이터처럼 보임) 	- The head behaves just like an elevator in a building, first servicing all the requests going up, and then reversing to service requests the other way

## Reference
- [양희재 교수님 운영체제 강의](http://kocw.net/home/search/kemView.do?kemId=978503)
- [introduction to Operating System](https://www.slideshare.net/LukaXavi/introduction-to-operating-system-10938506)





