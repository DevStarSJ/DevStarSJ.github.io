---
layout: subsite-post
title: "Stable Diffusion 3 완벽 가이드: Midjourney에 맞서는 오픈소스 이미지 AI"
date: 2026-03-29 00:00:00
category: image
tags: [스테이블디퓨전, 이미지생성, 오픈소스, AI아트, comfyui]
lang: ko
header-img: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=1200&auto=format&fit=crop"
description: "Stable Diffusion 3 완벽 가이드 — 강력한 오픈소스 이미지 AI. 설치, 프롬프트 작성법, 모델, LoRA, Midjourney·DALL-E 3와의 비교."
---

Stable Diffusion 3 (SD3)는 Stability AI의 오픈소스 이미지 생성 모델 최신 세대입니다. Midjourney나 DALL-E 3와 달리, 본인 하드웨어에서 완전히 로컬로 실행할 수 있습니다 — 출력에 대한 완전한 제어권, 사용료 없음, 제3자의 콘텐츠 제한 없음.

![AI가 생성한 추상적 디지털 아트](https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1000&auto=format&fit=crop)
*Photo by [Milad Fakurian](https://unsplash.com/@fakurian) on Unsplash*

## Stable Diffusion 3란?

Stable Diffusion 3는 Stability AI가 개발한 잠재 확산 모델입니다. **MMDiT(Multimodal Diffusion Transformer)** 아키텍처를 사용합니다 — SD 1.x와 2.x의 U-Net 아키텍처에서 크게 벗어난 설계입니다. 이를 통해 SD3는:

- 이미지 내 텍스트 렌더링이 훨씬 향상
- 구도 및 다중 피사체 처리가 우수
- 프롬프트 준수도 개선
- 공간적 관계 이해 향상

**사용 가능한 버전:**
- **SD3 Medium** — 20억 파라미터, 6GB+ VRAM에서 실행
- **SD3 Large** — 80억 파라미터, 16GB+ VRAM 필요
- **SD3.5 Large Turbo** — 빠른 추론, 비슷한 품질

---

## SD3 vs 경쟁사 비교

| 기능 | SD3.5 | Midjourney V7 | DALL-E 3 | Flux.1 |
|-----|-------|---------------|----------|--------|
| 오픈소스 | ✅ | ❌ | ❌ | ✅ |
| 로컬 실행 | ✅ | ❌ | ❌ | ✅ |
| 이미지 텍스트 | ✅ 양호 | ⚠️ 보통 | ✅ 양호 | ✅ 우수 |
| 포토리얼리즘 | ✅ 높음 | ✅ 높음 | ✅ 높음 | ✅ 높음 |
| 애니메/스타일 | ✅ (LoRA) | ✅ | ⚠️ | ✅ |
| 비용 | 무료(로컬) | $10+/월 | $20+/월 | 무료(로컬) |
| NSFW | ✅ (로컬) | ❌ | ❌ | ✅ (로컬) |
| API | ✅ Stability AI | Discord 경유 | ✅ OpenAI | ✅ |

> **Flux 참고:** Black Forest Labs의 FLUX.1이 오픈소스 영역에서 SD3와 강하게 경쟁합니다. 많은 사용자들이 포토리얼리스틱 출력에서 Flux.1 [dev]가 약간 더 나은 품질을 가진다고 봅니다.

---

## 시작하기: 로컬 설치

### 옵션 1: ComfyUI (권장)

ComfyUI는 노드 기반 워크플로우를 사용하는 SD3의 가장 인기 있는 인터페이스입니다:

```bash
# ComfyUI 설치
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# SD3 모델 다운로드 (models/checkpoints/에 배치)
# https://huggingface.co/stabilityai/stable-diffusion-3-medium

# 실행
python main.py --listen
```

브라우저에서 `http://localhost:8188`을 열면 됩니다.

### 옵션 2: Automatic1111

클래식 웹 UI, 초보자 친화적이며 광범위한 익스텐션 지원:

```bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
cd stable-diffusion-webui

# SD3 모델을 models/Stable-diffusion/에 배치
# Mac/Linux 실행:
./webui.sh

# Windows 실행:
webui-user.bat
```

### 옵션 3: API 사용 (설치 불필요)

```python
import requests
import base64

response = requests.post(
    "https://api.stability.ai/v2beta/stable-image/generate/sd3",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Accept": "application/json"
    },
    files={"none": ""},
    data={
        "prompt": "정장을 입은 여우의 포토리얼리스틱 초상화, 영화적 조명",
        "model": "sd3.5-large",
        "output_format": "jpeg",
        "aspect_ratio": "1:1"
    }
)

image_data = response.json()["image"]
with open("output.jpg", "wb") as f:
    f.write(base64.b64decode(image_data))
```

---

## SD3 프롬프트 가이드

### 기본 구조
```
[피사체] [스타일] [조명] [카메라] [품질 수식어]
```

**예시:**
```
A red fox wearing a Victorian gentleman's suit, sitting in a leather armchair, 
reading a newspaper, oil painting style, warm candlelight, dramatic shadows, 
detailed fur texture, 8k resolution
```
(빅토리아 신사 정장을 입은 빨간 여우, 가죽 안락의자에 앉아 신문 읽는 모습, 유화 스타일, 따뜻한 촛불, 극적인 그림자, 세밀한 털 질감, 8K 해상도)

### 긍정 프롬프트 팁

| 목표 | 프롬프트에 추가 |
|-----|--------------|
| 포토리얼리즘 | `photorealistic, hyperrealistic, raw photo, 8k` |
| 예술적 | `oil painting, watercolor, digital art, concept art` |
| 영화적 | `cinematic lighting, film grain, bokeh, shallow depth of field` |
| 선명한 디테일 | `highly detailed, intricate details, sharp focus` |
| 전문적 | `professional photography, studio lighting, commercial` |

### 부정 프롬프트
```
ugly, blurry, low quality, deformed, extra limbs, bad anatomy, 
watermark, text, signature, duplicate, mutation, out of frame
```

### 화면비
- **1:1** — 정사각형 (소셜 미디어, 아바타)
- **16:9** — 와이드스크린 (풍경, 배경화면)
- **9:16** — 세로형 (모바일 배경화면, 스토리)
- **3:2** — 사진 표준
- **4:5** — Instagram 세로형

---

## LoRA: 모델 커스터마이징

LoRA(Low-Rank Adaptation) 파일은 전체 모델을 재학습하지 않고 SD3에게 새로운 스타일, 캐릭터, 개념을 가르치는 작은 모델 애드온입니다.

**인기 있는 LoRA 카테고리:**
- **아트 스타일:** 픽셀 아트, 애니메이션, 수채화, 유화
- **캐릭터:** 특정 픽션 캐릭터
- **유명인:** (책임감 있게/합법적으로 사용)
- **제품 사진:** 특정 카메라 렌즈, 조명 설정

**LoRA 찾는 곳:**
- [CivitAI](https://civitai.com) — 가장 큰 커뮤니티 허브
- [HuggingFace](https://huggingface.co/models?library=diffusers)

**ComfyUI에서 LoRA 사용:**
`.safetensors` 파일을 `models/loras/` 폴더에 넣고, 워크플로우에 LoRA 노드를 추가한 뒤 강도를 0.5~1.0 사이로 설정하세요.

**Automatic1111에서 LoRA 사용:**
```
프롬프트에: <lora:your-lora-name:0.8>
```

---

## 고급 기능: ControlNet

ControlNet으로 구도와 포즈를 정밀하게 제어할 수 있습니다:

- **Canny** — 엣지 검출: 같은 구조의 변형 이미지 생성
- **Depth** — 깊이 맵: 공간 배치 제어
- **OpenPose** — 인체 포즈: 특정 신체 자세 생성
- **IP-Adapter** — 스타일 참조 이미지: 참고 사진의 스타일 매칭
- **Inpainting** — 이미지 특정 영역만 편집

**활용 사례:** 대략적인 스케치 → ControlNet Canny → 포토리얼리스틱 버전 생성

---

## 하드웨어 요구사항

| 하드웨어 | VRAM | 추천 용도 |
|--------|------|---------|
| RTX 3060 / 4060 | 8-12GB | SD3 Medium, 빠름 |
| RTX 3080 / 4070 | 10-12GB | SD3 Medium, 좋음 |
| RTX 3090 / 4090 | 24GB | SD3 Large, 최고 |
| Apple M1/M2/M3 | 통합 RAM | SD3 Medium (16GB 이상) |
| GPU 없음 (CPU) | RAM | 매우 느림, SD3 Small |

> **Mac 팁:** Stable Diffusion은 Core ML / MPS 백엔드를 통해 Apple Silicon에서 네이티브로 실행됩니다. 16GB 통합 RAM의 M2/M3는 꽤 괜찮은 성능을 냅니다.

---

## 클라우드 옵션 (로컬 GPU 없을 때)

| 서비스 | 가격 | 특이사항 |
|------|------|---------|
| **Stability AI API** | $0.065/이미지 | 공식, 빠름 |
| **RunPod** | ~$0.2/시간 GPU | GPU 대여, 완전 제어 |
| **Replicate** | 사용량 기반 | 쉬운 API, 다양한 모델 |
| **Mage.space** | 무료 플랜 | 웹 UI, 설치 불필요 |

---

## 총평

Stable Diffusion 3는 완전한 제어권, 개인정보 보호, 그리고 지속적인 비용 없이 원하는 사용자에게 2026년 최고의 오픈소스 이미지 생성 모델입니다. 대부분의 사용 사례에서 이미지 품질이 상업 서비스에 필적합니다.

Midjourney 대비 주요 절충점: SD3는 더 많은 기술적 설정과 최상의 결과를 위한 세심한 프롬프트 작성이 필요합니다. Midjourney는 초보자에게 더 "마법같은" 경험을 제공합니다. 하지만 파워 유저, 개발자, 프라이버시를 존중하는 로컬 솔루션이 필요한 사람에게 SD3는 독보적입니다.

**평점: 9.0/10**

*최고의 오픈소스 이미지 생성기 — 올바른 하드웨어와 함께라면 무한한 가능성.*

---

*함께 보기: [Midjourney V7 완벽 가이드](/ai-tools/ko/), [DALL-E 3 완벽 가이드](/ai-tools/ko/), [Adobe Firefly 리뷰](/ai-tools/ko/)*
