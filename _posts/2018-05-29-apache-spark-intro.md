---
layout: post
title:  "Apache Spark(아파치 스파크) Intro"
subtitle:   "Apache Spark(아파치 스파크) Introo"
categories: data
tags: engineering
comments: true
---

아파치 스파크에 대한 입문 내용입니다 (주로 RDD)

## Apache Spark
- RDD, Dataframe 2개의 개념을 알아야 함
- RDD(Resilient Distributed Dataset)
	- 탄력적이며 분산된 데이터셋
	- 오류 자동복구 기능이 포함된 가상의 리스트
	- 클러스터에서 데이터를 처리
	- 다양한 계산(map, reduce, count, filter, join )을 수행할 수 있으며, 메모리에 저장
	- 작업을 병렬적으로 처리
	- 여러 작업을 설정한 후, 결과를 얻을 때 lazy하게 계산
	- Lineage : 클러스터 중 일부 고장으로 작업이 실패해도 리니지를 통해 데이터를 복구
- 하둡 맵리듀스는 각종의 task가 있고, 실패하면 개별 task를 다시 실행! 스파크는 계산하는 과정에서 뻑나면 처음부터 다시 실행
	- 데이터 IO는 비싸고 Computation은 싸기 때문에 스파크가 유리
- 리스트와 차이점 : 리스트는 1부터 100억을 저장하려고 하면 Memory Error가 발생. 컴퓨터 한대에서 처리할 수 있는만큼만 처리 가능. 반면 RDD는 만들어도 데이터를 실제로 메모리에 올리진 않고, 정보만 가지고 있음. 실제로 count, max, min 같은 operator가 실행될 때 진행


### RDD Operation
- 1) Transformations : RDD의 데이터를 다른 형태로 변환
	- 실제로 데이터가 변환되는 것이 아닌, 어떻게 바꾸는지에 대한 정보를 기록
	- 실제 변환은 Action이 수행되는 시점에서 진행 
	- map, filter, flatMap, mapPartitions, sample, union, intersection, distinct, groupByKey, reduceByKey, join, repartition 
- 2) Actions : Transformations이 담긴 RDD의 정보를 계산
	- reduce, collect, count, first, take, saveAsTextFile, countByKey, foreach	등
	- [Spark Programming Guide](https://spark.apache.org/docs/latest/rdd-programming-guide.html) 참고

```
// word count
val file = spark.textFile("hdfs://...")val counts = file.flatMap(line => line.split(" ")).map(word => (word, 1)).reduceByKey(_ + _)counts.saveAsTextFile("hdfs://...")
``` 


### Apache Spark 확장 프로그램
<img src="https://spark.apache.org/images/spark-stack.png">

- GraphX를 제외하고 많이 쓰임
- Spark SQL : SQL로 데이터 분석
- Spark Streaming : 실시간 분석
- MLlib : 머신러닝 라이브러리
- GraphX : 그래프 분석

### Apache Spark Install
- [홈페이지](https://spark.apache.org/downloads.html) 접속
- Download Spark: spark-2.3.0-bin-hadoop2.7.tgz 클릭한 후, http://mirror.apache-kr.org/spark/spark-2.3.0/spark-2.3.0-bin-hadoop2.7.tgz 클릭
	- version명은 다를 수 있음 
- 압축 풀기 : ```tar -zxvf spark-2.3.0-bin-hadoop2.7.tgz```
- 폴더 구조
	- bin : spark-shell, spark-submit 등 spark 를 실행해 볼 수 있는 실행 파일을 포함
	- sbin : spark process를 구동(start-all.sh)하는 파일 포함
	- conf : spark 설정 파일 포함
		- spark-env.sh
		- spark-default.properties
		- log4j.propreties
	- example : spark 예제
- 실행
	- ```./bin/spark-shell```   
- 로그가 너무 많다면 log4j.properties.template 파일을 복사해서 설정하면 됨
	- ```log4j.rootCategory=WARN, console``` 
- ```sc.version``` 입력하고 버전이 출력되면 성공!
- Python용 **PySpark**는 ```pip3 install pyspark```로 설치


### RDD Caching
- 반복 계산의 성능 향상을 위해 RDD의 내용을 캐시 가능
- Caching 했는데 왜 더 오래걸리지? 이런 경우가 있는데 이건 Serialize 관련 문제일 수도 있음
- API 옵션
	- ```rdd.persist()``` or ```rdd.cache()```
	- ```rdd.unpersist()```
	- ```rdd.persist(MEMORY_ONLY)``` 
- Persistence Level
	- <img src="https://www.dropbox.com/s/v7wlsy5qaqzhdki/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-29%2021.58.27.png?raw=1">
	- MEMORY\_ONLY\_SER 옵션을 반드시 Check
	- 전송/저장할 때는 object 그대로 저장하면 바이트 상태로 저장되기 때문에 사람이 알아볼 수 있는 형태로 포맷을 저장해서 전송할 필요가 있습니다. 이런 작업을 Serialized한다고 표현
	- object를 serialize할 경우 json, binary 등으로 가능! serialize/deserialize 작업은 꽤 비싼 작업이기 때문에 옵션이 세세하게 있습니다
- [자바 직렬화, 그것이 알고싶다. 훑어보기편](http://woowabros.github.io/experience/2017/10/17/java-serialize.html) 참고
	
### RDD 내부
- 4가지 파트
	- 1) Partition : 데이터를 나누는 단위
	- 2) Dependency : RDD의 파티션이 어디에서 파생되었는지를 기술하는 모델
	- 3) Function : 부모 RDD에서 어떻게 파생되었는지를 계산하는 함수
	- 4) Metadata : 데이터 위치, 파티션 정보 보유 

