---
layout: post
title:  "Google Cloud Platform에서 Tensorflow, Jupyter Notebook 설치 및 startup script 설정"
subtitle:  "Google Cloud Platform에서 Tensorflow,  설치하기"
categories: gcp
tags: basic
comments: true
---

이 글은 Google Cloud Platform의 Compute Engine에서 Tensorflow, Pytorch, Keras, Jupyter Notebook를 설치하는 내용을 다룹니다. 그리고 인스턴스 시작할 때마다 jupyter notebook을 자동으로 켜주는 startup script을 사용하는 방법도 포함되어 있습니다.



## 목차
---

1. [Google Cloud Platform 가입하기](#google-cloud-platform-가입하기)
2. [Quota 요청](#quota-요청)
3. [Instance 생성](#instance-생성)
4. [Instance 접속](#instance-접속)
5. [CUDA 설치](#cuda-설치)
6. [cuDNN 설치](#cudnn-설치)
7. [Tensorflow, Pytorch, Keras 설치](#tensorflow,-pytorch,-keras-설치)
8. [Jupyter 및 기타 라이브러리 설치](#jupyter-및-기타-라이브러리-설치)
9. [방화벽 Port 열기](#방화벽-port-열기)
10. [Jupyter notebook 띄우기](#jupyter-notebook-띄우기)
11. [startup-script](#startup-script)

---

## Google Cloud Platform 가입하기
---

- [[링크](https://zzsza.github.io/gcp/2018/01/01/gcp-intro/)] 참고

## Quota 요청
---

이제 막 GCP에 가입했으면 GPU Quota(할당량)가 없습니다. 별도로 신청한 후, 승인받아야 GPU를 사용할 수 있습니다  
  
GCP 콘솔([https://console.cloud.google.com/](https://console.cloud.google.com/))에서 IAM 및 관리자 - 할당량을 선택해주세요

그 후, 아래와 같이 선택해주세요

- 서비스 : Compute Engine API
- 측정항목 : NVDIA K80 GPUs, NVDIA P100 GPUs
- 위치 : asia-east1

<img src="https://www.dropbox.com/s/re5b9whkf5kcqpe/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-14%2001.00.47.png?raw=1">

이렇게 설정하면 모든 region별로 GPU 할당량을 볼 수 있습니다  
(저는 예전에 신청해서 Quota가 2로 되어있습니다)  


K80 GPU 왼쪽 체크박스에 체크한 후, 할당량 수정을 눌러주세요  
그리고 신상정보를 입력한 후, 요청 설명을 작성합니다

저는 "딥러닝을 공부하고 있고, 데이터를 활용해 훈련 모델을 만들고 싶다"라고 영어로 작성했습니다!  

24시간 이내로 메일로 할당량 증가 요청이 허가되었다는 메일이 옵니다!

## Instance 생성
---

Compute Engine - VM 인스턴스 - 인스턴스 만들기 클릭

<img src="https://www.dropbox.com/s/z3zdhi0n1cx3sp6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-14%2001.08.06.png?raw=1" width="400" height="600">

- 지역 : asia-east1, 영역 : asia-east1-a
- 머신 유형 : 사용하고 싶은 유형을 선택해주세요. 저는 cpu 8, ram 30, K80 GPU를 선택했습니다
- 부팅 디스크 : Ubuntu 16.04 LTS
- 방화벽에 HTTP/HTTPS 트래픽 허용 체크

## Instance 접속
---

ssh를 이용해도 되지만 여기선 gcloud를 사용해보겠습니다(편한 기능이 많습니다!!)  
gcloud가 설치되어 있다면, 터미널에서 아래와 같은 명령어를 입력해주세요!


```
gcloud compute --project <project_id> ssh --zone <region> <instance name>

// 예시
gcloud compute --project "project_101" ssh --zone "asia-east1-a" "gpu"
```

접속 후 locale 설정

```
sudo apt-get install language-pack-ko
sudo locale-gen ko_KR.UTF-8
```

pip3 설치

```
sudo apt-get update
sudo apt-get install python3-pip -y
```

## CUDA 설치
---

```
curl -O http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64/cuda-repo-ubuntu1604_8.0.61-1_amd64.deb
sudo dpkg -i ./cuda-repo-ubuntu1604_8.0.61-1_amd64.deb
sudo apt-get update
sudo apt-get install cuda-9-0
```

```nvidia-smi```를 입력해 출력이 정상적으로 되는지 확인해주세요!

```cat /usr/local/cuda/version.txt```하면 cuda의 version이 출력됩니다

## cuDNN 설치
---

```
sudo sh -c 'echo "deb http://developer.download.nvidia.com/compute/machine-learning/repos/ubuntu1604/x86_64 /" >> /etc/apt/sources.list.d/cuda.list'
cat /etc/apt/sources.list.d/cuda.list
>>> deb http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64 /
>>> deb http://developer.download.nvidia.com/compute/machine-learning/repos/ubuntu1604/x86_64 /
sudo apt-get update

sudo apt-get install libcudnn7-dev
```

## Tensorflow, Pytorch, Keras 설치
---

- Tensorflow

	```
	sudo pip3 install tensorflow-gpu
	```

- Pytorch

	```
	sudo pip3 install http://download.pytorch.org/whl/cu90/torch-0.4.0-cp35-cp35m-linux_x86_64.whl 
	sudo pip3 install torchvision
	```
- Keras

	```
	sudo pip3 install keras
	```

## Jupyter 및 기타 라이브러리 설치
--- 
	
아래와 같은 라이브러리를 설치합니다!

```
sudo pip3 install jupyter sklearn matplotlib seaborn pandas
```

jupyter config를 생성합니다

```
jupyter notebook --generate-config
>>> Writing default config to: /home/~~~/.jupyter/jupyter_notebook_config.py
```

notebook에서 사용할 비밀번호를 생성하기 위해 터미널에서 ```ipython``` 실행

```
from IPython.lib import passwd; passwd()
```

위 명령어 이후에 비밀번호를 입력합니다. 그리고 Out[1]에 나오는 해시값을 복사합니다. 이제 아까 생성된 jupyter config 파일을 수정하겠습니다

```
vi /home/byeon/.jupyter/jupyter_notebook_config.py
```

```
// 아래와 같은 내용 추가

c = get_config()
c.NotebookApp.ip = '*'
c.NotebookApp.open_browser = False
c.NotebookApp.password = '<해시값>'
```

## 방화벽 Port 열기
---

메뉴 - VPC 네트워크 - 방화벽 규칙 - 방화벽 규칙 만들기 선택

<img src="https://www.dropbox.com/s/emboyqppnrhwuw6/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-14%2002.59.52.png?raw=1" width="400" height="600">

네트워크 태그에 gpu를 가지고있는 인스턴스의 8888 포트만 엽니다  
이제 다시 Compute Engine - 아까 생성한 인스턴스를 클릭해주세요!  

(인스턴스가 켜있으면 종료하신 후) 인스턴스 수정 - 네트워크 태그에 gpu를 추가해주세요!

\+ VPC 네트워크 - 외부 IP 주소 - 임시를 고정으로 설정

## Jupyter notebook 띄우기
---

- nohup
	```
	mkdir notebooks
	cd notebooks
	nohup jupyter notebook > ~/notebook.log &
	``` 

- screen
	```
	screen -dmS jupyter
	screen -r jupyter
	jupyter notebook
	// CTRL+A,D
	``` 

## startup-script
---

저는 원래 screen으로 띄우는 방식을 선호했는데, ```인스턴스 시작 -> 인스턴스 접속 -> jupyter notebook```을 매번 입력하는 것이 귀찮네요. 인스턴스가 시작될 때마다 특정 스크립트가 실행되도록 하겠습니다

[Service](https://gist.github.com/whophil/5a2eab328d2f8c16bb31c9ceaf23164f)로 실행하는 방법, cron을 사용하는 방법 등 다양하게 있지만, GCP에서 제공하는 [startup-script](https://cloud.google.com/compute/docs/startupscript)를 사용해보겠습니다  

우선 VM 인스턴스를 클릭해주세요. 만약 인스턴스가 실행되고 있다면 종료를 해주세요!(GPU 머신은 종료를 해야 설정값을 수정할 수 있습니다)


VM 인스턴스 세부정보에서 "수정"을 클릭해주세요

하단에 맞춤 메타데이터 아래에 다음과 같은 값을 넣어주세요!
byeon을 여러분들이 사용하는 유저 이름으로 바꿔주세요

<img src="https://www.dropbox.com/s/iikt8b8pz6k7uvk/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202018-06-14%2010.34.43.png?raw=1" width="400" height="300">

```
key : startup-script
value :

#! /bin/bash
echo "start jupyter notebook"
cd /home/byeon/workspace
nohup jupyter notebook --config /home/byeon/.jupyter/jupyter_notebook_config.py --allow-root >> ./logs.txt &
```

startup-script는 root 권한으로 실행되기 때문에 ```--allow-root```를 추가했고, nohup으로 노트북을 실행했습니다

저장을 눌러주시고 인스턴스를 실행해주세요!

(startup-script가 root로 실행되서 이런 방식을 사용했습니다. 위에서 sudo pip3 install library를 한 이유도 root로 실행되기 때문입니다. 유저 이름으로 스크립트를 실행하는 방법을 아는 분은 댓글 부탁드립니다! 추후 이 부분은 업데이트할 예정입니다!)

만약 인스턴스 실행한 후, 노트북으로 연결이 안된다면 아래와 같은 방법으로 디버깅할 수 있습니다

인스턴스에 접속한 후, 아래와 같은 명령어 입력

```
sudo google_metadata_script_runner --script-type startup
sudo journalctl -u google-startup-scripts.service
```

이제 인스턴스를 키면 자동으로 노트북을 실행해줍니다!


---

### Reference
- [Using a GPU & TensorFlow on Google Cloud Platform](https://medium.com/google-cloud/using-a-gpu-tensorflow-on-google-cloud-platform-1a2458f42b0) 
- [Set up Anaconda + IPython + Tensorflow + Julia on a Google Compute Engine VM](https://haroldsoh.com/2016/04/28/set-up-anaconda-ipython-tensorflow-julia-on-a-google-compute-engine-vm/)
- [Google Document : startup-script](https://cloud.google.com/compute/docs/startupscript)
- [CUDA 설치 우분투 환경](https://hiseon.me/2018/03/11/cuda-install/)