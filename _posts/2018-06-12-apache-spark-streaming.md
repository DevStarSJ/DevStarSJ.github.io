---
layout: post
title:  "Apache Spark Streaming"
subtitle: "Apache Spark Streaming"
categories: data
tags: engineering
comments: true
---

Apache Spark Streaming에 대한 글입니다

## Spark Streaming
---

<img src="https://www.dropbox.com/s/iyw3faoyy8dp7ha/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-12%2022.24.17.png?raw=1">

- 다양한 소스로부터 실시간 스트리밍 데이터 처리
- Spark RDD와 사용 방법이 유사하며 lambda 아키텍쳐를 만들기 좋음
- Structured Streaming라는 것도 최근 추가됨 : [공식 문서](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html)

<img src="https://www.dropbox.com/s/c6x867fnpiy37gk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-12%2022.24.43.png?raw=1">

- 스트림 데이터를 일정 단위로 쪼개어 batch 처리
- DStream (discreatized stream 불연속적 스트림)
	- 데이터를 끊어서 연속된 RDD로 만들어 처리 
	- 데이터를 아주 짧은 주기로 처리 (ex: 1초마다 처리)

- SparkConf
	- 여러가지 설정을 저장
	- AppName과 master 주소
- StreamingContext
	- 소스 (DStream, RDD) 생성과 스트리밍 처리 시작, 종료 등을 수행
- Input DStream
	- Input data를 표현하는 DStream, Receiver와 연동
- Receiver
	- 건별로 들어오는 데이터를 모아서 처리할 수 있도록 처리하는 친구
	- 데이터를 받아서 Spark 메모리에 저장해놓음  

### DStream Operations
- Transformations 
	- RDD와 거의 유사
- Window Operations
	- 최근 1분(주기)의 평균을 1초마다 refresh하고 싶을 경우!
	- Time Window 개념을 제공
	- window length
- Output Operations
	- print
	- foreachRDD : 자유도가 높음
	- saveAsTextFile, saveAsObjectFile, saveAsHadoopFile 등

### Example
- [공식 문서](https://spark.apache.org/docs/2.2.0/streaming-programming-guide.html)


```
import org.apache.spark._
import org.apache.spark.streaming._
import org.apache.spark.streaming.StreamingContext._ // not necessary since Spark 1.3

// Create a local StreamingContext with two working thread and batch interval of 1 second.
// The master requires 2 cores to prevent from a starvation scenario.

val conf = new SparkConf().setMaster("local[2]").setAppName("NetworkWordCount")
val ssc = new StreamingContext(conf, Seconds(1))
// Seconds(1) : 1초 주기

// Create a DStream that will connect to hostname:port, like localhost:9999
val lines = ssc.socketTextStream("localhost", 9999)

// Split each line into words
val words = lines.flatMap(_.split(" "))

import org.apache.spark.streaming.StreamingContext._ // not necessary since Spark 1.3
// Count each word in each batch
val pairs = words.map(word => (word, 1))
val wordCounts = pairs.reduceByKey(_ + _)

// Print the first ten elements of each RDD generated in this DStream to the console
wordCounts.print()

ssc.start()             // Start the computation
// start를 해야 시작!
ssc.awaitTermination()  // Wait for the computation to terminate

```	

## Streaming
---

### Twitter API
- Twitter 가입
- 전화번호 인증
- [https://apps.twitter.com/](https://apps.twitter.com/) 에서 앱 만들기
- Keys and Access Tokens 클릭
- Your Access Token에서 키 생성
- 다음 값 챙기기
	- Consumer Key (API Key)
	- Consumer Secret (API Secret)
	- Access Token 
	- Access Token Secret 

### build.sbt 설정
```
lazy val root = (project in file(".")).
  settings(
    inThisBuild(List(
      organization := "com.example",
      scalaVersion := "2.11.7",
      version      := "0.1.0-SNAPSHOT"
    )),
    name := "Hello",
    libraryDependencies ++= List(
      "org.twitter4j" % "twitter4j-core" % "4.0.6",
      "org.apache.bahir" % "spark-streaming-twitter_2.11" % "2.1.0",
      "org.apache.spark" % "spark-core_2.11" % "2.2.0",
      "org.apache.spark" % "spark-streaming_2.11" % "2.2.0"
      ),
    retrieveManaged := true
  )
```

### twitterStreaming File

```
import org.apache.log4j.{Level, Logger}
import org.apache.spark.SparkConf
import org.apache.spark.streaming.{Seconds, StreamingContext}
import org.apache.spark.streaming.twitter.TwitterUtils


object twitterStreaming extends App{
  println("hello")

  val appName = "spark_course"
  val master = "local[*]"
  val conf = new SparkConf().setAppName(appName).setMaster(master)
  val ssc = new StreamingContext(conf, Seconds(10))

  val rootLogger = Logger.getRootLogger()
  rootLogger.setLevel(Level.ERROR)

  val consumerKey = "****"
  val consumerSecret = "****"
  val accessToken = "****"
  val accessTokenSecret = "****"

  System.setProperty("twitter4j.oauth.consumerKey", consumerKey)
  System.setProperty("twitter4j.oauth.consumerSecret", consumerSecret)
  System.setProperty("twitter4j.oauth.accessToken", accessToken)
  System.setProperty("twitter4j.oauth.accessTokenSecret", accessTokenSecret)

  val stream = TwitterUtils.createStream(ssc, None)

//  stream.print()
//  val text = stream.map(status => status.getText) // 아래처럼 리팩토링
  val text = stream.map(_.getText)

  val hashTags = text.flatMap(_.split(" ")).filter(_.startsWith("#"))

//  val hashTagCounts = hashTags.map(h => (h, 1)).reduceByKey(_+_)
  val hashTagCounts = hashTags.map(h => (h, 1)).reduceByKeyAndWindow(_+_, Seconds(60)) // Window 사용 : 60초의 데이터를 모음

//  text.print()
//  hashTags.print()
//  hashTagCounts.print() // 순서대로 정렬은 안됨..! foreachRDD를 사용하자

  hashTagCounts.foreachRDD {
    rdd =>
      println("=====")
      rdd.sortBy(_._2, false).take(10).foreach(println)
  }

  ssc.start()
  ssc.awaitTermination()
}
```

- TwitterUtils 살펴보기! TwitterInputDStream, getReceiver 함수들 확인해보기
- TwitterReceiver의 onstart()할 때 store(status)도 확인해보기!
- Streaming같은 경우 처리를 여러 컴퓨터로 하면 날라갈 수 있음!
	- 정확하게 1번만 처리하는 것이 어려운 이슈
	- 실시간 처리할 때 정확도를 조금 포기하는편
	- 그래서 정확한 수치가 필요한 것은 배치로 처리!
	- Kafka가 Spark로 쏘고, S3로 쏘기도 함 (람다 아키텍쳐)


## Performance Tuning
- 스트리밍은 정해진 batch 주기 이내에 데이터 처리가 모두 끝나야해서 성능이 중요
- 병렬처리, 데이터 Serialization 방법, 메모리, GC 튜닝 등 수많은 요소를 점검하고 손봐야 합니다
- Tuning Guide 및 Streaming 문서 참고
	 - [https://spark.apache.org/docs/latest/tuning.html](https://spark.apache.org/docs/latest/tuning.html)
	 - [https://spark.apache.org/docs/latest/streaming-programmingguide.html](https://spark.apache.org/docs/latest/streaming-programmingguide.html)


