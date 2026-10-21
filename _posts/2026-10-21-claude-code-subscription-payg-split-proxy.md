---
layout: post
title: "Claude Code, 구독은 Claude에만: 기본 모델은 OpenRouter 종량제로 돌리는 60줄 프록시"
subtitle: "ANTHROPIC_BASE_URL 하나가 모든 요청의 과금 경로를 정한다. 모델 이름으로 갈라 보내면 구독과 종량제를 섞어 쓸 수 있다"
description: "Claude Code에서 ANTHROPIC_BASE_URL을 게이트웨이로 두면 claude 모델 요청까지 개인 키 종량제로 과금된다. 모델 이름으로 라우팅하는 60줄 로컬 프록시로 claude-*는 구독, 나머지는 OpenRouter 종량제로 나눠 보내는 설정과 그 이유를 정리한다."
date: 2026-10-21 10:00:00 +0900
author: "Yun SeokJoon"
lang: ko
alt_url: "/ai/2026/10/21/claude-code-subscription-payg-split-proxy-en/"
header-img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80"
header-mask: 0.4
catalog: true
categories: ai
tags:
  - AI
  - Coding Agent
  - Claude Code
  - OpenRouter
  - LLM
  - DevOps
  - Cost Optimization
keywords: "Claude Code, ANTHROPIC_BASE_URL, OpenRouter, Claude 구독, LLM 게이트웨이, 종량제, 로컬 프록시, 모델 라우팅"
---

## 배경: 환경변수 하나가 과금 경로를 정한다

Claude Code는 API 요청을 보낼 때 `ANTHROPIC_BASE_URL`을 본다. 이 값이 비어 있으면 `api.anthropic.com`으로 가고, 값이 있으면 모든 요청이 그 주소로 간다. 문제는 **"모든"**이라는 단어다.

```zsh
# 흔한 설정: 게이트웨이로 전부 보낸다
export ANTHROPIC_BASE_URL=https://<게이트웨이 주소>
export ANTHROPIC_AUTH_TOKEN=<게이트웨이 개인 키>
export ANTHROPIC_MODEL=<저렴한 모델>
export ANTHROPIC_DEFAULT_OPUS_MODEL=<저렴한 모델>
export ANTHROPIC_DEFAULT_SONNET_MODEL=<저렴한 모델>
export ANTHROPIC_DEFAULT_HAIKU_MODEL=<저렴한 모델>
```

이 설정은 기본 모델을 저렴한 모델로 바꿔 두기 때문에 일상 작업은 싸게 돌아간다. 그래서 한동안은 이대로 충분했다. 빠진 게 하나 있었는데, **세션 안에서 `/model`로 다른 모델을 고르는 순간**이다.

| 하는 일 | 실제로 일어나는 일 |
| --- | --- |
| `ccg`로 세션 시작, 기본 모델 사용 | 게이트웨이 → 개인 키 종량제 |
| 세션 안에서 `/model`로 Claude 모델 선택 | 게이트웨이 → **개인 키 종량제** |
| 서브에이전트가 Claude 모델로 뜸 | 게이트웨이 → **개인 키 종량제** |
| 원래 의도 | Claude 모델은 **구독**으로 |

게이트웨이는 요청이 어디서 왔든 상관하지 않는다. 헤더에 실린 키가 무엇이든, 모델 이름이 무엇이든, 자기한테 온 요청은 자기 단가로 청구한다. Claude 모델은 단가가 높아서, 긴 세션 하나가 구독으로 처리됐을 때와 종량제로 처리됐을 때의 차이가 꽤 크게 벌어진다. 청구서를 보고 나서야 알게 되는 종류의 차이다.

## 원하는 그림: 모델 이름이 과금 경로를 정한다

원하는 규칙은 한 줄이다.

| 모델 이름 | 어디로 | 누구 돈으로 |
| --- | --- | --- |
| `claude-*` (fable, opus, sonnet, haiku) | `api.anthropic.com` | **구독** (정액) |
| 그 외 (기본값 `deepseek/...`) | `openrouter.ai` | **종량제** (개인 키) |

