---
layout: post
title:  "Google Cloud SDK 시작 및 계정 전환"
subtitle:   "Google Cloud SDK 시작 및 계정 전환"
categories: gcp
tags: basic
comments: true
---
Google Cloud SDK(gcloud) 시작 및 계정 전환하는 것에 대해 알려드리려고 합니다! 구글 클라우드 플랫폼을 회사 계정, 개인 계정으로 사용하는 경우, 로컬에서 구글 클라우드 SDK 계정을 전환할 필요가 있습니다  

# 1. gcloud 설치 (Mac OS)
Google Cloud SDK인 gcloud 설치하기!   
[공식 문서](https://cloud.google.com/sdk/docs/quickstarts)  
터미널에서 아래 명령어 실행해주세요

```
wget https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-164.0.0-darwin-x86_64.tar.gz  
tar -zxvf google-cloud-sdk-164.0.0-darwin-x86_64.tar.gz
cd google-cloud-sdk
./install.sh
```

# 2. gcloud 설정

<img src="https://github.com/zzsza/TIL/raw/8ebd0fd156012110fd273c4c9150b00c2d84580c/Google_Cloud_Platform/img/config_1.png">

```
gcloud init
```
해당 명령어를 입력하면 config 내용들이 나옵니다!

만약 config가 없다면 바로 첫 작업이 진행되고, 설정되어 있는 설정이 있다면 위 사진같은 내용들이 출력될 것입니다

```Create a new configurations```을 위해 2를 입력해줍니다

그 후, config 이름을 설정해주세요! 저는 byeon으로 했습니다

그 이후 ```Choose the account you would like to use to perform operations for this configurations:``` 이란 내용이 나옵니다.  
기존에 있던 계정은 ```1```, 새 계정으로 로그인은 ```2```를 눌러주세요(계정의 수마다 숫자가 다를 수 있습니다)

저는 1을 입력했습니다!


<img src="https://github.com/zzsza/TIL/raw/8ebd0fd156012110fd273c4c9150b00c2d84580c/Google_Cloud_Platform/img/config_2.png">

그 이후 region 설정을 하게 됩니다.  
저는 Compute Engine의 지역인 ```asia-east1```을 그대로 사용하기로 결정했습니다  

# 3. 계정 전환
이제 gcloud 설정은 모두 끝났고, gcloud 계정 전환하는 방법을 알려드리겠습니다!  
2개의 명령어만 기억하면 됩니다 :)   

[gcloud config configurations document](https://cloud.google.com/sdk/gcloud/reference/config/configurations/)  

```gcloud config configurations list```
- 현재 로컬에 저장되어 있는 설정 출력

```gcloud config configurations activate [configuration name]```
- 해당 이름의 계정으로 전환

<img src="https://github.com/zzsza/TIL/raw/3eab6f99f34046d7bafd9ac42c1568f3278c5ec4/Google_Cloud_Platform/img/config_4.png">