### Narrow & Wide Dependency
- map, filter 등을 할 때 RDD의 종속 관계(화살표 관계)를 Dependency라고 함
- <img src="https://www.dropbox.com/s/ttb54bm5glqnqnz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-05-29%2022.10.37.png?raw=1">
- Narrow Dependency
	- 효율적
	- 하나의 파티션이 하나의 파티션에서만 사용
	- map같은 연산은 데이터를 교환할 필요가 없음. 그냥 슝슝
	- co-partition이 되어있는 join은 빠름(파티션을 나눔)
- Wide Dependency
	- 비효율적  
	- 하나의 파티션이 여러 파티션에서 쓰임
	- groupByKey나 join하면 서로를 참고해야 함. 따라서 1의 데이터가 2로 전송되어야 하고, 2의 데이터가 1로 되어야 함
	- 네트워크 속도 및 메모리 문제가 생길 수 있음
- 디버깅 및 튜닝
	 - rdd.dependencies(), rdd.toDebugString() 등을 활용	- Narrow dependency		- OneToOneDependency		- PruneDependency		- RangeDependency	- Wide dependency		- ShuffleDependency 

	
### Apache Spark 실습
- ```sc.```을 한 후, tab을 누르면 명령어들이 나옴

- sc.makeRDD

	```
	val a = sc.makeRDD(List(1,2,3,4,5))
	>>> org.apache.spark.rdd.RDD[Int] = ParallelCollectionRDD[1] at makeRDD at <console>:2
	a.count
	>>> LONG = 5
	a.max
	>>> Int = 5
	a.min
	>>> Int = 1
	```

- list와의 차이, lazy

	```
	val b = List(1, 2,3, 4, 5)
	b
	>>> List[Int] = List(1, 2, 3, 4, 5)
	// b는 list라 값이 바로 나옴
	a.collect
	>>> Array[Int] = Array(1, 2, 3, 4, 5)
	a.filter(_ < 3)
	>>> org.apache.spark.rdd.RDD[Int] = MapPartitionsRDD[3] at filter at <console>:26
	// 다른 RDD가 나온 것! 결과를 실제로 보고 싶다면 collect 같은 action을 취해야 함
	// filter는 transformation
	a.filter(_ < 3).collect
	>>> Array[Int] = Array(1, 2)
	
	val c = sc.makeRDD(0 to 1000000000)
	// c를 생성할 때는 거의 시간이 걸리지 않음. 메타 정보만 가지고 있음
	c.count
	>>> Long = 1000000001
	// 시간이 오래 걸림. 실제 연산
	```

- Narrow & Wide Dependency

	```
	// Narrow Dependency
	val a = sc.makeRDD(1 to 1000000).map(x => (x, x))
	a.filter(_._2 < 100).count
	
	// Wide Dependency
	val a = sc.makeRDD(1 to 1000000).map(x => (x, x))
	val b = sc.makeRDD(1 to 10000).map(x => (x, x))
	a.join(b).count
	
	// Join with partition (Narrow Dependency)
	val p = new org.apache.spark.Partitioner() {
		def getPartition(key: Any) = key.asInstanceOf[Int] % 10
		def numPartitions = 10
	}
	
	val a = sc.makeRDD(1 to 1000000).map(x => (x, x)).partitionBy(p)	
	val b = sc.makeRDD(1 to 10000).map(x => (x, x)).partitionBy(p)
	
	a.join(b).count
	
	```
	
- Caching

	```
	val a = sc.makdRDD(1 to 20000000)
	a.count
	// 꽤나 시간이 걸림
	
	val b = a.filter(_ < 100000)
	b.count
	// 하나의 연산을 더 하기 때문에 더 오래걸림
	
	b.count
	// 같은 연산을 또 하는거라 위에서 걸린 시간과 동일하게 걸림
	
	// 반복 작업을 캐싱하면 사용 시간을 극적으로 줄일 수 있음
	
	b.persist
	// b.cache도 동일한 명령어
	// persist도 lazy하게 진행
	
	b.count
	// 이번엔 메모리에 계산 결과를 올려둠. 처음보다 살짝 더 걸릴 수 있음(메모리에 올리는 시간)
	
	b.count
	// 캐시되어 있기에 바로 나옴
	
	b.unpersist()
	// b는 메모리에서 내려감
	// 계산을 한번만 하는거면 사실 캐시를 사용할 필요는 없음
	```	
	
### Spark shell
- 우리가 사용하는 쉘은 Master-Slave가 단일로 되어있는 상태
- 클러스터를 제대로 구성하려면 할 것들이 더 많음
	
### Spark Cluster
- 하둡에서 사용하는 Master-Slave 구조	
- Master 서버
	- Driver program
- Slave (Worker)
	- Executor(들)
	- Task 수행
	- 데이터들을 캐싱   

### Lineage & Fault Tolerance
- Lineage
	- 데이터가 어디에서 왔는지에 대한 족보
	- 문제가 생긴 데이터를 처음부터 다시 재구성해서 장애 복구
- join 다음에 망가지면 계산을 다시해야 함. 그 이전 연산이 비싸다면 checkpoint나 파일로 저장해둘 수 있음