Claude Code는 요청 본문에 모델 이름을 넣어 보낸다. 그러니 그 이름만 읽어서 목적지를 고르면 된다. 이걸 하려면 Claude Code와 실제 API 사이에 뭔가가 하나 앉아 있어야 하고, 그게 이 글의 프록시다.

### 왜 이렇게 했나

설정을 소개하기 전에, 왜 이 방향을 골랐는지부터 적는다. 설정만 베끼면 다음에 뭐가 바뀌었을 때 판단을 못 한다.

**1. 정액과 단가는 섞어야 이득이다.** 구독은 이미 낸 돈이라 추가 호출 비용이 0에 가깝고, 종량제는 쓴 만큼 낸다. 그러면 비싸고 품질이 중요한 모델은 정액 쪽에, 대량으로 반복되는 작업은 단가가 싼 쪽에 두는 게 합리적이다. 반대로 두면 비싼 모델을 단가로 부르거나, 싼 모델을 굳이 정액 한도에서 깎는다.

**2. 실수 비용을 구조로 막는다.** "Claude 모델을 고르면 구독으로 나간다"를 사람이 매번 기억하는 대신, 경로 자체를 갈라 놓는다. 기억은 새어 나가지만 라우팅 규칙은 새어 나가지 않는다. [지난 글](/ai/2026/09/23/individual-as-a-team-llm-gateway/)에서 "규칙은 저장소에, 판단은 시스템에"라고 썼는데, 개인 노트북 수준에서 그 "시스템"이 이 프록시다.

**3. 기본값은 환경이 정해야 한다.** 세션마다 `/model`을 고르는 판단은 세션마다 흔들린다. 기본 모델을 `ccg` 함수에 박아 두면, 아무 생각 없이 시작한 세션도 의도한 과금 경로로 출발한다.

**4. 자격증명은 파일이 아니라 키체인에 둔다.** 종량제 키는 유출되면 바로 돈이 나가는 물건이다. `~/.zshrc`에 평문으로 두면 그 파일을 읽는 모든 프로세스와 모든 백업에 같이 실린다. 키체인에 넣고 필요할 때 읽으면, 셸 히스토리와 설정 파일에는 키가 남지 않는다.

### 왜 LiteLLM이 아니라 60줄 프록시인가

[앞선 글](/ai/2026/09/23/individual-as-a-team-llm-gateway/)에서는 LiteLLM을 게이트웨이로 썼다. 조직 단위에서는 그게 맞다. 여러 사람의 키, 쿼터, 감사 로그, 모델 카탈로그, 장애 대응이 필요하니까.

개인 노트북에서는 요구사항이 다르다. 필요한 건 "모델 이름이 `claude`로 시작하면 A로, 아니면 B로"라는 `if` 하나뿐이다. 이걸 위해 서비스 하나를 띄우고 설정 파일을 관리하고 의존성을 설치할 이유가 없다. 표준 라이브러리만 쓰는 60줄이면 충분하고, 그 60줄은 읽고 이해할 수 있는 크기다. 나중에 요구사항이 커지면 그때 LiteLLM으로 옮기면 된다.

## 준비: 키는 키체인에만 넣는다

macOS 기준으로 한 번만 하면 된다. 아래 `<본인의 OpenRouter API 키>` 자리에 실제 키를 넣되, **이 명령을 실행하는 순간 외에는 어디에도 적지 않는다.**

```zsh
# 키체인에 저장 (파일에 평문으로 두지 않는다)
security add-generic-password -U -a "$USER" -s openrouter-api-key -w '<본인의 OpenRouter API 키>'
```

`-s openrouter-api-key`는 이 항목을 찾을 때 쓰는 이름이다. `-U`는 같은 이름이 이미 있으면 갱신하라는 뜻이라, 키를 교체할 때도 같은 명령을 다시 쓰면 된다. 저장된 값은 다음처럼 꺼낼 수 있다.

```zsh
security find-generic-password -s openrouter-api-key -w   # 화면에 키가 출력된다. 조심할 것.
```

