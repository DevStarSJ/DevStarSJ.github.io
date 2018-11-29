---
layout: post
title:  "Jupyter Notebook에서 Scala 사용하기(In Mac)"
subtitle:   "Use Scala in Jupyter notebook In Mac"
categories: development
tags: scala
comments: true
---
Jupyter Notebook에서 Scala를 사용하는 방법에 대해 포스팅 해보겠습니다! Zeppelin에서도 Scala를 사용할 순 있지만, 데이터 분석가는 Jupyter Notebook이 편하기 때문에..! Jupyter Notebook에 Scala 커널을 추가하고 싶었습니다(환경은 Mac OS입니다)

만약 웹에서 Scala를 사용하고 싶으시면, [ScalaFiddle](https://scalafiddle.io/)을 사용하시면 될 것 같습니다


## Intro
- 찾아보니 Github에 [jupyter-scala](https://github.com/jupyter-scala/jupyter-scala)라는 repository가 있었습니다!
- 대체할 수 있는 [Toree](https://github.com/apache/incubator-toree)나 [Zeppelin](https://github.com/apache/zeppelin)에 비해 다재다능하며, 큰 데이터 프레임워크에 즉각적으로 추가할 수 있는 장점이 있다고 합니다(사실 이 부분에 대해 명확한 차이는 보이지 않네요! 추후 찾아봐야 겠습니다)
- Toree로 설치하고 싶으신 분들은 박준영님의 [포스팅](http://swalloow.github.io//jupyter-spark)을 참고하면 좋을 것 같습니다 :)

## Install Scala Kernel (Mac)
### Install sbt
- 설치되어 있다면 생략

```
brew install sbt
```

### Install jupyter-scala
```
git clone https://github.com/alexarchambault/jupyter-scala.git
cd jupyter-scala
sbt publishLocal
```

- 시간이 좀 많이 걸렸습니다(5분-10분 사이)

```
 ./jupyter-scala –id scala-develop –name "Scala (develop)" –force
```

- 이건 5분 이내로 끝났습니다
- 그 후 아래 명령어로 커널이 존재하는지 확인해보겠습니다

```
jupyter kernelspec list
>>>
Available kernels:
  scala      /Users/byeon/Library/Jupyter/kernels/scala
  python3    /usr/local/share/jupyter/kernels/python3
```

- 위와 같이 scala가 있으면 끝!

## Install Scala Kernel (Windows 10)
### Download Git Source
```
git clone https://github.com/jupyter-scala/jupyter-scala
```

또는 ```Download ZIP``` 클릭

### Unzip
- 압축 해제

### Run Script
- 압축 해제한 폴더로 간 후,
```
(bash) . jupyter-scala
```

- Jupyter Notebook 킨 후 커널 확인
- 문제 생길 시 [issues](https://github.com/jupyter-scala/jupyter-scala/issues/108)를 참고!



## After Install Scala Kernel
<img src="https://www.dropbox.com/s/hvash2pjev17l4i/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-25%2011.43.39.png?raw=1">

- 위와 같이 Scala가 생깁니다 :)

<img src="https://www.dropbox.com/s/cd1rmab8zi9zh1t/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-04-25%2011.45.48.png?raw=1">

- Scala로 이것저것 Test해봤습니다!!
- 이제 다음 글에서 Spark를 Jupyter Notebook에서 해보겠습니다!!!!


## Reference
- [jupyter-scala](https://github.com/jupyter-scala/jupyter-scala)