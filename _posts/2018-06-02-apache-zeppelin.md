---
layout: post
title:  "Apache Zeppelin(아파치 제플린)"
subtitle: "Apache Zeppelin(아파치 제플린)"
categories: data
tags: engineering
comments: true
---

## Apache Zeppelin 장점
- Apache Spark와 궁합이 잘맞음
- Interactive한 레포트 작성 가능

## Apache Zeppelin Install
- [홈페이지](https://zeppelin.apache.org/) 접속 후 다운로드
	- 용량이 큰 것은 빅쿼리, 카산드라 등이 모두 빌드된 것이고 작은 것은 스파크만 빌드
- 압축 풀기
- ```cd /folder``` : 압축을 푼 폴더로 들어가기
- 빌드 : ```./bin/zeppelin.sh```
- 빌드 후 실행 : ```./bin/zeppelin-daemon.sh start```
- 종료 : ```./bin/zeppelin-daemon.sh stop```
- ```localhost:8080```로 접속
- 종료해도 죽지 않는다면(2번 이상 실행해서) ```ps -al```로 Zepplin PID를 찾은 후, ```kill -9 <PID>```로 죽이기

## Apache Zeppelin
<img src="https://www.dropbox.com/s/h7sh5zm5djtgz4w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2015.00.09.png?raw=1">

<img src="https://www.dropbox.com/s/w5vwxcqcs57se0w/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-02%2016.17.08.png?raw=1">

- 자동완성 기능 : ```control + .``` 또는 ```tab```(0.8.0 version에서 추가됨!)
- 각종 설정을 변경하고 싶을 경우
	- ```/$ZEPPELIN_FOLDER/conf/```에 있는 *.template 파일의 이름에서 .template를 제거한 후 설정하면 됩니다
	- ex) 기본 포트인 8080을 변경하고 싶은 경우 ```/conf/zeppelin-site.xml.template```을 ```/conf/zeppelin-site.xml``` 로 수정한 후, zeppelin.server.port라고 작성된 곳의 value에 포트를 변경해주면 됩니다
- Zeppelin의 Notebook 파일은 ```$ZEPPELIN_HOME/notebook``` 폴더에 저장됩니다! Jupyter Notebook과 다르게 json 파일로 저장됩니다
- default라고 되어있는 버튼을 클릭하면 Report 형태(Code 숨김)로 볼 수 있습니다


<img src="https://www.dropbox.com/s/qgny154j547wi4o/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2013.52.46.png?raw=1">

- 우측 최상단 Anonymous를 클릭하면 하단에 메뉴가 나옵니다. 다른 부분은 직접 클릭해보면 알 수 있고, Interpreter를 눌러보겠습니다

<img src="https://www.dropbox.com/s/adnemwoq48afcxz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2013.53.30.png?raw=1">

- 각종 Interpreter 설정을 할 수 있는 곳입니다. 위 사진은 Spark 부분의 옵션값 페이지입니다

### Tutorial
- [Zeppelin Tutorial](https://zeppelin.apache.org/docs/0.7.3/quickstart/tutorial.html#tutorial-with-local-file)을 해봤습니다

<img src="https://www.dropbox.com/s/txpbre864nrsibz/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2014.20.20.png?raw=1">

- 이런 식으로 코드를 작성해서 사용합니다!

<img src="https://www.dropbox.com/s/q942roxo1e9zp8i/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2014.21.12.png?raw=1">

- 빠른 데이터 시각화가 가능합니다
- settings를 클릭하면 더 자세한 설정 가능
- ```bank.toDF().registerTempTable("bank")```를 통해 bank라는 TempTable 생성했습니다!

### Dynamic Form
- Dynamic Form은 사용자가 클릭만으로 쉽게 조작할 수 있도록 도와줍니다!
- 코딩을 할 줄 모르는 사람에게 유용

<img src="https://www.dropbox.com/s/9ixvoju7gk1qsbp/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2014.22.10.png?raw=1">

- Select form은 ```${formName=defaultValue,option1|option2...}``` 이런 방식으로 생성


<img src="https://www.dropbox.com/s/ea7afuwlkv0ansr/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-03%2014.23.54.png?raw=1">

- Checkbox form은 ```${checkbox:formName=defaultValue1|defaultValue2...,option1|option2...}``` 이런 방식으로 생성
- Text input도 있습니다! [Zeppelin 공식문서](https://zeppelin.apache.org/docs/0.7.3/manual/dynamicform.html) 참고해주세요!