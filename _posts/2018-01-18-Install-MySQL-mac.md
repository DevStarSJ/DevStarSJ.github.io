---
layout: post
title:  "맥에서 MySQL 설치하기"
subtitle:   "mysql install mac"
categories: development
tags: sql
comments: true
---
맥에서 MySQL 설치하기, mysql Install MAC에 대한 포스팅입니다. 리눅스를 많이 사용하지만, 로컬 테스트용을 위해 맥에도 MySQL을 설치해야 합니다. 계속 참조할 것 같아 문서로 남깁니다

## Install MySQL Mac
dmg 파일을 받는 방법, brew 설치, 직접 빌드하는 방법 등 다양하게 있지만 가장 간편하고 자동으로 환경설정을 해주는 ```brew```를 사용해 설치하겠습니다

- mysql 최신 버전 설치  
	```
	brew install mysql
	```

- mysql 시작  
	```
	mysql.server start
	```

- root 비밀번호 설정  
	```
	mysql_secure_installation
	```
	
	- ```Would you like to setup VALIDATE PASSWORD plugin?``` : 비밀번호 가이드로 비밀번호 설정을 한다면 ```yes```  
	- ```Remove anonymous users?``` : 익명사용자를 삭제할지? ```yes```하면 접속시 ```-u``` 옵션을 반드시 명시해야 합니다  
	- ```Disallow root login remotely?``` : localhost외 ip에서 root 아이디로 접속가능을 허락할지? ```yes```하면 원격접속 불가능하니 ```no```  
	- ```Remove test database and access to it?``` : mysql에 기본적으로 설치되는 test 디비를 삭제할지? 저는 ```yes```
	- ```Reload privilege tables now?``` : 권한을 변경했을 경우 ```yes```
- charset 설정  
	- ```mysql -uroot -p```로 로그인한 후, ```status;``` 입력해서 설정 확인
	- latin이 있다면 ```vi /etc/my.cnf``` 또는 ```vi /etc/mysql/my.cnf``` 으로 수정
	
		```
		[client]
		default-character-set=utf8  
		[mysql]
		default-character-set=utf8  
		[mysqld]
		collation-server = utf8_unicode_ci
		init-connect='SET NAMES utf8'
		character-set-server = utf8
		```

- 데몬 실행  
	```brew services start mysql```
	
	
## MySQL 접속하기
- 터미널에서 ```mysql -u root -p```	을 통해 접속
- 특정 호스트에 접속되어 있다면 ```mysql --host=<HOST IP> -u root --password="PASSWORD"```을 사용해 접속! (LOAD DATA를 사용할 예정이라 저는 --local-infile=1을 추가해서 사용하는 편입니다

