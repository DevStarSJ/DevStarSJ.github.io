---
layout: subsite-post
title: "OpenClaw을 AWS Bedrock으로 연결하기: 실전 설정 가이드"
subtitle: "Gemini API에서 AWS Bedrock Claude Sonnet 4.6으로 전환하기 — 삽질 포함"
date: 2026-03-06 00:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
catalog: true
category: automation
lang: ko
tags:
  - OpenClaw
  - AWS Bedrock
  - Claude
  - AI 어시스턴트
---

이 글은 macOS에서 OpenClaw를 AWS Bedrock에 연결하고, Claude Sonnet 4.6을 기본 모델로 사용하는 방법을 다룹니다. Bedrock을 사용하면 AWS 계정 한도 내에서 안정적으로 추론 서비스를 활용할 수 있습니다. 설정을 완료하고 나면 별다른 관리 없이 그냥 동작합니다.

까다로운 부분은 AWS 쪽이 아닙니다. OpenClaw가 설정 파일을 어떻게 관리하는지를 이해하는 것이 핵심인데, 몇 가지를 모르면 작업한 내용이 조용히 되돌아갑니다.

![AWS Bedrock Console](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)
*Photo by NASA on Unsplash*

## 환경

- macOS (launchd LaunchAgent 방식으로 게이트웨이 운영)
- OpenClaw 2026.2.17
- AWS 계정 + Bedrock IAM 접근 권한
- `~/.aws/credentials`에 `[default]` 프로파일 존재

---

## 사전 준비: AWS Bedrock 모델 접근 권한 활성화

AWS 콘솔 → Bedrock → **Model Access**에서 Claude Sonnet 4.6 접근 권한을 활성화합니다. **Cross-region inference profile**도 함께 활성화하세요.

CLI로 동작을 확인합니다:

```bash
aws bedrock-runtime converse \
  --model-id "global.anthropic.claude-sonnet-4-6" \
  --messages '[{"role":"user","content":[{"text":"hi"}]}]'
```

응답이 정상적으로 오면 준비가 완료된 것입니다.

---

## 1단계: OpenClaw 완전 종료

