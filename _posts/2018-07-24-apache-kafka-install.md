---
layout: post
title:  "Apache Kafka Install on Linux"
subtitle: "Apache Kafka Install on Linux"
categories: data
tags: engineering
comments: true
---

[카프카, 데이터 플랫폼의 최강자](http://www.yes24.com/24/goods/59789254?scode=032)를 읽고 Apache Kafka 설치에 대해 정리한 글이며 linux 16.04에서 진행했습니다.  

이 문서에선 직접 밑단부터 설치하는 내용을 다루지만, [Confluent](https://www.confluent.io/download/)에서 다운받아 사용하거나 [Docker](https://github.com/wurstmeister/kafka-docker)를 사용해도 좋습니다

## 설치해야 하는 리스트
- [아파치 주키퍼](#아파치-주키퍼)
- [아파치 카프카](#아파치-카프카)

## 아파치 주키퍼
### 개요
- <img src="https://www.dropbox.com/s/wco6izvo0lnjxki/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-07-24%2013.57.55.png?raw=1"> 
- 분산 애플리케이션 관리를 위한 안정적 코디네이션 애플리케이션
- 각 애플리케이션의 정보를 중앙에 집중하고 구성 관리, 그룹 관리 네이밍, 동기화 등의 서비스 제공
- 직접 개발하기보다 안정적이라고 검증된 주키퍼를 많이 사용
- 카프카, 스톰, hbase, Nifi 등에서 사용됨 
- znode : 데이터를 저장하기 위한 공간 이름, 폴더 개념
- 주키퍼 데이터는 메모리에 저장되어 처리량이 매우 크고 속도 또한 빠름
- 앙상블(클러스터)라는 호스트 세트를 구성해 살아있는 노드 수가 과반수 이상 유지되면 지속적 서비스가 가능
	- 과반수 방식으로 운영되어 홀수로 서버를 구성 
	- 3대 : 최대 초당 약 80,000 request 처리
	- 5대 : 최대 초당 약 140,000 request 처리
- 로그
	- 로그는 별도의 디렉토리에 저장
	- znode에 변경사항이 발생하면 트랜잭션 로그에 추가됨
	- 로그가 어느정도 커지면 모든 znode의 상태 스냅샷이 파일시스템에 저장
- myid
	- 주키퍼 노드를 구분하기 위한 ID
	- 각 클러스터에 다른 값 설정 
- 환경설정
	- ```zoo.cfg``` 
	- [공식 문서](http://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_configuration) 참고


### 설치
- [Cluster Setup](https://zookeeper.apache.org/doc/r3.4.6/zookeeperAdmin.html#sc_zkMulitServerSetup) 참고
	- jdk 설치 : 
	
		```
		sudo add-apt-repository ppa:openjdk-r/ppa
		sudo apt-get update
		sudo apt-get install openjdk-8-jdk
		```
	
	- java heap 사이즈 설정
	- zookeeper 설치
	- config 파일 설정  
- [주키퍼 홈페이지](http://zookeeper.apache.org/releases.html#download)로 이동해 mirrors 클릭 후 URL 복사  
- 다운로드 후 압축 풀기

```
sudo passwd
su // 암호 입력. root로 변경
cd /usr/local/
wget http://mirror.navercorp.com/apache/zookeeper/zookeeper-3.4.13/zookeeper-3.4.13.tar.gz
tar zxf zookeeper-3.4.13.tar.gz
```

- 심볼릭 링크 설정 : 주키퍼 버전을 올릴 경우 심볼릭 링크가 없으면 모두 변경해야 함

```
ln -s zookeeper-3.4.13 zookeeper
// 확인하고 싶은 경우
ls -la zookeeper
>>> lrwxrwxrwx 1 byeon byeon 16 Jul 24 05:11 zookeeper -> zookeeper-3.4.13
```

- 데이터 디렉토리 생성

```
mkdir data
```

- myid 설정

```
cd data
vi myid
// 내용은 1
// 다른 클러스터(서버)에도 data/myid에 2, 3 작성 후 저장
```

- ```zoo.cfg``` 설정

```
cd /usr/local/zookeeper/conf
vi zoo.cfg
```

- ```zoo.cfg``` 파일
	- 분산일 경우 server.1 밑부분을 작성하고 standalone일 경우엔 비움 

```
// zoo.cfg
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/usr/local/data
clientPort=2181
server.1=0.0.0.0:2888:3888
server.2={머신2의 ip}:2888:3888
server.3={머신3의 ip}:2888:3888
```


- 실행

```
/usr/local/zookeeper/bin/zkServer.sh start
```

- 중지

```
/usr/local/zookeeper/bin/zkServer.sh stop
```

- systemd service 파일 작성
	- 관리를 효율적으로 하기 위해 등록
	- 예기치 않게 서버의 오작동으로 리부팅된 경우 특정 프로세스는 자동으로 시작, 특정 프로세스는 수동 시작일 경우가 있음 

```
vi /etc/systemd/system/zookeeper-server.service
```

```
[Unit]
Description=zookeeper-server
After=network.target

[Service]
Type=forking
User=root
Group=root
SyslogIdentifier=zookeeper-server
WorkingDirectory=/usr/local/zookeeper
Restart=on-failure
RestartSec=0s
ExecStart=/usr/local/zookeeper/bin/zkServer.sh start
ExecStop=/usr/local/zookeeper/bin/zkServer.sh stop
```

- systemd service 등록 및 실행

```
systemctl daemon-reload
systemctl enable zookeeper-server.service
systemctl start zookeeper-server.service
// 중지는
// systemctl stop zookeeper-server.service
// 상태 확인은
// systemctl status zookeeper-server.service
```

- Cli 모드로 접속

```
/usr/local/zookeeper/bin/zkCli.sh -server localhost:2181
```

## 아파치 카프카
### 설치
```
cd /usr/local/
wget http://apache.mirror.cdnetworks.com/kafka/1.0.0/kafka_2.11-1.0.0.tgz
tar zxf kafka_2.11-1.0.0.tgz
```

- 심볼릭 링크 설정 

```
ln -s kafka_2.11-1.0.0 kafka
```

- 저장 디렉토리 준비
	- 컨슈머가 메세지를 가져가더라도 저장된 데이터를 임시로 보관
	- 디렉토리를 하나만 구성하거나 여러 디렉토리로 구성 가능
	- 디스크가 여러개인 서버는 디스크 수만큼 디렉토리 만들어야 디스크별로 IO 분산 가능

```
mkdir kafka-data1
mkdir kafka-data2
``` 

- 카프카 브로커 서버들과 주키퍼 서버와 통신 가능 유무 확인

```
nc -v IP주소 Port 번호
// Connected to 1.1.1.1:2181이 뜨면 성공
// 포트가 막혀있으면 포트 설정
```

- 환경 설정

```
vi /usr/local/kafka/config/server.properties
```

```
broker.id=1
log.dirs=/usr/local/kafka-data1, /usr/local/kafka-data2
// zookeeper.connect={호스트1:2181, 호스트2:2181, 호스트3:2181}/zzsza-kafka
// 여기선 단일로 진행할거라 설정 그대로 사용
zookeeper.connect=localhost:2181/zzsza-kafka
```

- 카프카 실행

```
/usr/local/kafka/bin/kafka-server-start.sh /usr/local/kafka/config/server.properties
```

- systemd service 파일 작성

```
vi /etc/systemd/system/kafka-server.service
```

```
[Unit]
Description=kafka-server
After=network.target

[Service]
Type=simple
User=root
Group=root
SyslogIdentifier=kafka-server
WorkingDirectory=/usr/local/kafka
Restart=no
RestartSec=0s
ExecStart=/usr/local/kafka/bin/kafka-server-start.sh /usr/local/kafka/config/server.properties
ExecStop=/usr/local/kafka/bin/kafka-server-stop.sh
```

- systemd service 등록 및 실행

```
systemctl daemon-reload
systemctl enable kafka-server.service
systemctl start kafka-server.service
// 중지는
// systemctl stop kafka-server.service
// 상태 확인은
// systemctl status kafka-server.service
```

## 카프카 상태 확인
### TCP 포트 확인
- 주키퍼

```
netstat -ntlp | grep 2181
>>> tcp6 0 0 :::2181 :::* LISTEN  1954/java
```

- 카프카

```
netstat -ntlp | grep 9092
>>> tcp6 0 0 :::9092 :::* LISTEN  2205/java
```

### zookeeper znode를 이용한 카프카 정보 확인
```
/usr/local/zookeeper/bin/zkCli.sh

ls /
>>> [zookeeper, zzsza-kafka]

ls /zzsza-kafka/brokers/ids
>>> [1]
```

### 카프카 로그 확인
```
cat /usr/local/kafka/logs/server.log
```

## 카프카 Topic 생성
```
/usr/local/kafka/bin/kafka-topics.sh --zookeeper localhost:2181/zzsza-kafka --replication-factor 1 --partitions 1 --topic hi-topic --create
```

### 메세지 생성
```
/usr/local/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic hi-topic
> This is a message
> This is anotehr message
// ctrl + C
```

## 메세지 가져오기
```
/usr/local/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic hi-topic --from-beginning
```

## Reference
- [카프카, 데이터 플랫폼의 최강자](http://www.yes24.com/24/goods/59789254?scode=032)
- [systemd unit 등록 관련 옵션 정리](http://fmd1225.tistory.com/93)
- [Apache Zookeeper Server 설치](https://github.com/infoscis/Wiki/wiki/Apache-Zookeeper-Server-%EC%84%A4%EC%B9%98)
- [Ubuntu 16.04 system service 등록하](https://pinedance.github.io/blog/2017/09/12/Ubuntu-16.04-system-service-%EB%93%B1%EB%A1%9D%ED%95%98%EA%B8%B0)