키를 바꿨다면 이미 떠 있는 프록시를 재시작해야 반영된다. 프록시는 시작할 때 키를 한 번 읽기 때문이다.

```zsh
pkill -f ccg-proxy
```

## 전체 스크립트

`~/.zshrc`에 붙여넣고 `exec zsh`로 셸을 다시 띄운다. 함수 이름은 `ccg`인데, 취향껏 바꿔도 된다.

```zsh
# ccg: 기본 모델은 OpenRouter(종량제), claude-* 모델만 구독.
#   Claude Code → 127.0.0.1:8765 프록시 → 모델 이름이 claude* 면 api.anthropic.com(구독 토큰 그대로),
#   그 외면 OpenRouter(키체인 openrouter-api-key 의 개인 키). 로그: ~/Library/Logs/ccg-proxy.log
#   키 교체: security add-generic-password -U -a "$USER" -s openrouter-api-key -w '<새 키>' && pkill -f ccg-proxy
ccg() {
  local port=8765
  local default_model="deepseek/deepseek-v4.1-flash-1017"
  local log="$HOME/Library/Logs/ccg-proxy.log"

  if ! lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
    local key
    key=$(security find-generic-password -s openrouter-api-key -w 2>/dev/null) || {
      echo "키체인에 openrouter-api-key 가 없습니다. 먼저 저장하세요." >&2
      return 1
    }
    CCG_KEY="$key" nohup python3 - ccg-proxy >"$log" 2>&1 <<'PY' &!
import http.client, json, os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ.pop("CCG_KEY")
UPSTREAM = {"anthropic": ("api.anthropic.com", ""), "openrouter": ("openrouter.ai", "/api")}
HOP = {"host", "connection", "content-length", "transfer-encoding", "keep-alive"}

class Proxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_HEAD(self):  # Claude Code 의 연결 확인용
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _forward(self):
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            model = json.loads(body or b"{}").get("model") or ""
        except ValueError:
            model = ""

        headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP}
        if model.startswith("claude"):
            host, prefix = UPSTREAM["anthropic"]
        else:
            host, prefix = UPSTREAM["openrouter"]
            for h in ("authorization", "x-api-key", "anthropic-beta",
                      "anthropic-version", "anthropic-dangerous-direct-browser-access"):
                headers.pop(h, None)
            headers["Authorization"] = "Bearer " + KEY
            headers["Content-Type"] = "application/json"

        conn = http.client.HTTPSConnection(host, timeout=600)
        conn.request(self.command, prefix + self.path, body=body or None, headers=headers)
        resp = conn.getresponse()
        self.log_message("%s %s %s -> %s %d", self.command, self.path, model or "-", host, resp.status)

        self.send_response(resp.status)
        for k, v in resp.getheaders():
            if k.lower() not in HOP:
                self.send_header(k, v)
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()
        while chunk := resp.read1(65536):  # SSE 스트리밍을 그대로 흘려보낸다
            self.wfile.write(b"%x\r\n%s\r\n" % (len(chunk), chunk))
            self.wfile.flush()
        self.wfile.write(b"0\r\n\r\n")
        conn.close()

    do_GET = do_POST = do_PUT = do_DELETE = _forward

ThreadingHTTPServer(("127.0.0.1", 8765), Proxy).serve_forever()
PY
    sleep 0.5
  fi

  env -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_API_KEY \
    ANTHROPIC_BASE_URL="http://127.0.0.1:$port" \
    ANTHROPIC_MODEL="$default_model" \
    ANTHROPIC_DEFAULT_OPUS_MODEL="$default_model" \
    ANTHROPIC_DEFAULT_SONNET_MODEL="$default_model" \
    ANTHROPIC_DEFAULT_HAIKU_MODEL="$default_model" \
    claude --dangerously-skip-permissions "$@"
}
```

## 블록별로 다시 읽기

한 줄씩 설명할 필요는 없고, 의미 있는 덩어리마다 "이건 무슨 일을 하는가"만 짚는다.

### ① 함수 머리 — 설정값을 한곳에 모은다