반드시 필요한 단계입니다. 게이트웨이가 실행 중인 상태에서 `openclaw.json`을 수정하면, 게이트웨이가 변경을 감지하고 자신이 가진 설정으로 즉시 덮어씁니다.

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
pkill -9 -f "openclaw-gateway"
sleep 2
ps aux | grep openclaw | grep -v grep
```

openclaw 프로세스가 하나도 남지 않은 것을 확인한 뒤 다음 단계로 넘어가세요.

---

## 2단계: LaunchAgent plist에 AWS 환경변수 추가

OpenClaw 게이트웨이는 macOS launchd로 실행되기 때문에, 셸에서 `export`한 환경변수가 프로세스에 전달되지 않습니다. plist 파일에 직접 추가해야 합니다.

`~/Library/LaunchAgents/ai.openclaw.gateway.plist`를 열어 `EnvironmentVariables` 섹션 안에 다음을 추가합니다:

```xml
<key>AWS_REGION</key>
<string>us-east-1</string>
<key>AWS_DEFAULT_REGION</key>
<string>us-east-1</string>
<key>AWS_ACCESS_KEY_ID</key>
<string>YOUR_ACCESS_KEY_ID</string>
<key>AWS_SECRET_ACCESS_KEY</key>
<string>YOUR_SECRET_ACCESS_KEY</string>
```

> ⚠️ `AWS_PROFILE`과 `AWS_ACCESS_KEY_ID`를 동시에 설정하면 충돌합니다. 둘 중 하나만 사용하세요.

> ⚠️ `~/.openclaw/.env`에 `AWS_PROFILE=default`가 있으면 역시 충돌합니다. 제거하세요.

---

## 3단계: openclaw.json 직접 편집

**`openclaw config` 위자드는 절대 실행하지 마세요.** 위자드를 실행하면 `openclaw.json` 전체가 기본값으로 덮어써집니다.

`~/.openclaw/openclaw.json`을 직접 열어 아래 내용을 병합합니다:

```json
{
  "models": {
    "bedrockDiscovery": {
      "enabled": true,
      "region": "us-east-1"
    },
    "providers": {
      "amazon-bedrock": {
        "baseUrl": "https://bedrock-runtime.us-east-1.amazonaws.com",
        "api": "bedrock-converse-stream",
        "auth": "aws-sdk",
        "models": [
          {
            "id": "global.anthropic.claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6 (Bedrock Global)",
            "reasoning": false,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "amazon-bedrock/global.anthropic.claude-sonnet-4-6",
        "fallbacks": ["anthropic/claude-sonnet-4-6", "anthropic/claude-haiku-4-5"]
      },
      "models": {
        "amazon-bedrock/global.anthropic.claude-sonnet-4-6": {},
        "anthropic/claude-sonnet-4-6": {},
        "anthropic/claude-haiku-4-5": {}
      }
    }
  }
}
```

---

## 4단계: 설정 파일 잠금 (핵심!)

```bash
chmod 444 ~/.openclaw/openclaw.json
```

이 단계를 건너뛰면 게이트웨이 재시작 시 설정이 덮어써집니다. 읽기전용으로 잠가두면 게이트웨이나 UI의 저장 시도가 실패하여 설정이 보호됩니다.

이후 설정을 변경해야 할 때는 다음 순서로 진행하세요:

```
launchctl bootout → pkill → chmod 644 → JSON 수정 → chmod 444 → launchctl bootstrap
```

---

## 5단계: 게이트웨이 재시작 및 확인

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.gateway.plist
sleep 5
openclaw models list
```

성공하면 다음과 같이 출력됩니다:

```
amazon-bedrock/global.anthropic.claude-sonnet-4-6  text+image  195k  default,configured
```

`default,configured`가 표시되면 완료입니다.

---

## 주의사항 모음

### 1. `openclaw config` 위자드를 절대 실행하지 말 것
`openclaw.json` 전체가 초기 기본값으로 초기화됩니다.

### 2. 실행 중인 OpenClaw가 설정 변경을 감지해서 덮어씀
`openclaw.json`을 수정하기 전에 반드시 게이트웨이를 완전히 종료하세요.

### 3. 컨트롤 UI에서 설정 변경 시에도 파일이 덮어써짐
`chmod 444`로 잠가두면 UI 저장 시도가 실패하여 설정이 보호됩니다.

### 4. `auth.profiles`에 Bedrock 프로파일 추가 금지
`aws-sdk` 인증 방식은 `models.providers.amazon-bedrock.auth`에만 사용하세요. 최상위 `auth.profiles` 섹션에는 추가하지 마세요.

### 5. 세션 모델 오버라이드가 설정보다 우선
`sessions.json`의 `modelOverride`, `providerOverride` 필드를 확인하고, 다른 모델을 가리키고 있다면 제거하세요.

### 6. `bedrockDiscovery`는 게이트웨이 프로세스 환경변수 필요
Discovery 기능은 프로세스 환경변수에서 AWS 자격증명을 읽습니다. 셸 환경변수가 아닌 launchd plist의 `EnvironmentVariables`에 추가해야 합니다.

---

## 요약 체크리스트

- [ ] AWS Bedrock 모델 접근 권한 활성화 (Model Access)
- [ ] OpenClaw 게이트웨이 완전 종료 (`launchctl bootout`)
- [ ] LaunchAgent plist에 AWS 자격증명 추가
- [ ] `openclaw.json`에 Bedrock 프로바이더 설정 병합
- [ ] 설정 파일 잠금: `chmod 444 ~/.openclaw/openclaw.json`
- [ ] 게이트웨이 재시작: `launchctl bootstrap`
- [ ] `openclaw models list`에서 `default,configured` 확인
- [ ] 세션 모델 오버라이드 제거 (있는 경우)

---

가장 흔한 실패 원인은 게이트웨이가 조용히 설정을 덮어쓰는 것입니다. **종료 → 편집 → 잠금 → 재시작** 순서만 지키면 나머지는 어렵지 않습니다.
