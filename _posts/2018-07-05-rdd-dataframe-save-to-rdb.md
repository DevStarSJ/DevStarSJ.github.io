---
layout: post
title:  "Apache Spark RDD, Dataframe을 DB(MySQL, PostgreSQL)에 저장하기"
subtitle: "Apache Spark RDD, Dataframe DB(MySQL, PostgreSQL)에 저장하기"
categories: data
tags: engineering
comments: true
---

Apaceh Spark RDD, Dataframe을 MySQL, PostgreSQL에 저장하는 방법에 대해 작성한 글입니다. Mac 환경에서 작업했으며, Spark Version은 2.3.0입니다


## 작업 순서
- RDD 생성
- RDD to Dataframe
- Dataframe to DB(MySQL, PostgreSQL)


## 필요한 Driver 설정
- ```build.sbt```에 libraryDependencies에 추가

	```
"mysql" % "mysql-connector-java" % "5.1.12",
"postgresql" % "postgresql" % "9.1-901.jdbc4"
```

## RDD to DB
```
import org.apache.spark.SparkConf
import org.apache.spark.sql.{SaveMode, SparkSession}
import java.util.Properties
import org.apache.spark.sql._
import org.apache.spark.sql.types._

val appName = "rddSaveDatabase"
val master = "local[*]"
val conf = new SparkConf().setAppName(appName).setMaster(master)

val sc = SparkSession.builder
    .master(master)
    .appName(appName)
    .config("spark.some.config.option", "config-value")
    .getOrCreate()
    
val values = List("20180705", 1.0)

// Row 생성
val row = Row.fromSeq(values)

// SparkSession은 2.x 이후 엔트리 포인트로, 내부에 sparkContext를 가지고 있음
val rdd = sc.sparkContext.makeRDD(List(row))
  
val fields = List(
StructField("First Column", StringType, nullable = false),
StructField("Second Column", DoubleType, nullable = false)
)

val dataFrame = sc.createDataFrame(rdd, StructType(fields))

val properties = new Properties()
properties.put("user", "mysql_username")
properties.put("password", "your_mysql_password")

// to MySQL
dataFrame.write.mode(SaveMode.Append).jdbc("jdbc:mysql://localhost:3306/dbtest", "test", properties)
// to PostgreSQL
dataFrame.write.mode(SaveMode.Append).jdbc("jdbc:postgresql://localhost:5432/dbtest", "test", properties)

println("RDD Save to DB!")    
```

- ```SaveMode.Append``` : DB에 추가
- ```SaveMode.Overwrite``` : DB에 덮어쓰기

## Dataframe to DB
```
import org.apache.spark.SparkConf
import org.apache.spark.sql.{SaveMode, SparkSession}
import java.util.Properties
import org.apache.spark.sql._
import org.apache.spark.sql.types._

val appName = "dataframeSaveDatabase"
val master = "local[*]"
val conf = new SparkConf().setAppName(appName).setMaster(master)

val sc = SparkSession.builder
    .master(master)
    .appName(appName)
    .config("spark.some.config.option", "config-value")
    .getOrCreate()

import sc.implicits._    

val values = List(("zzsza", "2018-07-05", "2017-07-06"))
val dataFrame = values.toDF("user_id", "join_date", "event_date")

val properties = new Properties()
properties.put("user", "database_username")
properties.put("password", "your_database_password")

// to MySQL
dataFrame.write.mode(SaveMode.Append).jdbc("jdbc:mysql://localhost:3306/dbtest", "test", properties)
// to PostgreSQL
dataFrame.write.mode(SaveMode.Append).jdbc("jdbc:postgresql://localhost:5432/dbtest", "test", properties)

println("Dataframe Save to DB!")    
```



## Reference
- [Spark Dataframe을 MySQL에 저장하는 방법](https://swalloow.github.io/spark-df-mysql)
- [Spark Dataframe From List[Any]](https://gist.github.com/yzhong52/f81e929e5810271292bd08856e2f4512)
- [Spark for Data Analyst](https://wikidocs.net/book/1686)