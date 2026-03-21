---
layout: subsite-post
title: "Stable Diffusion 3.5: 최고의 오픈소스 AI 이미지 생성기 — 완벽 가이드 2026"
date: 2026-03-21 15:00:00
category: image
lang: ko
tags: [stable-diffusion, 이미지생성, ai, 오픈소스, 디지털아트]
header-img: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&auto=format&fit=crop&q=80"
description: "2026년 Stable Diffusion 3.5 완전 정복 — 가장 강력한 오픈소스 AI 이미지 생성기. 프롬프트 작성, 모델 선택, ComfyUI 설치, 로컬 실행까지 완벽 가이드."
---

**Stable Diffusion 3.5** (SD 3.5)는 Stability AI의 획기적인 오픈소스 이미지 생성 모델의 최신 버전입니다. 2024년 말 출시되어 2026년 현재 널리 사용되고 있으며, 품질, 프롬프트 준수, 다재다능함에서 이전 버전 대비 크게 향상되었습니다. 무엇보다 — 무료이며 자신의 하드웨어에서 로컬로 실행할 수 있습니다.

![화려하고 다채로운 추상적 요소의 AI 생성 디지털 아트](https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&auto=format&fit=crop&q=80)
*Photo by Nong on Unsplash*

## Stable Diffusion 3.5란?

Stable Diffusion 3.5는 Stability AI가 개발한 **텍스트-이미지 AI 모델**입니다. Midjourney나 DALL-E 3와 달리 오픈소스이며 다양한 방식으로 실행 가능합니다:
- **로컬에서** 자신의 GPU로 (무료)
- **API를 통해** (Stability AI 플랫폼)
- **서드파티 UI를 통해** (ComfyUI, Automatic1111, InvokeAI)

**SD 3.0 대비 주요 개선사항:**
- 이미지 내 텍스트 렌더링 향상
- 인체 해부학과 손 표현 개선
- 더 높은 해상도 출력 (기본 최대 2MP)
- 더 빠른 추론 속도
- 복잡한 프롬프트에 대한 향상된 지시 따르기

## 모델 종류

| 모델 | 파라미터 | 최적 용도 | 필요 VRAM |
|------|---------|---------|---------|
| SD 3.5 Large | 80억 | 최고 품질 | 24GB+ |
| SD 3.5 Large Turbo | 80억 | 속도 (4 스텝) | 24GB+ |
| SD 3.5 Medium | 25억 | 품질/속도 균형 | 10GB+ |

대부분의 사용자에게는 **SD 3.5 Medium**이 최적 선택입니다 — 소비자용 GPU(RTX 3090, RTX 4080)에서도 실행되고 탁월한 결과를 제공합니다.

## Stable Diffusion 3.5 실행 방법

### 방법 1: ComfyUI (권장)
ComfyUI는 Stable Diffusion을 위한 가장 강력하고 유연한 UI입니다:

**설치:**
```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt
```

