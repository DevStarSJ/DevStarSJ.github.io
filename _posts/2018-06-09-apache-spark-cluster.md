---
layout: post
title: "Apache Spark Cluster on Google Cloud Platform"
subtitle: "Apache Spark Cluster on GCP"
categories: data
tags: engineering
comments: true
---

구글 클라우드 플랫폼(Google Cloud Platform, GCP)을 사용해 Apache Spark Cluster를 띄우는 방법을 작성한 글입니다.  
1) Compute Engine에서 클러스터를 띄우는 방법과 2) Dataproc을 사용하는 방법 2가지를 설명합니다.  
[Spark 공식 문서](https://spark.apache.org/docs/latest/cluster-overview.html) 참고


## 1) Compute Engine Instance에서 직접 설치

### Spark 설치
- GCP 가입 : [포스팅](https://zzsza.github.io/gcp/2018/01/01/gcp-intro/) 참고
- Gcloud 로컬에 설치 : [포스팅](https://zzsza.github.io/gcp/2018/01/11/config-gcloud-account/)
- Compute Engine 클릭한 후, Create Instance
	- CPU 1개, 메모리 3.75 선택, Ubuntu 18.04
- ```gcloud compute --project "<프로젝트 ID>" ssh --zone "<지역>" "<인스턴스 이름>"```로 접속 
- 참고) 프로젝트 ID는 my-sample-project-191923 이런식으로 작성되어 있습니다

- ```ssh localhost``` 입력
	- 에러 발생시 키젠 등록

```
ssh-keygen
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod og-wx ~/.ssh/authorized_keys
```

- Spark 설치 및 실행

```
wget http://mirror.navercorp.com/apache/spark/spark-2.3.0/spark-2.3.0-bin-hadoop2.7.tgz
tar -xvf spark-2.3.0-bin-hadoop2.7.tgz
cd spark-2.3.0-bin-hadoop2.7/
./bin/spark-shell
```

- ```./bin/spark-shell```을 사용할 경우는 Spark Local Mode로 띄운 것 

- Java 설치(JAVA_HOME is not set라고 나오는 경우)

```
apt-get install software-properties-common
add-apt-repository ppa:webupd8team/java
apt-get update
apt-get install oracle-java8-installer
// "Configuring oracle-java8-installer" --- [Ok] --- [Yes]
java -version
// 1.8.0
```

## Spark Cluster
---
<img src="https://www.dropbox.com/s/ei60vlis4b1y12u/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2015.58.59.png?raw=1">

- Cluster Manager
- Driver 노드 ( Master, 8080 port, ```./bin/spark-shell``` )
	- SparkContext(APP)이 구동 
	- 로컬의 Spark Shell, 제플린
- Worker 노드 ( Slave, 808n port,```./sbin/start-slave(s).sh``` )
	- 컴퓨터, 실제적인 일을 수행, Executor 구동
	- 1개의 Executor가 여러 Task를 수행
	- 1) Slave가 될 컴퓨터에 접속해서 Slave에서 설정 : ```./sbin/start-slave.sh```  
	- 2) Master에서 Slave에 접속해 띄우기 : ```./sbin/start-slaves.sh```


## Spark Cluster 실습 1
---

- 우선 1대의 컴퓨터에서 각각의 요소를 모두 띄워보겠습니다
- 단, 메모리 설정은 하지 않았음

### Spark Master 실행
- ```./bin/spark-shell --master=<스파크 마스터 주소>```
	
```
./sbin/start-master.sh
>>> logging to /home/byeon/spark-2.3.0-bin-hadoop2.7/logs/spark-byeon-org.apache.spark.deploy.master.Master-1-spark-cluster.out
```

- Spark Master를 실행한 후, Log를 확인해보겠습니다

```
vi /home/byeon/spark-2.3.0-bin-hadoop2.7/logs/spark-byeon-org.apache.spark.deploy.master.Master-1-spark-cluster.out
```

- 확인해보면, 아래와 같은 메세지를 발견할 수 있습니다
- Master:54 - Starting Spark master at spark://spark-cluster.어쩌구저쩌구.internal:7077 : 스파크 마스터 주소!!!
- ```spark://spark-cluster.어쩌구저쩌구.internal:7077```를 복사해주세요!
- 이제 master를 지정해서 실행하겠습니다

```
./bin/spark-shell --master=<스파크 마스터 주소>
sc.makeRDD(List(1,2,3)).count
```

- 마지막 sc.makeRDD에서 에러 발생
- 이유는 현재 Master만 켰기 때문! Cluster도 띄워야 합니다

