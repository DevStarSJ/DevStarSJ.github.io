---
layout: post
title:  "Bash Tab 자동 완성시 대소문자 설정 방법"
subtitle:   "Bash Tab 자동 완성시 대소문자 설정"
categories: development
tags: linux
comments: true
---

안녕하세요! 오늘은 Bash에서 ```Tab``` 자동 완성 기능에 대해 설명드리려고 합니다. 리눅스 터미널에서 Tab 자동완성 기능(tab-auto-complete)은 매우 유용합니다!!

설정을 하지 않았을 경우 대소문자를 구분합니다. 예를 들면 ```Workspace```에 들어가기 위해선
```cd wor```에서 탭을 누르는 경우엔 반응하지 않고, ```cd Wor``` 에서 탭을 눌러야만 자동 완성이 됩니다

이런 상황이 매우 불편하기 때문에 설정을 on으로 시켜줍니다!

특정 계정에서만 이 설정을 유지하고 싶다면 ```~/.inputrc```에 설정하고, 모든 계정에 설정하고 싶으면 ```/etc/inputrc``` 에 설정해주면 됩니다

```
sudo vi /etc/inputrc

텍스트 파일에 아래와 같은 문구 추가
set completion-ignore-case on

Esc + :wq! 를 누르고 저장하며 빠져나오기
```

설정한 후, 터미널을 재시작 해주면 정상 작동합니다!