**모델 다운로드:**
1. [Hugging Face](https://huggingface.co/stabilityai/stable-diffusion-3.5-medium)에서 SD 3.5 가중치 받기
2. `ComfyUI/models/checkpoints/`에 배치
3. `python main.py` 실행 후 `http://localhost:8188` 접속

### 방법 2: Stability AI API (GPU 불필요)
```python
import requests

url = "https://api.stability.ai/v2beta/stable-image/generate/sd3"
headers = {
    "authorization": "Bearer YOUR_API_KEY",
    "accept": "image/*"
}
data = {
    "prompt": "황금빛 시간대의 웅장한 산 풍경, 초현실적, 8K",
    "model": "sd3.5-medium",
    "output_format": "jpeg"
}

response = requests.post(url, headers=headers, files={"none": ""}, data=data)
with open("output.jpg", "wb") as f:
    f.write(response.content)
```

### 방법 3: Automatic1111 WebUI
가장 인기 있는 SD 인터페이스:
```bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
cd stable-diffusion-webui
bash webui.sh
```

## SD 3.5 프롬프트 마스터하기

### 훌륭한 프롬프트의 구조

SD 3.5는 특수 문법이 필요한 구형 모델과 달리 자연어를 잘 이해합니다. 구조:

```
[주제] [동작/포즈] [배경] [조명] [스타일] [품질 수식어]
```

**예시:**
```
A young woman reading a book in a sun-drenched Parisian café, golden afternoon light streaming through window, impressionist oil painting style, rich warm colors, highly detailed
```

### 프롬프트 팁

**1. 조명을 구체적으로:**
- "dramatic chiaroscuro lighting"
- "soft diffused morning light"
- "neon-lit cyberpunk night"
- "golden hour sunlight"

**2. 아트 스타일 명확히 지정:**
- "digital art by Studio Ghibli"
- "watercolor painting"
- "photorealistic"
- "oil painting in the style of Monet"
- "flat vector illustration"

**3. 품질 부스터 사용:**
- "highly detailed, 8K resolution"
- "masterpiece, best quality"
- "sharp focus, professional photography"

**4. 이미지 내 텍스트 (SD 3.5 개선점):**
```
A coffee shop sign reading "Open", vintage typography, warm lighting
```
SD 3.5는 이전 버전보다 이미지 내 텍스트 처리가 훨씬 뛰어납니다.

### 네거티브 프롬프트
모델에게 피해야 할 것을 알려주세요:
```
Negative: blurry, low quality, deformed, extra limbs, watermark, signature, text, bad anatomy
```

![흐르는 색상과 기하학적 모양의 추상 디지털 아트](https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&auto=format&fit=crop&q=80)
*Photo by Milad Fakurian on Unsplash*

## 주요 파라미터 설명

| 파라미터 | 기본값 | 효과 |
|---------|------|------|
| CFG Scale | 4.5 | 프롬프트 준수도 (높을수록 더 문자적) |
| Steps | 28 | 많을수록 정교함 (40 이상 수확 체감) |
| Sampler | DPM++ 2M | 출력 스타일과 품질에 영향 |
| Resolution | 1024×1024 | 기본 해상도 |
| Seed | 랜덤 | 고정 시 재현 가능한 결과 |

**품질을 위한 권장 설정:**
- Steps: 25-35
- CFG Scale: 4.5-6.5
- Sampler: DPM++ 2M Karras 또는 Euler a

## 고급 기법

### ControlNet
참조 이미지를 사용해 구도 안내:
- **Depth map** — 장면의 3D 깊이 제어
- **Canny edges** — 구조적 구도 유지
- **OpenPose** — 골격으로 캐릭터 포즈 제어
- **Inpainting** — 이미지의 특정 부분 편집

### Image-to-Image (img2img)
기존 이미지에서 시작해 변환:
```
시작 이미지: 러프 스케치
프롬프트: "상세하고 완성된 전문 컨셉 아트"
Denoising strength: 0.65
```

### LoRA 모델
특정 스타일을 위한 파인튜닝된 소형 모델 추가:
- [civitai.com](https://civitai.com)에서 다운로드
- 프롬프트에 추가: `<lora:model_name:0.8>`
- 주요 용도: 특정 아트 스타일, 캐릭터 일관성, 제품 사진

## 경쟁 도구 비교

| | SD 3.5 Medium | Midjourney v7 | DALL-E 3 | Flux 1.1 Pro |
|--|--------------|---------------|-----------|------------|
| 비용 | 무료 (로컬) | $10/월 | 이미지당 결제 | 이미지당 결제 |
| 품질 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 오픈소스 | ✅ | ❌ | ❌ | ❌ |
| 커스터마이징 | ✅✅✅ | ✅ | ❌ | 제한적 |
| 로컬 실행 | ✅ | ❌ | ❌ | ❌ |

## 하드웨어 요구사항

| GPU | VRAM | 실행 가능 여부 |
|-----|------|------------|
| RTX 4090 | 24GB | SD 3.5 Large ✅ |
| RTX 4080 / 3090 | 16-24GB | SD 3.5 Medium ✅ |
| RTX 4070 / 3080 | 10-12GB | SD 3.5 Medium ✅ |
| RTX 4060 / 3070 | 8GB | SD 3.5 Medium (제한적) |
| M2/M3 Mac | 16GB+ 통합 메모리 | SD 3.5 Medium (MPS) ✅ |

적합한 GPU가 없다면 Stability AI API를 사용하세요 (~$0.04/이미지).

## 최종 평가

Stable Diffusion 3.5는 AI 이미지 생성에서 **완전한 제어, 프라이버시, 지속적인 비용 없음**을 원하는 사용자에게 최고의 선택입니다. 오픈소스 특성 덕분에 무제한 커스터마이징, 방대한 확장 및 LoRA 커뮤니티, 검열 제한 없음이 가능합니다.

단순함을 선호하는 일반 사용자에게는 Midjourney나 Adobe Firefly가 더 쉬울 수 있지만, 파워 유저와 개발자에게 SD 3.5는 독보적입니다.

**평점: 9/10** ⭐⭐⭐⭐⭐

**추천 대상:** 파워 유저, 개발자, 디지털 아티스트, 프라이버시 중시 사용자
**차별화 기능:** 무료, 오픈소스, 완전 커스터마이징 가능
**하드웨어:** RTX 3080+ 또는 16GB 통합 메모리 Mac 권장
