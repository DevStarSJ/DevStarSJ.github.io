---
layout: post
title:  "대용량 데이터 처리 기술(GFS, HDFS, MapReduce, Spark)"
subtitle:   "대용량 데이터 처리 기술(GFS, HDFS, MapReduce, Spark)"
categories: data
tags: engineering
comments: true
---

- 대용량 데이터 처리 기술에 대해 작성한 글입니다
- 실제 대용량 데이터 처리하는 방법이 궁금하신 분은 [BigQuery와 Datalab을 사용해 데이터 분석하기](https://zzsza.github.io/gcp/2018/08/02/bigquery-and-datalab/)를 참고하시면 좋을 것 같습니다

---

- 빅데이터 : **기존 데이터베이스 관리도구**의 능력을 넘어서는 **대량** 의 **정형** 또는 심지어 데이터베이스 형태가 아닌 **비정형**의 데이터 집합조차 포함한 데이터로부터 **가치를 추출하고 결과를 분석**하는 기술(by 위키피디아)
- 기존에 데이터가 커졌을 때 사용하던 방식
	- 큐잉
	- 샤딩 : 데이터의 키를 Hash해서 여러 DB로 분산
	- but 시스템의 복잡도가 증가되며 유지보수 힘듬
	- 이를 극복하기 위해 스스로 데이터를 분산시키고 오류가 발생하면 데이터를 복구하는 기능을 가진 시스템이 생김 	

## GFS (Google File System)
- [Google File System Paper](https://static.googleusercontent.com/media/research.google.com/ko//archive/gfs-sosp2003.pdf)
- <img src="https://www.dropbox.com/s/veqxbvuk2oefm96/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-26%2013.53.43.png?raw=1">
- 하둡의 원조
- Failuer Tolerance, 물리적으로 서버 중 하나가 고장나도 정지하지 않고 잘 돌아가는 시스템
- [박준영님 블로그](https://swalloow.github.io/map-reduce)
- [위키피디아](https://ko.wikipedia.org/wiki/%EA%B5%AC%EA%B8%80_%ED%8C%8C%EC%9D%BC_%EC%8B%9C%EC%8A%A4%ED%85%9C)

## MapReduce
- [Google MapReduce Paper](https://research.google.com/archive/mapreduce-osdi04.pdf)
- Map과 Reduce 함수를 조합해 분산 환경에서 다양한 계산
- Shuffle (SQL의 GroupBy와 유사한 연산)
- Worker에서 Map 작업 수행한 후, Reduce를 수행한 워커가 결과물을 저장

## Hadoop
- GFS와 MapReduce 논문을 보고 구현해서 오픈소스로 공개(2006년)
- name node가 데이터의 위치를 알려주고(Master 역할), data note가 실제 데이터를 조회(Slave)

## Hadoop HDFS
- [HDFS paper](http://storageconference.us/2010/Papers/MSST/Shvachko.pdf)
- GFS 논문의 오픈소스화
- Block 단위로(64MB) 여러 노드에(3 Replica) 파일 보관
	- 늘릴수록 디스크 용량을 많이 차지하고, 안정성을 가질 수 있음
	- 여러 옵션 보유
- 중복 저장과 장애복구 기능을 가지고 있음
	- 그러나 현실에선 많은 장애..

## Hadoop Hive
- SQL로 분석 쿼리를 실행하면 MapReduce 코드로 자동으로 변환	
- SQL이 불가능한 Task 존재

## 분산 데이터베이스 (NoSQL)
- Not Only SQL
- 스케일 가능한 고성능 데이터베이스
- HBase, Cassandra, MongoDB, Couchbase, Redis
- Apache HBase
	- 구글의 BigTable 구현
	- 빠른 속도 / 편리한 사용성 / 높은 내구성
	- 컬럼 기반 데이터베이스 (Column Oriented)
	- SQL은 Row 기반! 컬럼을 정해두고 Row를 추가하는 방식(=자유롭지 않음)인 반면 컬럼 기반은 스키마가 자유롭고 Sparse한 거대한 테이블에 적합
	- Master와 Slave가 존재
	- <img src="https://www.dropbox.com/s/pvu5isxpl0mmpoh/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-10-22%20%EC%98%A4%EC%A0%84%209.36.37.png?raw=1">


## Apache Spark
- 메모리에서 처리해서 효율이 좋음
- 반복 계산이 많은 경우 특히 성능이 좋음


## 스트리밍 기술들
- Apache Storm
- Spark Streaming
	- 작은 Time window로 배치 프로세스를 계속 실행해 실시간처럼 보임

## 리소스 관리 플랫폼
- 이미 존재하는 컴퓨팅 자원을 share해서 필요에 맞게 리소스를 관리해주는 플랫폼
- Yarn(자주 쓰임), Mesos 

## 데이터 수집기
- 여러 로그를 취합해서 로그를 남김
- 크롤링할 경우, 소셜 데이터를 모을 경우에도 유사한 구조
- Flume, Kafka, Logstash, 아마존 Kinesis 등
- Flume
	- 단순한 구조, 몇가지 설정만으로 구동 가능 
	- push 방식
	- collector를 제공
- Kafka
	- 고성능 메세징 큐 
	- 다양한 입력과 출력을 복잡하게 라우팅
	- pub/sub 방식
	- 메세지를 디스크에 저장해 유실없이 처리 가능
	- Flume으로 collect하고 Kafka에서 불러오는 구조도 있음

## 기타
- Presto(추후 Check)
	- Facebook이 리드
	- HIVE와 유사하지만 압도적 성능
	- 다른 DB의 데이터를 가지고와서 Join해서 사용 가능 
- Elastic Search
	- 스케일 가능한 검색, 인덱스 엔진
	- ELK Stack으로 유명 	

## Architecture
```
데이터 수집 - 데이터 저장 - 데이터 가공 - 시각화 - 머신러닝
Kafka - HDFS - Spark/Spark SQL - Zeppelin - Spark MLLib
```

## Reference
- [빅데이터를 위한 플랫폼들](https://d2.naver.com/helloworld/29533)