```zsh
ccg() {
  local port=8765
  local default_model="deepseek/deepseek-v4.1-flash-1017"
  local log="$HOME/Library/Logs/ccg-proxy.log"
```

포트, 기본 모델, 로그 경로를 함수 맨 위에 몰아 둔다. 나중에 모델을 바꾸거나 포트가 충돌할 때 여기만 보면 된다. 모델 ID는 OpenRouter 모델 목록에 있는 문자열을 그대로 써야 한다. `local`을 붙인 이유는 이 값들이 셸 전역을 오염시키지 않게 하려는 것이다.

### ② 프록시 기동 여부 확인 — 세션마다 새로 띄우지 않는다

```zsh
  if ! lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
```

8765 포트에 이미 리스너가 있으면 그대로 쓴다. 터미널을 여러 개 띄우고 각각 `ccg`를 실행해도 프록시는 하나만 뜬다. 매번 프로세스를 새로 띄우면 포트 충돌이 나고, 좀비 프로세스가 쌓인다. `&!`로 백그라운드에 던지고 셸이 끝나도 살아 있게 하는데, 그래서 "이미 떠 있나"를 먼저 보는 게 필요하다.

### ③ 키 읽기 — 없으면 시작하지 않는다

```zsh
    local key
    key=$(security find-generic-password -s openrouter-api-key -w 2>/dev/null) || {
      echo "키체인에 openrouter-api-key 가 없습니다. 먼저 저장하세요." >&2
      return 1
    }
```

키체인에서 키를 읽어 지역 변수에 담는다. 실패하면 에러를 띄우고 함수를 끝낸다. 키 없이 프록시를 띄우면 모든 요청이 401로 죽는데, 그때 원인을 찾는 데 걸리는 시간이 이 세 줄보다 훨씬 비싸다. 키는 `$key`에만 있고 화면이나 로그로 나가지 않는다.

### ④ 프록시 본체 주입 — 히어독으로 stdin에 넘긴다

```zsh
    CCG_KEY="$key" nohup python3 - ccg-proxy >"$log" 2>&1 <<'PY' &!
```

`python3 -`는 "스크립트를 표준입력에서 읽어라"는 뜻이고, 바로 뒤의 히어독(`<<'PY' ... PY`)이 그 입력이다. 그래서 파이썬 파일을 따로 만들지 않아도 된다. `nohup`은 셸이 종료돼도 살아 있게, `&!`는 zsh에서 "백그라운드로 보내고 잡 목록에서 떼어낸다"는 뜻이다. 키는 환경변수 `CCG_KEY`로만 넘기고, 파이썬 쪽에서 `os.environ.pop`으로 즉시 회수해 프로세스 환경에 남기지 않는다.

### ⑤ 모델 이름 읽기 — 라우팅의 유일한 판단 근거

```python
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            model = json.loads(body or b"{}").get("model") or ""
        except ValueError:
            model = ""
```

요청 본문 전체를 읽어 JSON에서 `model` 필드만 꺼낸다. 본문이 JSON이 아니거나 비어 있으면 빈 문자열로 두고, 그 경우는 "claude가 아님"으로 처리된다. 여기서 모델 이름을 판별하는 것 외에는 아무것도 해석하지 않는다. 프록시가 요청 내용을 이해하기 시작하면 유지보수 대상이 급격히 늘어난다.

### ⑥ Claude 분기 — 구독 토큰을 그대로 흘려보낸다

```python
        if model.startswith("claude"):
            host, prefix = UPSTREAM["anthropic"]
```

`claude`로 시작하는 모델은 `api.anthropic.com`으로 간다. 여기서 중요한 건 **헤더를 건드리지 않는다**는 점이다. Claude Code가 실어 보낸 인증 헤더가 곧 구독 로그인 토큰이고, 그걸 그대로 넘겨야 구독으로 차감된다. 이 분기에는 개인 키가 관여하지 않는다.

### ⑦ 그 외 분기 — 인증 헤더를 갈아 끼운다

