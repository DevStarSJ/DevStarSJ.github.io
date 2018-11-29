---
layout: post
title:  "Apache Spark RDD NotSerializableException"
subtitle: "Apache Spark RDD NotSerializableException"
categories: data
tags: engineering
comments: true
---

Apache Spark RDD NotSerializableException 오류에 대한 포스팅입니다!


## 예제
---

- MySQL에 Insert하는 사례

```
class Mysql() {
    def createConnection() {}
    def insert(n: Int) {}
}

val mysql = new Mysql()
mysql.createConnection

val rdd = sc.makeRDD(List(1,2,3,4))

rdd.foreach {
    n => mysql.insert(n)
}
```

- ```rdd.foreach```는 워커에서 실행되는 작업!
- ```rdd.map(f)```와 같은 경우 f라는 함수 코드가 클러스터에 전송되서 사용됩니다
- 따라서 f는 다른 클러스터에 전송 가능한 형태여야 사용 가능
- 이것이 안될 경우 ```NotSerializableException``` 발생

### 해법
---

```
rdd.foreachPartition {
    iter =>
    val mysql = new Mysql()
    mysql.createConnection
    iter.foreach {
        n => mysql.insert(n)
    }
}	
```

- ```foreachPartition```을 사용해 해결!