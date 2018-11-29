---
layout: post
title:  "리눅스 시스템 정보 확인하기"
subtitle:   "리눅스 시스템 정보 확인하기"
categories: development
tags: linux
comments: true
---

리눅스 시스템 정보(CPU, 메모리, 디스크, 네트워크 카드 등)를 확인하는 명령어에 대해 작성한 글입니다

## 커널 정보 확인하기
- ```uname -a```

```
>>> Linux instance-1 4.13.0-1019-gcp #23-Ubuntu SMP Thu May 31 16:13:34 UTC 2018 x86_64 x86_64 x86_64 GNU/Linux
```

- 위 서버의 커널은 4.13.0-1019-gc 버전을 사용하며 x86 계열의 64비트 운영 체제를 사용하고 있으며, 이름은 instance-1입니다
- ```dmesg``` 
	- 커널의 디버그 메세지, 커널이 부팅할 떄 나오믐 메세지와 운영 중에 발생하는 메세지 출력
	- 커널이 메모리를 인식하는 과정, 하드웨어를 인식하고 드라이버 올리는 과정 등을 알 수 있음


## CPU 정보 확인하기
- ```dmidecode -t bios``` 
	- 특정 BIOS 버전에 문제가 있다는 경우, 버전을 확인하기 위해 사용 
- ```dmidecode -t system``` : 시스템 모델명 제공
- ```dmidecode -t processor``` 
- ```cat /proc/cpuinfo```
- ```lscpu``` : NUMA 정보도 제공
- ``` dmesg | grep CPU```

## 메모리 정보 확인하기
- ```dmidecode -t memory```
	- Memory Device가 실제로 시스템에 꽂혀있는 메모리
- ```cat /proc/meminfo```
- ```dmesg | grep momory``` 

## 디스크 정보 확인하기
- ```df -h```

```
>>> Filesystem      Size  Used Avail Use% Mounted on
udev            835M     0  835M   0% /dev
tmpfs           169M  2.7M  167M   2% /run
/dev/sda1       9.7G  1.2G  8.6G  12% /
tmpfs           845M     0  845M   0% /dev/shm
tmpfs           5.0M     0  5.0M   0% /run/lock
tmpfs           845M     0  845M   0% /sys/fs/cgroup
tmpfs           169M     0  169M   0% /run/user/1001
```

- 각 파티션은 /, /dev, /run, /dev/shm, /run/lock, /sys/fs/cgroup, /run/user/1001로 마운트되어 있음


## 네트워크 정보 확인하기
- ```lspci | grep -i ether```
- ```ethtool -g eth0```
	- ```-g``` 옵션은 Ring Buffer 크기를 확인
	- ```-G``` 옵션은 값을 설정할 때 사용
	- ```-i``` 옵션은 커널 드라이버 정보 표시