```python
        else:
            host, prefix = UPSTREAM["openrouter"]
            for h in ("authorization", "x-api-key", "anthropic-beta",
                      "anthropic-version", "anthropic-dangerous-direct-browser-access"):
                headers.pop(h, None)
            headers["Authorization"] = "Bearer " + KEY
            headers["Content-Type"] = "application/json"
```

구독용 인증 헤더는 삭제하고, 키체인에서 읽은 개인 키로 바꿔 단다. 이게 "종량제로 보낸다"의 실체다. Claude 전용 헤더(`anthropic-beta`, `anthropic-version`)도 같이 지운다. OpenRouter가 모르는 헤더를 받고 400을 돌려주는 경우가 있어서, 경로별로 필요한 헤더만 남기는 게 안전하다. `prefix`가 `/api`인 이유는 OpenRouter의 Anthropic 호환 엔드포인트가 `/api/v1/messages`이기 때문이다. Claude Code는 `/v1/messages`로 보내니 앞에 `/api`를 붙여야 한다.

### ⑧ 스트리밍 릴레이 — 응답을 모으지 않고 흘려보낸다

```python
        conn = http.client.HTTPSConnection(host, timeout=600)
        conn.request(self.command, prefix + self.path, body=body or None, headers=headers)
        resp = conn.getresponse()
        self.log_message("%s %s %s -> %s %d", self.command, self.path, model or "-", host, resp.status)
```

업스트림에 요청을 보내고 응답 상태를 로그에 남긴다. 이 한 줄이 "어디로 나갔나"를 확인하는 유일한 창구다. 타임아웃 600초는 긴 추론 응답을 기다리기 위한 값이다.

```python
        self.send_response(resp.status)
        for k, v in resp.getheaders():
            if k.lower() not in HOP:
                self.send_header(k, v)
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()
        while chunk := resp.read1(65536):
            self.wfile.write(b"%x\r\n%s\r\n" % (len(chunk), chunk))
            self.wfile.flush()
```

응답 헤더를 그대로 넘기고, 본문은 64KB씩 읽어 chunked 형식으로 즉시 전달한다. Claude Code는 응답을 SSE로 스트리밍해 화면에 타이핑하듯 출력하는데, 프록시가 응답을 끝까지 모았다가 보내면 그 체감이 사라지고 긴 응답에서 타임아웃이 난다. `read1`을 쓴 이유가 그것으로, 버퍼가 차기를 기다리지 않고 도착한 만큼 바로 넘긴다. `Connection`, `Content-Length` 같은 홉 단위 헤더(`HOP`)는 프록시가 직접 관리해야 하므로 걸러낸다.

### ⑨ Claude 실행 — 환경을 정리하고 넘긴다

```zsh
  env -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_API_KEY \
    ANTHROPIC_BASE_URL="http://127.0.0.1:$port" \
    ANTHROPIC_MODEL="$default_model" \
    ...
    claude --dangerously-skip-permissions "$@"
```

`env -u`는 변수를 **지우고** 실행하라는 뜻이다. 기존 셸에 `ANTHROPIC_AUTH_TOKEN`이나 `ANTHROPIC_API_KEY`가 export돼 있으면 Claude Code가 구독 로그인 대신 그 키를 쓴다. 그러면 ⑥번 분기가 아무 의미가 없어진다. 지우고 나서 `ANTHROPIC_BASE_URL`만 로컬 프록시로 지정한다. `ANTHROPIC_DEFAULT_*_MODEL` 세 개를 모두 같은 값으로 둔 이유는, Claude Code가 용도별로 다른 기본 모델을 쓰기 때문이다. 하나라도 남겨 두면 그 용도만 조용히 다른 곳으로 샌다. 마지막 `"$@"`는 `ccg --resume`, `ccg -c` 같은 인자를 그대로 `claude`에 넘긴다.

## 사용

```zsh
ccg                    # 기본 모델(OpenRouter 종량제)로 세션 시작
ccg --resume           # 인자는 그대로 claude 에 전달된다
ccg -p "이 함수 설명해줘"   # 원샷 실행도 같은 규칙을 따른다
```

