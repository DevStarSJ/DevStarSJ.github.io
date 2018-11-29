---
layout: post
title:  "Apache Spark(아파치 스파크) RDD API"
subtitle: "Apache Spark(아파치 스파크) RDD API"
categories: data
tags: engineering
comments: true
---

Apache Spark RDD API(Scala)에 대한 설명 및 예제 코드입니다. [원본 글](http://homepage.cs.latrobe.edu.au/zhe/ZhenHeSparkRDDAPIExamples.html)  
이 글은 완성되지 않았습니다! 계속 업데이트할 예정입니다  
참고 자료 : [RDD Programming guide](https://spark.apache.org/docs/latest/rdd-programming-guide.html)

## RDD
- Resilient Distributed Dataset의 약자
- 클러스터에서 구동시 여러 데이터 파티션은 여러 노드에 위치할 수 있습니다. RDD를 사용하면 모든 파티션의 데이터에 접근해 Computation 및 transformation을 수행할 수 있습니다
- RDD의 일부가 손실되면 lineage information을 사용해 손실된 파티션의 데이터를 재구성할 수 있습니다
- Dataframe에 더 관심이 증가하고 있는 중!

### 4개의 Extensions
- DoubleRDDFunctions
	- 숫자값 aggregation의 다양한 방법 포함
	- Data가 implicitly double 타입으로 변환가능할 때 사용합니다 
- PairRDDFunctions
	- Tuple 구조가 있을 때 사용합니다 
- OrderedRDDFunctions
	- Tuple 구조이며 Key가 implicitly 정렬 가능할 경우 사용합니다
- SequenceFiledRDDFunctions
	- 하둡의 Sequence 파일을 만들 수 있는 방법 포함
	- PairRDDFunctions처럼 Tuple 구조 필요
	- Tuple을 쓰기 가능한 유형으로 변환할 수 있도록 추가 요구사항 존재

### Working with Key-Value Pairs
- [공식 문서](https://spark.apache.org/docs/latest/rdd-programming-guide.html#working-with-key-value-pairs)
- [PairRDDFunction](https://spark.apache.org/docs/latest/api/scala/index.html#org.apache.spark.rdd.PairRDDFunctions)에서 Source로 가면 만들 때 (self: RDD[(K, V)])로 되어있음!! 제네릭 타입
- Transformations
	- mapPartitions : 엔지니어링시 필요할 수도..!
	- distinct : unique한 set
	- repartition 
		- MySQL에 넣을 때 파티션이 너무 작게 나뉘어져 있어서 적당한 사이즈로 올려야겠다고 생각할 때 사용! 
		- RDD 파티션이 1000개라면 파일이 1000개로 생성됨. 이럴 경우에도 리파티션으로 10개로 줄임
		- but 비싼 연산
- Actions
	- reduce 
		- reduceByKey는 Transformation! 
	- collect : to array, 작을 때만 사용!
	- count
	- take(n)
	- takeOrdered
	- saveAsTextFile
		- SequenceFile, ObjectFile은 사실 몰라도.. 될 듯
	- countByKey
	- foreach : RDD에서 foreach(println) 하면 워커 로그에 남음! 
 
### WordCount 예제
```
// RDD 복습 : wordCount
// 제플린 실행 후,
sc.textFile("../README.md").take(10)
// take(10) : 10줄

val text = sc.textFile("../README.md")
text.take(10).foreach(println)

// WordCount
val split = text.map(s => s.split(" "))
split.take(10).foreach(println)
// 이상하게 java.lang.String 이렇게 나옴

val split = text.map(s => s.split(" ").mkString("//"))
// mkString을 활용해 잘 나오는지 봅시다
split.take(10).foreach(println)
>>> #//Apache//Zeppelin ... 처럼 나옴


// flat하게 하려고 flatMap사용
val split = text.flatMap(s => s.split(" "))
split.take(10).foreach(println)

// 이제 같은 단어끼리 묶어서 Count하면 됨
// RDD가 groupby할 수 있도록 Tuple로 만듬
split.map(w => (w, 1)).take(10).foreach(println)

// reduceByKey로 슝!
// reduce는 키 기반으로 합침
split.map(w => (w, 1)).reduceByKey(_+_).take(10).foreach(println)

// 이해 안될까봐 위 코드를 풀어보면
split.map(w => (w, 1)).reduceByKey((a,b) => a+b).take(10).foreach(println)

// 갯수가 많이 나오는 것으로 내림차순을 하고싶다면
val wordCount = split.map(w => (w, 1)).reduceByKey(_+_)

wordCount.sortBy(_._2, false).take(10).foreach(println)
// false : 역순정렬
``` 

## API 소개
### aggregate
- 2개의 다른 reduce 함수를 aggregate
- RDD 데이터 타입과 action 결과 타입이 다를 경우 사용
- 파티션 단위의 연산과 각 연산의 결과를 합침

```
def aggregate[U: ClassTag](zeroValue: U)(seqOp: (U, T) => U, combOp: (U, U) => U): U
// seqOp: (U, T) => U : RDD 데이터 타입 T를 연산 결과 데이터 타입 U로 변경 및 연산을 수행
// 노드 로컬 파티션에서 수행
// zeroValue : 파티션에서 누적해야 될 값의 시작값
// comOp(U, U) => U : 각 파티션에서 seqOp의 작업이 끝났을 때 합치는 함수

```



```
val z = sc.parallelize(List(1,2,3,4,5,6), 2)
// List를 2개로 패래럴라이즈
val z1 = sc.parallelize(List(1,2,3,4,5,6), 3)
// List를 3개로 패래럴라이즈

// 함수 정의
def myfunc(index: Int, iter: Iterator[(Int)]) : Iterator[String] = {
  iter.map(x => "[partID:" +  index + ", val: " + x + "]")
}


z.mapPartitionsWithIndex(myfunc).collect
>>> Array[String] = Array([partID:0, val:  1], [partID:0, val:  2], [partID:0, val:  3], [partID:1, val:  4], [partID:1, val:  5], [partID:1, val:  6])

z1.mapPartitionsWithIndex(myfunc).collect
>>> Array[String] = Array([partID:0, val:  1], [partID:0, val:  2], [partID:1, val:  3], [partID:1, val:  4], [partID:2, val:  5], [partID:2, val:  6])


z.aggregate(0)(math.max(_, _), _ + _)
// partition0은 1,2,3이 있음. max(0,1,2,3) => 3
// partition1은 4,5,6이 있음. max(0,4,5,6) => 6
// 0 + 3 + 6 = 9

z1.aggregate(0)(math.max(_, _), _ + _)
// partition0은 max(0,1,2) => 2
// partition1은 max(0,3,4) => 4
// partition2은 max(0,5,6) => 6
// 0 + 2 + 4 + 6 = 12

z.aggregate(5)(math.max(_, _), _ + _)
>>> Int = 16

val z2 = sc.parallelize(List("a","b","c","d","e","f"),2)

def myfunc(index: Int, iter: Iterator[(String)]) : Iterator[String] = {
  iter.map(x => "[partID:" +  index + ", val: " + x + "]")
}

z2.mapPartitionsWithIndex(myfunc).collect
>>> Array[String] = Array([partID:0, val: a], [partID:0, val: b], [partID:0, val: c], [partID:1, val: d], [partID:1, val: e], [partID:1, val: f])

z2.aggregate("")(_ + _, _+_)
>>> String = abcdef

z2.aggregate("X")(_ + _, _+_)
>>> String = XXabcXdef

val z3 = sc.parallelize(List("12","23","345","4567"),2)
z3.aggregate("")((x,y) => math.max(x.length, y.length).toString, (x,y) => x + y)
>>> String = 42

z3.aggregate("")((x,y) => math.min(x.length, y.length).toString, (x,y) => x + y)
>>> String = 11

val z4 = sc.parallelize(List("12","23","345",""),2)
z4.aggregate("")((x,y) => math.min(x.length, y.length).toString, (x,y) => x + y)
>>> String = 10


val z5 = sc.parallelize(List("12","23","","345"),2)
z5.aggregate("")((x,y) => math.min(x.length, y.length).toString, (x,y) => x + y)
>>> String = 11
``` 


### aggregateByKey
- 같은 key가 있는 값에 적용
- 초기 값은 두번째 reduce에 적용되지 않음

```
def aggregateByKey[U](zeroValue: U)(seqOp: (U, V) ⇒ U, combOp: (U, U) ⇒ U)(implicit arg0: ClassTag[U]): RDD[(K, U)]
def aggregateByKey[U](zeroValue: U, numPartitions: Int)(seqOp: (U, V) ⇒ U, combOp: (U, U) ⇒ U)(implicit arg0: ClassTag[U]): RDD[(K, U)]
def aggregateByKey[U](zeroValue: U, partitioner: Partitioner)(seqOp: (U, V) ⇒ U, combOp: (U, U) ⇒ U)(implicit arg0: ClassTag[U]): RDD[(K, U)]
```


```
val pairRDD = sc.parallelize(List(("cat", 2), ("cat", 5), ("mouse", 4), ("cat", 12), ("dog", 12), ("mouse", 2)), 2)

pairRDD.collect
>>> Array[(String, Int)] = Array((cat,2), (cat,5), (mouse,4), (cat,12), (dog,12), (mouse,2))


def myfunc(index: Int, iter: Iterator[(String, Int)]) : Iterator[String] = {
  iter.map(x => "[partID:" +  index + ", val: " + x + "]")
}

pairRDD.mapPartitionsWithIndex(myfunc).collect
>>> Array[String] = Array([partID:0, val: (cat,2)], [partID:0, val: (cat,5)], [partID:0, val: (mouse,4)], [partID:1, val: (cat,12)], [partID:1, val: (dog,12)], [partID:1, val: (mouse,2)])


pairRDD.aggregateByKey(0)(math.max(_, _), _ + _).collect
>>>  Array[(String, Int)] = Array((dog,12), (cat,17), (mouse,6))

// partition0는 max(cat : 0, 2, 5), max(mouse : 0, 4) 
// partition1는 max(cat : 0, 12), max(dog : 0, 12), max(mouse : 0, 2)
// cat : 5, mouse : 4
// cat : 12, dog : 12, mouse : 2
// 합침! dog : 12, cat : 17, mouse : 6


pairRDD.aggregateByKey(100)(math.max(_, _), _ + _).collect
>>> Array[(String, Int)] = Array((dog,100), (cat,200), (mouse,200))
```

### cartesian
- 2개의 RDD에서 cartesian product
- 새로운 RDD 생성
- 메모리 때문에 문제가 생길 수 있으므로 사용할 때 주의하기

```
def cartesian[U: ClassTag](other: RDD[U]): RDD[(T, U)]
```

```
val x = sc.parallelize(List(1,2,3,4,5))
val y = sc.parallelize(List(6,7,8,9,10))
x.cartesian(y).collect
>>> Array[(Int, Int)] = Array((1,6), (1,7), (1,8), (1,9), (1,10), (2,6), (2,7), (2,8), (2,9), (2,10), (3,6), (3,7), (3,8), (3,9), (3,10), (4,6), (5,6), (4,7), (5,7), (4,8), (5,8), (4,9), (4,10), (5,9), (5,10))
```


### checkpoint
- RDD가 계산될 때 체크포인트를 생성합니다. checkpoint 폴더 안에 binary file로 저장되며 Spark Context를 사용해 지정할 수 있습니다
- "my_directory_name"이 모든 slave에 존재해야 합니다. 대안으로 HDFS 디렉토리 URL을 사용할 수 있습니다

```
def checkpoint()
```

```
sc.setCheckpointDir("my_directory_name")
val a = sc.parallelize(1 to 4)
a.checkpoint
a.count
```

### coalesce, repartition
- 관련 데이터를 주어진 수의 파티션으로 통합합니다. repartition(numPartitions)은  coalesce(numPartitions, shuffle=true)의 약어입니다

```
def coalesce ( numPartitions : Int , shuffle : Boolean = false ): RDD [T]
def repartition ( numPartitions : Int ): RDD [T]
```

```
val y = sc.parallelize(1 to 10, 10)
val z = y.coalesce(2, false)

y.partitions.length
>>> 10

z.partitions.length
>>> Int = 2
```

### cogroup [Pair], groupWith [Pair]
- 최대 3개의 key-value RDD를 그룹화할 수 있는 함수

```
def cogroup[W](other: RDD[(K, W)]): RDD[(K, (Iterable[V], Iterable[W]))]
def cogroup[W](other: RDD[(K, W)], numPartitions: Int): RDD[(K, (Iterable[V], Iterable[W]))]
def cogroup[W](other: RDD[(K, W)], partitioner: Partitioner): RDD[(K, (Iterable[V], Iterable[W]))]
def cogroup[W1, W2](other1: RDD[(K, W1)], other2: RDD[(K, W2)]): RDD[(K, (Iterable[V], Iterable[W1], Iterable[W2]))]
def cogroup[W1, W2](other1: RDD[(K, W1)], other2: RDD[(K, W2)], numPartitions: Int): RDD[(K, (Iterable[V], Iterable[W1], Iterable[W2]))]
def cogroup[W1, W2](other1: RDD[(K, W1)], other2: RDD[(K, W2)], partitioner: Partitioner): RDD[(K, (Iterable[V], Iterable[W1], Iterable[W2]))]
def groupWith[W](other: RDD[(K, W)]): RDD[(K, (Iterable[V], Iterable[W]))]
def groupWith[W1, W2](other1: RDD[(K, W1)], other2: RDD[(K, W2)]): RDD[(K, (Iterable[V], IterableW1], Iterable[W2]))]
```

```
val a = sc.parallelize(List(1, 2, 1, 3), 1)
val b = a.map((_, "b"))
val c = a.map((_, "c"))

b.collect
>>> Array[(Int, String)] = Array((1,b), (2,b), (1,b), (3,b))

b.cogroup(c).collect
>>> Array[(Int, (Iterable[String], Iterable[String]))] = Array((1,(CompactBuffer(b, b),CompactBuffer(c, c))), (3,(CompactBuffer(b),CompactBuffer(c))), (2,(CompactBuffer(b),CompactBuffer(c))))

// 문서엔 ArrayBuffer인데 CompactBuffer 차이는?
// 연산이 이해가 안되는 상황


val d = a.map((_, "d"))
b.cogroup(c, d).collect
>>> Array[(Int, (Iterable[String], Iterable[String], Iterable[String]))] = Array((1,(CompactBuffer(b, b),CompactBuffer(c, c),CompactBuffer(d, d))), (3,(CompactBuffer(b),CompactBuffer(c),CompactBuffer(d))), (2,(CompactBuffer(b),CompactBuffer(c),CompactBuffer(d))))


val x = sc.parallelize(List((1, "apple"), (2, "banana"), (3, "orange"), (4, "kiwi")), 2)

val y = sc.parallelize(List((5, "computer"), (1, "laptop"), (1, "desktop"), (4, "iPad")), 2)

x.cogroup(y).collect
>>> Array[(Int, (Iterable[String], Iterable[String]))] = Array((4,(CompactBuffer(kiwi),CompactBuffer(iPad))), (2,(CompactBuffer(banana),CompactBuffer())), (1,(CompactBuffer(apple),CompactBuffer(laptop, desktop))), (3,(CompactBu

// 유저별 이벤트 count할 때 사용할 수 있을듯?
```

### collect, toArray
- RDD를 Scala array로 변환
- RDD의 값을 보고싶을 경우 사용

```
def collect(): Array[T]
def collect[U: ClassTag](f: PartialFunction[T, U]): RDD[U]
def toArray(): Array[T]
```

```
val c = sc.parallelize(List("Gnu", "Cat", "Rat", "Dog", "Gnu", "Rat"), 2)
c.collect
>>> Array[String] = Array(Gnu, Cat, Rat, Dog, Gnu, Rat)
```

### collectAsMap[Pair]
- collect와 유사하나 key-value RDD를 생성하고 이를 Scala Map으로 변환

```
def collectAsMap(): Map[K, V]
```

```
val a = sc.parallelize(List(1, 2, 1, 3), 1)
val b = a.zip(a)
b.collectAsMap
>>> scala.collection.Map[Int,Int] = Map(2 -> 2, 1 -> 1, 3 -> 3)
```

### combineByKey[Pair]
- Tuple로 구성된 RDD의 값을 결합하는 함수

```
def combineByKey[C](createCombiner: V => C, mergeValue: (C, V) => C, mergeCombiners: (C, C) => C): RDD[(K, C)]
def combineByKey[C](createCombiner: V => C, mergeValue: (C, V) => C, mergeCombiners: (C, C) => C, numPartitions: Int): RDD[(K, C)]
def combineByKey[C](createCombiner: V => C, mergeValue: (C, V) => C, mergeCombiners: (C, C) => C, partitioner: Partitioner, mapSideCombine: Boolean = true, serializerClass: String = null): RDD[(K, C)]
```

```
val a = sc.parallelize(List("dog","cat","gnu","salmon","rabbit","turkey","wolf","bear","bee"), 3)
val b = sc.parallelize(List(1,1,2,2,2,1,2,2,2), 3)
val c = b.zip(a)

c.collect
>>> Array[(Int, String)] = Array((1,dog), (1,cat), (2,gnu), (2,salmon), (2,rabbit), (1,turkey), (2,wolf), (2,bear), (2,bee))

val d = c.combineByKey(List(_), (x:List[String], y:String) => y :: x, (x:List[String], y:List[String]) => x ::: y)

d.collect
>>> Array[(Int, List[String])] = Array((1,List(cat, dog, turkey)), (2,List(gnu, rabbit, salmon, bee, bear, wolf)))
```

### compute
- RDD 연산을 실행
- 사용자가 직접 실행해서는 안됨

```
def compute(split: Partition, context: TaskContext): Iterator[T]
```

### context, sparkContext
- RDD를 생성하기 위해 사용된 SparkContext를 리턴
- SparkContext
	- Spark를 동작시키는 모체
	- Spark의 실행 환경을 handling
	- SC간에 RDD는 공유되지 않음 

```
def compute(split: Partition, context: TaskContext): Iterator[T]
```

```
val c = sc.parallelize(List("Gnu", "Cat", "Rat", "Dog"), 2)
c.context
>>> org.apache.spark.SparkContext = org.apache.spark.SparkContext@7c226095 
```

### count
- RDD에 저장된 item의 수를 return

```
def count(): Long
```

```
val c = sc.parallelize(List("Gnu", "Cat", "Rat", "Dog"), 2)
c.count
>>> Long = 4
```


### countApproxDistinct
- 대략적인 고유값 수를 count합니다
- 큰 RDD의 경우 빠르게 실행 가능
- relativeSD 파라미터가 정확도를 컨트롤합니다

```
def countApproxDistinct(relativeSD: Double = 0.05): Long
```

```
val a = sc.parallelize(1 to 10000, 20)
val b = a++a++a++a++a
b.countApproxDistinct(0.1)
>>> Long = 8224

b.countApproxDistinct(0.05)
>>> Long = 9750

b.countApproxDistinct(0.01)
>>> Long = 9947

b.countApproxDistinct(0.001)
>>> Long = 10000
```

### countApproxDistinctByKey [Pair]
- countApproxDistinct와 유사
- 고유한 Key에 대해 value의 대략적인 수를 count
- Tuple

```
def countApproxDistinctByKey(relativeSD: Double = 0.05): RDD[(K, Long)]
def countApproxDistinctByKey(relativeSD: Double, numPartitions: Int): RDD[(K, Long)]
def countApproxDistinctByKey(relativeSD: Double, partitioner: Partitioner): RDD[(K, Long)]
```

```
val a = sc.parallelize(List("Gnu", "Cat", "Rat", "Dog"), 2)
val b = sc.parallelize(a.takeSample(true, 10000, 0), 20)
val c = sc.parallelize(1 to b.count().toInt, 20)
val d = b.zip(c)
d.countApproxDistinctByKey(0.1).collect
>>> Array[(String, Long)] = Array((Rat,2567), (Cat,3357), (Dog,2414), (Gnu,2494))


d.countApproxDistinctByKey(0.01).collect
>>> Array[(String, Long)] = Array((Rat,2555), (Cat,2455), (Dog,2425), (Gnu,2513))


d.countApproxDistinctByKey(0.001).collect
>>> Array[(String, Long)] = Array((Rat,2562), (Cat,2464), (Dog,2451), (Gnu,2521))
```


### countByKey [pair]
- count와 유사하지만 개별 키에 대해 RDD의 value를 count(?)
- 이해가 잘 안됨. Map을 이해 덜해서 그런가?

```
def countByKey(): Map[K, Long]
```

```
val c = sc.parallelize(List((3, "Gnu"), (3, "Yak"), (5, "Mouse"), (3, "Dog")), 2)
c.countByKey
>>> scala.collection.Map[Int,Long] = Map(3 -> 3, 5 -> 1)
```