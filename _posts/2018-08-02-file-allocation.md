---
layout: post
title:  "OS 파일 할당 이해하기"
subtitle:   "OS 파일 할당 이해하기"
categories: development
tags: os
comments: true
---

파일 할당에 대해 작성한 글입니다

---

## 파일 할당
- 파일 시스템 중 일부인 파일 할당에 대해 배웁니다- 컴퓨터 시스템 자원 관리	- CPU: 프로세스 관리 (CPU 스케쥴링, 프로세스 동기화)	- 주기억장치: 메인 메모리 관리 (페이징, 가상 메모리)	- 보조기억장치: 파일 시스템- 보조기억장치 (하드 디스크)	- 하드디스크: track (cylinder), sector	- Sector size = 512 bytes, cf. Block size
		- Sector를 모아둔 것이 Block	- 블록 단위의 읽기/쓰기 (block device)
		- <-> character device : 글자 단위	
	- 디스크 = pool of free blocks	- 각각의 파일에 대해 free block 을 어떻게 할당해줄까? ☞ 파일 할당- 파일 할당 (File Allocation)	- 연속 할당 (Contiguous Allocation)	- 연결 할당 (Linked Allocation)	- 색인 할당 (Indexed Allocation)### 연속 할당
- 리스트처럼 할당- Contiguous Allocation
	- 우리가 가장 쉽게 생각할 수 있는 할당 방법 	- 각 파일에 대해 디스크 상의 연속된 블록을 할당	- 장점: 디스크 헤더의 이동 최소화 = 빠른 i/o 성능	- 옛날 IBM VM/CMS 에서 사용	- 동영상, 음악, VOD 등에 적합	- 순서적으로 읽을 수도 있고 (sequential access 순차접근)	- 특정 부분을 바로 읽을 수도 있다 (direct access 직접접근)- 문제점	- 파일이 삭제되면 hole 생성	- 파일 생성/삭제 반복되면 곳곳에 흩어지는 holes	- 새로운 파일을 어느 hole 에 둘 것인가? ☞ 외부 단편화! (메모리에서 발생했던 문제)	- First-, Best-, Worst-fit- 단점: 외부 단편화로 인한 디스크 공간 낭비	- Compaction 할 수 있지만 시간 오래 걸린다 (초창기 MS-DOS)
	- 디스크의 1/3을 날림
- 또 다른 문제점	- 파일 생성 당시엔 이 파일의 크기를 알 수 없다 ☞ 파일을 어느 hole 에 넣어야 할까?	- 파일의 크기가 계속 증가할 수 있다 (log file) ☞ 기존의 hole 배치로는 불가!	- 어떻게 해결할 수 있을까?### 연결 할당
- 연결 리스트처럼 할당- Linked Allocation	- 파일 = linked list of data blocks	- 파일 디렉토리(directory)는 제일 처음 블록 가리킨다.	- 각 블록은 포인터 저장을 위한 4바이트 또는 이상 소모- 새로운 파일 만들기	- 비어있는 임의의 블록을 첫 블록으로	- 파일이 커지면 다른 블록을 할당 받고 연결	- 외부 단편화 없음!	- 외부 단편화는 없어 제일 중요한 디스크 낭비는 없음- 문제점	- 순서대로 읽기 = sequential access	- Direct access 불가	- 포인터 저장 위해 4바이트 이상 손실	- 낮은 신뢰성: 포인터 끊어지면 이하 접근 불가
		- 연속 할당은 포인터가 끊어져도 그 다음 것을 알 수 있음 	- 느린 속도: 헤더의 움직임
- 개선: FAT 파일 시스템	- File Allocation Table 파일 시스템	- MS-DOS, OS/2, Windows 등에서 사용	- 포인터들만 모은 테이블 (FAT) 을 별도 블록에 저장	- FAT 손실 시 복구 위해 이중 저장	- Direct access 도 가능!	- FAT는 일반적으로 메모리 캐싱
	- 몇 bit를 할당하면 좋을까?
		- 32비트 -> FAT32, 64비트 -> FAT62
 ### 색인 할당- Indexed Allocation	- 파일 당 (한 개의) 인덱스 블록 (데이터 블록 외에)	- 인덱스 블록은 포인터의 모음	- 디렉토리는 인덱스 블록을 가리킨다.
	- Unix/Linux 등에서 사용- 장점
	- Sequential accecss 가능 	- Direct access 가능	- 외부 단편화 없음- 문제점	- 인덱스 블록 할당에 따른 저장공간 손실	- 예: 1바이트 파일 위해 데이터 1블록 + 인덱스 1블록
	- 바이트가 작기 때문에 큰 파일을 만들 수 없음 => 여러 인덱스로 구성(Linked)- 파일의 최대 크기	- 예제: 1블록 = 512바이트 = 4바이트 × 128개 인덱스, 128 × 512바이트 = 64KB	- 예제: 1블록 = 1KB = 4바이트 × 256개 인덱스, 256 × 1KB = 256KB- 해결 방법: Linked, Multilevel index, Combined 등
	- Linked : 여러 인덱스로 계층적 구성
	- Multilevel : 여러 인덱스로 넓게 구성
	- Combined : Linked + Multilevel index


## Reference
- [양희재 교수님 운영체제 강의](http://kocw.net/home/search/kemView.do?kemId=978503)
- [introduction to Operating System](https://www.slideshare.net/LukaXavi/introduction-to-operating-system-10938506)