세션 안에서 Claude 모델이 필요하면 `/model`로 고른다. 그러면 다음 요청부터 `claude-*` 모델명이 실려 나가고, 프록시가 `api.anthropic.com`으로 돌린다.

어디로 나갔는지는 로그에서 확인한다.

```zsh
tail -f ~/Library/Logs/ccg-proxy.log
# POST /v1/messages deepseek/deepseek-v4.1-flash-1017 -> openrouter.ai 200
# POST /v1/messages claude-sonnet-5-5 -> api.anthropic.com 200
```

## 주의할 점

- **구독 로그인이 전제다.** Claude Code가 `/login`으로 구독에 로그인돼 있어야 `claude-*` 요청이 성공한다. 로그인돼 있지 않으면 그 분기는 401로 끝난다.
- **구독 한도를 다 쓰면 조용히 넘어가지 않는다.** `claude-*` 호출이 실패하고 끝난다. 개인 키로 자동 폴백하지 않는데, 이건 의도한 동작이다. 폴백이 있으면 한도가 찼다는 사실을 모른 채로 돈이 나간다. 실패하는 편이 낫다.
- **`--dangerously-skip-permissions`가 함수에 들어 있다.** 개인 환경에서 프롬프트 왕복을 줄이려고 넣은 값이다. 원치 않으면 그 플래그만 빼면 된다.
- **키 교체 후에는 프록시를 재시작한다.** `pkill -f ccg-proxy`를 잊으면 이전 키로 계속 요청한다.
- **프록시는 127.0.0.1에만 열린다.** 외부에서 접근할 수는 없지만, 같은 기계의 다른 프로세스는 이 포트를 쓸 수 있다. 개인 노트북 기준으로 감수하는 범위다.
- **모델 ID는 OpenRouter 카탈로그를 따른다.** `default_model` 값을 바꿀 때는 OpenRouter 모델 목록에 있는 문자열을 그대로 넣어야 한다. 오타가 나면 404가 아니라 엉뚱한 모델명 에러가 돌아온다.

## 곁다리: 아무것도 안 했는데 구독 사용량이 줄어든다면

이 설정과 별개로, 세션을 열어 두지 않았는데 구독 사용량이 줄어드는 경우가 있다. 필자의 경우 범인은 `claude-mem` 플러그인이었다. 이 플러그인은 대화를 요약해 저장하려고 **백그라운드 요약 세션**을 띄우고, 그 세션은 구독을 쓴다. 기본 설정이 sonnet이면 요약 한 번에 드는 양이 꽤 크다.

```json
// ~/.claude-mem/settings.json
{ "CLAUDE_MEM_MODEL": "claude-haiku-5-5" }
```

요약 품질이 크게 중요하지 않은 작업이라면 haiku로 내리는 것만으로 사용량이 눈에 띄게 줄어든다. 라우팅으로 아낀 돈이 백그라운드 세션에서 새는 걸 막는 것도 같은 문제의 다른 얼굴이다.

## 정리

- 게이트웨이 하나로 모든 요청을 보내면 **모델 선택과 무관하게** 그 게이트웨이 단가로 과금된다.
- 그래서 요청을 한 번 갈라 놓는다. `claude-*`는 구독, 나머지는 종량제.
- 조직 규모면 LiteLLM이 맞지만, 개인 규모에서는 `if` 하나와 60줄이면 충분하다.
- 기본값은 셸 함수에, 자격증명은 키체인에 둔다. 기억과 설정 파일에 맡기지 않는다.
- 무엇이 어디로 나갔는지는 로그 한 줄로 확인한다. 확인할 수 없는 최적화는 최적화가 아니다.

[지난 글](/ai/2026/09/23/individual-as-a-team-llm-gateway/)에서 판단을 시스템으로 옮기자고 했던 이야기의, 개인 노트북 버전이다. [AI가 싸게 만든 것 세 가지](/ai/2026/10/19/ai-made-three-things-cheap/)에서 "모델은 감이 아니라 비교로 고른다"고 했던 것도 결국 같은 방향이다. 어떤 모델을 어디로 보낼지는 취향이 아니라 규칙이어야 한다.