### 방화벽 설정
- Cluster를 띄우기 전에, 방화벽 설정을 하겠습니다
- [방화벽 규칙](https://console.cloud.google.com/networking/firewalls)을 클릭한 후, 방화벽 규칙 만들기
	- ssh 터널링을 사용해서 특정 포트만 열어주는 것을 추천하지만 이번엔 실습을 위해서 전체를 열어두겠습니다(반드시 다시 설정해주세요!!!!)
	- 소스 IP 범위 : ```0.0.0.0/0``` 입력
	- 프로토콜 및 포트 : 모두 허용
- <IP>:8080 접속 되는지 확인!

### Spark Master UI
<img src="https://www.dropbox.com/s/2w5luzn6skcf1h1/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2016.18.43.png?raw=1">

- Spark Master를 띄우면 8080 포트로 접속 가능

### Spark Worker 실행
- 1) Slave가 될 컴퓨터에 접속해서 Slave에서 설정
	- ```./sbin/start-slave.sh <master 주소>```
- 2) Master에서 Slave에 접속해 띄우기
	- ```./sbin/start-slaves.sh``` 

### Conf 설정

```
cd <스파크 메인 디렉토리>/conf
cp slaves.template slaves
// 기본 설정은 localhost
```

### 다시 클러스터 실행
```
./sbin/start-slaves.sh
```

- Spark UI에서 보면 Workers가 추가됨

### 다시 Master 실행
```
./bin/spark-shell --master=<스파크 마스터 주소>
```

- Spark UI에서 보면 Running Applications가 추가됨
- ```sc.makeRDD(List(1,2,3)).count``` 입력하면 작업이 수행됨

### Spark Worker UI
- <IP>:8081 : 워커 UI
- 워커를 하나 더 띄우면 8082에 뜸

### Spark Application
- <IP>:4040
<img src="https://www.dropbox.com/s/1dekdskl1949si9/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2016.41.27.png?raw=1">

- Description 아래를 클릭하면

<img src="https://www.dropbox.com/s/vgn8eamuvjkfmqk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2016.41.59.png?raw=1">

- 자세한 정보들이 나오며 어디가 느린지 확인할 수 있음
- storage는 캐싱할 경우 나옴


## Spark Cluster 실습 2
---

### 1대의 Master, 2개의 Cluster 생성
- 스냅샷 만들기
	- [스냅샷](https://console.cloud.google.com/compute/snapshots) 이동
	- 스냅샷 만들기 클릭
	- 소스 디스크 : 위에서 만든 디스크 선택
- 인스턴스 만들기 - 부팅디스크 - 스냅샷 선택해서 클러스터 2개 인스턴스 생성

### conf 설정
- vi <spark 주소>/conf/slaves
- 클러스터 인스턴스의 내부 IP 입력후 Esc :q

### Master, Slave 모두 실행

```
./sbin/start-all.sh
```

<img src="https://www.dropbox.com/s/7irpcyrx52fjllz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2016.59.44.png?raw=1">

### 큰 사이즈의 데이터로 시뮬레이션
- spark-shell에서

```
def df = spark.sparkContext.makeRDD(1 to 1000000000)
val bigDf = (0 to 10).map(_ => df).reduce(_ union _)
bigDf.count
```

- <IP>:4040으로 접속하면!!

<img src="https://www.dropbox.com/s/jud1ul3ppozt2zz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2017.06.33.png?raw=1">

- 클러스터 2개를 제외하고 재실행

```
vi <spark 주소>/conf/slaves
// 기존 2개의 클러스터 주석처리
```

<img src="https://www.dropbox.com/s/0sjytdcldvcqbcf/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2017.09.17.png?raw=1">

- 2개의 Worker가 죽어있음
- spark-shell에서

```
def df = spark.sparkContext.makeRDD(1 to 1000000000)
val bigDf = (0 to 10).map(_ => df).reduce(_ union _)
bigDf.count
```

- <IP>:4040으로 접속하면!!

<img src="https://www.dropbox.com/s/fn7pjniwqv35wxd/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-09%2017.19.52.png?raw=1">

- 시간이 더 오래걸렸습니다


## 2) Dataproc 실행
---

- [Dataproc](https://console.cloud.google.com/dataproc) 클릭
- 클러스터 만들기 클릭
- 각종 설정한 후 만들기
- 생성된 클러스터 이름을 클릭 - vm 인스턴스 클릭하면 마스터와 워커가 보입니다
- 마스터를 ssh로 접속한 후, ```spark-shell``` 입력하면 스파크가 실행됩니다
- 추후 Dataproc을 사용해 데이터를 처리하는 내용을 포스팅할 예정입니다
- 사실 실무에서는 Dataproc을 사용합니다!
- [박정운님 글](https://jungwoon.github.io/google%20cloud/2018/05/27/GCP-Dataproc/) 읽어보기!