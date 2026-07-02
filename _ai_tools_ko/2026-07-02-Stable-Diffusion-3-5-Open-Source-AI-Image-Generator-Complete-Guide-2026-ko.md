---
layout: subsite-post
title: "Stable Diffusion 3.5: 오픈소스 AI 이미지 생성기 완벽 가이드 2026"
category: image
tags: [stable diffusion, ai 이미지 생성, 오픈소스, 텍스트 투 이미지, comfyui]
date: 2026-07-02 15:00:00
lang: ko
header-img: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=1200&auto=format&fit=crop"
---

# Stable Diffusion 3.5: 오픈소스 AI 이미지 생성기 완벽 가이드 2026

![디지털 아트 제작](https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&auto=format&fit=crop)
*Photo by [Europeana](https://unsplash.com/@europeana) on Unsplash*

Midjourney와 DALL-E가 화려한 주목을 받고 있지만, **Stable Diffusion 3.5**는 오픈소스 AI 이미지 생성의 절대적인 왕으로 군림하고 있습니다. 로컬 하드웨어에서 실행되고, 생성당 비용이 없으며, 파인튜닝 모델·LoRA·커스텀 워크플로우를 통해 타의 추종을 불허하는 커스터마이징이 가능합니다. 이 가이드는 설치부터 고급 기술까지 모든 것을 다룹니다.

## Stable Diffusion 3.5란?

Stable Diffusion 3.5(SD3.5)는 Stability AI가 출시한 **오픈소스 텍스트-이미지 확산 모델**입니다:

- 개인 및 상업적 사용 완전 무료 (커뮤니티 라이선스)
- 소비자용 GPU에서 실행 가능 (VRAM 8GB 이상 권장)
- 텍스트-이미지, 이미지-이미지, 인페인팅, 아웃페인팅 지원
- Civitai에서 방대한 파인튜닝 모델 및 LoRA 생태계
- ComfyUI, AUTOMATIC1111, InvokeAI 프론트엔드로 작동

### SD 3.5 모델 변형

| 모델 | 크기 | 최적 용도 |
|---|---|---|
| SD 3.5 Large | 81억 파라미터 | 최고 품질, 포토리얼리즘 |
| SD 3.5 Large Turbo | 81억 (증류) | 빠른 생성 (4스텝) |
| SD 3.5 Medium | 25억 파라미터 | 품질과 속도의 균형 |

---

## 설치

### 옵션 1: ComfyUI (파워 유저 권장)

ComfyUI는 최대 제어권을 제공하는 노드 기반 워크플로우 인터페이스입니다.

```bash
# ComfyUI 클론
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI

# 의존성 설치
pip install -r requirements.txt

# SD 3.5 모델 다운로드
# 경로: ComfyUI/models/checkpoints/
# 출처: https://huggingface.co/stabilityai/stable-diffusion-3.5-large

# ComfyUI 시작
python main.py
```

`http://localhost:8188`에서 UI 접근

### 옵션 2: AUTOMATIC1111 (초보자 권장)

```bash
# Homebrew가 있는 macOS
brew install python@3.11
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
cd stable-diffusion-webui

# SD3.5 모델을 models/Stable-diffusion/에 추가
# 실행
./webui.sh
```

`http://localhost:7860`에서 접근

### 옵션 3: API를 통한 Stable Diffusion (Stability AI)

로컬 설치 필요 없음:

```python
import requests

response = requests.post(
    "https://api.stability.ai/v2beta/stable-image/generate/sd3",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Accept": "image/*"
    },
    data={
        "prompt": "황금빛 시간대의 산 호수 초사실적 사진",
        "model": "sd3.5-large",
        "output_format": "jpeg",
        "width": 1024,
        "height": 1024
    }
)

with open("output.jpg", "wb") as f:
    f.write(response.content)
```

---

## 프롬프팅 가이드

### 기본 구조
```
[피사체], [스타일], [조명], [구도], [품질 태그]
```

### 예시 프롬프트

**포토리얼리스틱 초상화:**
```
Portrait of a woman in her 30s, natural light from window, 
soft shadows, shallow depth of field, professional photography, 
Sony A7R V, 85mm lens, sharp focus on eyes, photorealistic
```

**판타지 아트:**
```
Ancient dragon resting on a mountain peak, fantasy illustration, 
epic scale, volumetric lighting, dramatic clouds, detailed scales, 
concept art style, artstation trending
```

**제품 사진:**
```
Minimalist perfume bottle on white marble surface, 
studio lighting, commercial photography, soft shadows, 
high-end luxury product shot, 4K
```

### 네거티브 프롬프트
SD3.5에게 피하도록 지정:
```
Negative: blurry, low quality, deformed, ugly, distorted, 
watermark, text, signature, extra limbs, bad anatomy
```

---

## 핵심 기술

### 이미지-이미지 (img2img)
기존 이미지를 시작점으로 사용해 변환:

1. img2img 탭에 소스 이미지 로드
2. **노이즈 제거 강도** 설정:
   - 0.3–0.5: 미묘한 변화, 원본 구조 유지
   - 0.6–0.8: 상당한 변환
   - 0.9+: 큰 변화, 원본과 거의 유사하지 않음
3. 목표 결과를 설명하는 프롬프트 작성

### 인페인팅
이미지의 특정 부분 수정 또는 변경:
1. 이미지 로드
2. 변경하려는 영역에 마스크 그리기
3. 해당 영역을 대체할 내용에 대한 프롬프트 작성

### ControlNet
ControlNet 확장은 구도에 대한 정밀한 제어를 제공합니다:

- **Canny**: 엣지 감지 — 정확한 윤곽선 유지
- **Pose**: OpenPose 추정 — 인체 자세 제어
- **Depth**: 공간 깊이 분포 제어
- **Tile**: 구조를 유지하면서 업스케일 및 세부 사항 추가

```
활용 사례: 스케치 → 최종 렌더링
1. 대략적인 스케치 그리기
2. Canny를 사용해 ControlNet에 로드
3. 최종 아트 스타일에 맞는 프롬프트 작성
SD3.5가 구도에 맞는 완성된 버전 생성
```

![디지털 제작 과정](https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop)
*Photo by [Alexandre Debiève](https://unsplash.com/@alexkixa) on Unsplash*

---

## LoRA로 파인튜닝

LoRA(Low-Rank Adaptation) 파일은 전체 모델을 재학습하지 않고 특정 스타일, 캐릭터, 개념을 추가할 수 있습니다.

### ComfyUI에서 LoRA 사용
1. [civitai.com](https://civitai.com)에서 LoRA 파일 다운로드
2. `ComfyUI/models/loras/`에 배치
3. 워크플로우에 **LoraLoader** 노드 추가
4. 강도 설정 (보통 0.5–1.0)

### 인기 LoRA 카테고리 (2026)
- **아트 스타일**: 지브리, 수채화, 픽셀 아트, 유화
- **얼굴**: 프롬프트 전반에 걸쳐 일관된 캐릭터 생성
- **제품**: 특정 브랜드 미학
- **사진**: 특정 카메라 룩, 필름 스톡

---

## 하드웨어 요구사항 및 성능

| GPU | VRAM | 성능 |
|---|---|---|
| RTX 4090 | 24 GB | ~15초/이미지 (1024px) |
| RTX 4070 Ti | 12 GB | ~25초/이미지 (1024px) |
| RTX 3080 | 10 GB | ~40초/이미지 (1024px) |
| Apple M3 Max | 36 GB 유니파이드 | ~30초/이미지 |
| Apple M2 Pro | 16 GB 유니파이드 | ~90초/이미지 |

**메모리 최적화 팁:**
- VRAM 8GB 미만이면 `--lowvram` 플래그 사용
- 메모리 효율성을 위해 xFormers 활성화
- 작은 GPU에는 Large 대신 SD 3.5 Medium 사용

---

## SD 3.5 vs. 경쟁 도구

### vs. Midjourney v7
- **SD 3.5**: 무료, 로컬, 완전 커스터마이징 가능, 기술 설정 필요
- **Midjourney**: 초보자에게 더 나은 기본 품질, 구독 필요, Discord 기반

### vs. DALL-E 3
- **SD 3.5**: 오픈소스, 콘텐츠 제한 없음, 배치 생성
- **DALL-E 3**: 복잡한 텍스트 설명 이행에 더 뛰어남, 상업적 사용에 더 안전

### vs. Flux.1
- **Flux.1**: 기본값에서 더 높은 품질, 더 나은 프롬프트 따르기
- **SD 3.5**: 더 성숙한 생태계, 더 많은 LoRA 및 확장 프로그램

---

## 더 나은 결과를 위한 팁

1. **CFG 스케일 4–7 사용** (구형 모델보다 낮음)
2. 품질을 위해 **최소 20스텝** (Turbo 변형은 4스텝)
3. **스타일 구체화**: 아티스트, 사진 스타일, 예술 운동 명시
4. 마음에 드는 구도를 반복할 때 **시드 고정** 사용
5. 인쇄 품질 출력을 위해 **4x-UltraSharp** 또는 **RealESRGAN**으로 업스케일

---

## 결론

Stable Diffusion 3.5는 오픈소스 AI 아트 생태계의 근간입니다. 완전한 제어, 프라이버시, 무제한 생성, 커스터마이징을 원하는 사용자에게는 필적할 도구가 없습니다. Midjourney보다 학습 곡선이 가파르지만 천장도 훨씬 높습니다.

**평점: 9/10** — 완전한 제어를 원하는 파워 유저에게 독보적

---

*어떤 SD3.5 워크플로우를 사용하고 계신가요? 댓글로 설정을 공유해 주세요!*
