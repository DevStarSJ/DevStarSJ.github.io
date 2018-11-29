---
layout: post
title:  "Domain Name System(DNS)의 이해"
subtitle: "Domain Name System(DNS)의 이해"
categories: development
tags: web
comments: true
---
생활코딩 [WEB2 - Domain Name System](https://opentutorials.org/course/3276)을 수강하며 내용을 정리한 글입니다. 이 수업을 들으니 제가 얼핏 알았던 개념을 확실하게 알 수 있었고, 대표적인 면접 문제인 브라우저의 URL 입력창에 www.naver.com을 입력하면 무슨 일이 벌어질까요?란 질문을 왜 하는지 알 것 같습니다(다른 네트워크 개념과 프론트 개념도 알아야 하겠지만!)


## 수업소개
도메인 이름을 자신의 서버 컴퓨터에 부여하는 방법을 알려주는 수업

## 개론
- Host : 인터넷에 연결된 컴퓨터 한대 한대
- IP Address : host끼리 통신을 하기 위해 필요한 주소
- IP 주소를 기억하는 것이 어렵기 때문에 Jon Postel과 Paul Mockapetris에 의해서 DNS(Domain Name System)이 나왔습니다
	- DNS Server : 수많은 IP 주소와 도메인이 저장되어 있습니다
	- 웹에서 www.naver.com을 입력하면 DNS Server에 www.naver.com의 IP 주소를 알려준 후, 그 IP 주소를 토대로 접속하는 것입니다

	
## IP 주소와 Hosts의 개념
2대의 컴퓨터가 인터넷 통신을 위해 반드시 필요한 것은 IP 주소입니다. 비단 컴퓨터뿐만이 아닌, 인터넷이 연결된 것은 Host라고 부릅니다.  
단, 모든 IP 주소를 기억하는 일은 너무 어렵습니다. 이것을 해결하기 위해 운영체제마자 ```hosts```라는 파일이 존재합니다. 이 파일에 IP와 도메인 이름을 저장해두면, 도메인 이름을 통해 다른 host에 접근할 수 있습니다(DNS을 사용하지 않고도!)

## Hosts 파일을 설정하는 방법
[Hosts 위키피디아](https://en.wikipedia.org/wiki/Hosts_(file))의 Location in file system에 OS별 경로가 나와있습니다  
맥 OS의 경우 ```/etc/hosts```에 있습니다

```
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost
IP 주소		   도메인 이름
```

## 도메인 이름과 보안
hosts 파일을 변조해서 평소에 사용하던 도메인 이름을 입력할 경우, 기존과 다른 사이트로 접근하게 할 수 있습니다. 이런 hosts 파일은 보안에 취약하기 때문에 변조가 되지 않도록 해줘야 합니다! 이 파일의 보완을 위해 백신을 사용하는 것을 추천합니다  

자주 일어나는 사례는 은행 사이트를 동일하게 만들어서 개인 정보를 입력하도록 하는 일입니다. 이런 일을 fishing이라고 합니다. 이것을 확인하기 위해 사이트 주소 앞을 보면 ```https```로 시작하는 사이트는 보안이 안전하며, 변조된 것인지 알 수 있습니다(http는 안전하지 않습니다)

## DNS의 태동
### before DNS
Stanford Research Institute에서 전 세계의 hosts 파일을 관리했습니다. 위 기관의 hosts 파일을 덮어쓰기한 후, 내 컴퓨터에서 도메인 이름으로 접속했습니다.   
처음엔 이 방식도 정말 유익했지만, 인터넷이 커지며 점점 문제점이 발견되었습니다. hosts 파일을 다운로드하지 않으면 추가된 호스트 이름을 사용할 수 없으며 SRI에서 수작업으로 IP와 도메인 이름을 갱신해서 시간과 비용이 들었습니다.

### After DNS
<img src="https://s3-ap-northeast-2.amazonaws.com/opentutorials-user-file/module/3421/8340.jpeg?raw=1">

DNS에게 이 IP는 ~라는 Domain 이름을 갖고 싶습니다!라고 요청하면(자동화되어 있습니다) DNS에 갱신된 내용이 저장됩니다  
그 후, 여러분들의 컴퓨터에서 와이파이 혹은 인터넷이 연결되면 DNS Server에 있는 IP 주소가 DHCP를 통해 셋팅됩니다.  
웹 브라우저에서 도메인 이름을 입력하면 먼저 로컬의 hosts 파일에서 찾은 후, 없다면 DNS Server에 Domain 이름의 IP를 요청하고 받습니다. 


## Public DNS의 사용
DNS Server의 IP나 Domain을 알고 있어야 Server에 접근할 수 있습니다. 이런 정보는 ISP(Internet Service Provider : SK 브로드밴드, SKT 등)가 자동으로 셋팅해주고 있습니다

그러나 경우에 따라 통신사가 지정한 DNS Server를 사용하고 싶지 않을 경우가 있습니다(속도가 느리거나, 보안, Privacy 이슈로)

public dns server를 검색하면 다양한 곳에서 만든 DNS Server를 볼 수 있습니다. 

### Mac
시스템 환경설정 - 네트워크 - 고급 - DNS를 누르면 현재 사용하는 DNS Server를 볼 수 있습니다. 여기에서 DNS Server 설정

### Windows
Network and Sharing Center - Connections 옆 글자(WIFI 혹은 Ethernet) - Properties(속성) - Internal Protocal Version - Properties - Use the following DNS server address에 설정


## DNS의 내부 원리
### 도메인 이름의 구조
여러분들이 서버를 운영하는 생산자가 된다면, 이 내용을 알면 덜 혼란스럽고 반드시 도움이 될 것입니다! :)  

### DNS Server
DNS Server는 IP 주소와 Domain 이름을 **기억**하는 기능과 Client가 이름을 물어보면 IP를 **알려주는** 기능을 갖고 있습니다. 수천대의 서버가 같이 협력하고 있습니다.  

<img src="https://s3-ap-northeast-2.amazonaws.com/opentutorials-user-file/module/3421/8338.jpeg?raw=1">

맨 뒤에는 사실 ```.```이 생략되어 있습니다.  
각각의 부분들은 부분들을 담당하는 독자적인 Server Computer가 존재합니다.  
Root는 Top-level을 담당하는 Server의 목록과 IP를 알고 있으며, Top-level은 Second-level, Second-level은 sub의 목록과 IP를 알고 있습니다(상위 목록이 직속 하위 목록을 알고 있음)

최초 root 네임서버의 IP 주소에게 blog.example.com을 물어보면 .com을 담당하는 Top-level을 알려주고, Top-level은 example.com을 담당하는 Second-level을 알려주고, Second-level은 blog.example.com 담당하는 sub DNS Server에게 물어보고, sub가 해당 IP 주소를 알려줍니다! 계층적인 구조를 가지고 있습니다


## 도메인 이름 등록 과정과 원리
### DNS register
<img src="https://s3-ap-northeast-2.amazonaws.com/opentutorials-user-file/module/3421/8343.jpeg?raw=1">

ICANN - Registry 등록소 - Registrar 등록대행자 - Registrant 등록자 관계  

A, NS는 Record Type을 뜻합니다. A는 최종적인 IP 주소이며 NS는 Name Server를 뜻합니다  

## nslookup 사용법
```nslookup```은 도메인 이름에 대한 정보를 조회할 때 사용하는 도구입니다.  dig라는 도구도 좋지만, 윈도우에선 제공하고 있지 않습니다

Terminal에서 아래와 같이 입력합니다

```
nslookup example.com
>>>
Server:		168.126.63.1
Address:	168.126.63.1#53

Non-authoritative answer:
Name:	example.com
Address: 93.184.216.34
```
위 명령어는 ```nslookup -type=a example.com```와 동일한 명령어입니다  
처음 나오는 Address는 컴퓨터에 연결된 DNS Server IP가 나타납니다.  
Non-authoritative answer는 cache가 응답한 경우 발생한 것입니다. 직접 물어보고 싶다면 example.com의 name server가 누군지 알아내야 합니다  

```
nslookup -type=ns example.com
>>>
Server:		168.126.63.1
Address:	168.126.63.1#53

Non-authoritative answer:
example.com	nameserver = b.iana-servers.net.
example.com	nameserver = a.iana-servers.net.

Authoritative answers can be found from:
a.iana-servers.net	internet address = 199.43.135.53
b.iana-servers.net	internet address = 199.43.133.53
a.iana-servers.net	has AAAA address 2001:500:8f::53
b.iana-servers.net	has AAAA address 2001:500:8d::53
```

위에서 보면 nameserver가 나타납니다. 2개의 서버가 운영되고 있습니다. nameserver 이름을 알고난 후, 아래와 입력하면 직접 요청할 수 있습니다

```
nslookup example.com a.iana-servers.net
>>>
Server:		a.iana-servers.net
Address:	199.43.135.53#53

Name:	example.com
Address: 93.184.216.34
```


## 나의 도메인 이름 장만하기
등록대행자를 통해 등록소에게 등록해야 합니다!  
등록대행자는 다양하게 존재하며, 이번 강의에선 freenom.com을 사용할 것입니다. 1년간 무료로 사용할 수 있도록 제공하고 있습니다

도메인을 구입할 땐 만료일이 언젠지 반드시 적어두세요! 까먹으면 큰일이 날 수도 있어요!  
freenom에서 name server도 제공해줍니다! 그 이후로는 그냥 클릭만 하면 쉽게 설정할 수 있습니다 :)


## DNS record와 CNAME 레코드의 이해
도메인 이름에 대한 정보 한건 한건을 DNS Record라고 합니다. DNS Record 타입을 살펴보고, IP 주소가 아닌 도메인 이름에 대한 별명을 지정하는 방법으로서 CNAME Record 타입에 대해 알아보겠습니다!

> 검색 포탈에서 dns recode로 검색하면 Type별 설명을 볼 수 있습니다! 

CNAME은 도메인의 별명을 지정!  
freenom에선 add record에 CNAME을 설정할 수 있습니다

## Github pages에 도메인 연결하기
내가 서버를 운영하지 않고 남이 사용하는 서버를 사용하는 경우 도메인을 연결하는 방법에 대해 알아보겠습니다!  

Github의 경우 settings - custom domain에 설정하면 됩니다!! 추가적으로 http를 사용하는 경우, https를 사용하는 경우 등의 내용은 Github 공식 문서에 잘 나와 있습니다. 

