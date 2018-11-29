---
layout: post
title:  "Apache Kafka(아파치 카프카) Intro"
subtitle: "Apache Kafka(아파치 카프카) Intro"
categories: data
tags: engineering
comments: true
---

[카프카, 데이터 플랫폼의 최강자](http://www.yes24.com/24/goods/59789254?scode=032)를 읽고 Apache Kafka에 대해 정리한 글입니다!



## Kafka Intro
---

시대가 발전하며 점점 느슨한 결합(loosely coupled)로 이루어진 컴퓨팅 아키텍처를 사용하고 있습니다. 구체적인 예를 들면 시스템에서 사용하던 리소스가 사라질 수도 있고, Auto-Scale로 리소스가 몇십배 이상 확장될 수도 있습니다. 또한 요즘엔 서버와 클라이언트가 직접 통신하기보다 비동기 메세징 프레임워크를 기반으로 데이터를 주고받는 형태를 취하고 있습니다. 메세징 프레임워크 중 카프카에 대해 설명하겠습니다

카프카는 링크드인에서 처음 출발한 기술로, 링크드인에서 발생하는 이슈를 해결하기 위해 탄생했습니다. 카프카가 개발되기 전의 링크드인 아키텍쳐는 다음과 같습니다

### 기존 아키텍쳐
<img src="https://www.dropbox.com/s/svl8pah2sa80597/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-15%2017.23.26.png?raw=1">

- Monitoring : 앱/서비스에서 일어나는 미터링(사용량, 응답 시간, 에러 카운트)를 저장할 시계열 데이터 처리용 시스템
- Splunk : 앱/서비스에서 발생하는 로그를 저장하고 실시간 또는 배치로 분석할 수 있도록 저장하는 시스템
- Relational Database : 컨텐츠, 고객 정보 데이터를 저장하는 메인 데이터 시스템. OLTP 쿼리를 실행
- Key-value store : 추천이나 장바구니와 같이 트랜잭션 처리까진 필요없지만 실시간으로 처리해줘야 하는 내용들 저장
- Relational Data Warehouse : 데이터를 모아 일간/주간/월간/연간 데이터를 제공하는 데이터 마켓, 배치 분석을 하는 데이터 웨어하우스. 각종 데이터 시스템에서 이곳으로 데이터를 보냄
- Hadoop : 빅데이터를 저장/처리하기 위한 하둡. ETL 작업을 통해 데이터 웨어하우스로 보냄

### 문제점
- 실시간 트랜잭션(OLTP) 처리와 비동기 처리가 동시에 이루어지지만 통합된 전송 영역의 부재로 복잡도가 증가
- 파이프라인 관리가 어려움. 특정 부분을 수정해야할 때, 앞단부터 다 수정해야 할 수 있음

### 새로운 시스템의 목적
- 문제점을 해결하기 위해 새로운 시스템 구축!!!!
	- Producer와 Consumer의 분리
	- 메시지 시스템과 같이 영구 메세지 데이터를 여러 Consumer에게 허용
	- 높은 처리량을 위한 메세지 최적화
	- 데이터가 증가함에 따라 스케일아웃이 가능한 시스템

### 새로운 아키텍쳐
<img src="https://www.dropbox.com/s/frqw6rrbsi0u3ce/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-15%2017.32.21.png?raw=1">

- 기존엔 데이터 스토어 백엔드 관리와 백엔드에 따른 포맷, 별도의 앱 개발을 해야했는데 이젠 카프카에만 데이터를 전달하면 필요한 곳에서 각자 가져갈 수 있도록 변경되었습니다
- 카프카가 제공하는 표준 포맷으로 연결되어 데이터를 주고받는 데 부담이 없어졌습니다


### 카프카의 지향점
<img src="https://www.dropbox.com/s/4mbv8n6lvdm7cka/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-15%2018.24.04.png?raw=1" widht="500" height="400">

### 카프카의 용도
- 메세지 처리
- 사용자의 웹 사이트 활동 추적 파이프라인
- 애플리케이션의 통계 집계
- 시간순으로 발생하는 이벤트를 저장해 필요한 곳으로 보냄

### 카프카의 동작 방식과 원리
- 기본적으로 메시징 서버로 동작
- 메세징 시스템
	- Producer, publisher : 데이터 단위를 보내는 부분
	- Consumer, subscriber : 토픽이라는 메시지 저장소에 저장된 데이터를 가져가는 부분 
	- 중앙에 메세지 시스템 서버를 두고 메세지를 보내고(publish) 받는(subscribe) 형태의 통신을 펍/섭(Pub/Sub) 모델이라고 합니다
- 펍/섭(Pub/Sub)
	- 발신자의 메세지엔 수신자가 정해져있지 않은 상태로 발행(publish)
	- 구독(subscribe)을 신청한 수신자만 메세지를 받을 수 있음	
	- 일반적인 형태의 통신은 통신에 참여하는 개체끼리 모두 연결해야해서 확장성이 좋지 않습니다
	- 펍섭은 확장성 Good, 데이터 유실 확률이 적음
	- 그러나 메세징 시스템이 중간에 있어서 전달 속도가 빠르지 않음
	- 전화기의 교환대의 원리와 살짝 유사한 느낌
- Kafka
	- <img src="https://www.dropbox.com/s/zh6p3bc1zjg42m6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-15%2020.51.26.png?raw=1"> 	
	- 전달 속도가 느린 단점을 극복하기 위해 메세지 전달의 신뢰성 관리를 프로듀서와 컨슈머에게 넘기고, 교환기 기능을 컨슈머가 만들 수 있게 했습니다	
- 카프카 말고도 RabbitMQ 같은 메세징 프로그램도 있습니다

## 카프카의 특징
---

- Producer와 Consumer의 분리
- 멀티 Producer와 멀티 Consumer
- 디스크에 메세지 저장
	- 일반적인 메시징 시스템들은 Consumer가 메세지를 읽어가면 큐에서 바로 메세지를 삭제합니다 
	- 카프카는 보관 주기동안 디스크에 메세지를 저장
- 확장성
	- 3대의 브로커로 시작해 수십대의 브로커로 확장 가능
		- 브로커 : 카프카 애플리케이션이 설치되어 있는 서버 
	- 무중단 확장 가능
- 높은 성능
	- 내부적으로 분산 처리, 배치 처리 기법 사용   

## 파이프라인 사례
---

### Netflix
<img src="https://www.dropbox.com/s/egk36r4ry02hzfj/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-15%2021.03.55.png?raw=1">

### Uber
<img src="https://www.dropbox.com/s/jfb8zqpqd4ft8r5/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-15%2021.07.21.png?raw=1">



## Reference
- [카프카, 데이터 플랫폼의 최강자](http://www.yes24.com/24/goods/59789254?scode=032)
- [Putting Apache Kafka To Use: A Practical Guide to Building a Streaming Platform (Part 1)](https://www.confluent.io/blog/stream-data-platform-1/)
- [Apache Kafka - Cluster Architecture](https://www.tutorialspoint.com/apache_kafka/apache_kafka_cluster_architecture.htm)
- [Evolution of the Netflix Data Pipeline](https://medium.com/netflix-techblog/evolution-of-the-netflix-data-pipeline-da246ca369050)
- [uReplicator: Uber Engineering’s Robust Kafka Replicator](https://eng.uber.com/ureplicator/)
