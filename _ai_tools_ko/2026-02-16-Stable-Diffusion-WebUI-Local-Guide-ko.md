---
layout: subsite-post
title: "Stable Diffusion WebUI 완벽 가이드: 로컬에서 무료로 AI 이미지 생성하기"
date: 2026-02-16
category: image
tags: [stable diffusion, automatic1111, ai 아트, 이미지 생성, 로컬 ai, 오픈소스]
header-img: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200"
description: "AUTOMATIC1111 WebUI로 Stable Diffusion을 로컬에서 실행하는 완벽 가이드. 무제한 무료 AI 이미지 생성과 모델, 설정 완전 제어."
lang: ko
---

![AI 생성 아트](https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800)
*Photo by [Fakurian Design](https://unsplash.com/@fakurian) on Unsplash*

## 왜 Stable Diffusion을 로컬에서 돌릴까?

Midjourney, DALL-E 같은 서비스가 편리하지만, 로컬 Stable Diffusion은 독특한 장점이 있습니다:

- **완전 무료** - 구독료나 크레딧 제한 없음
- **완전한 프라이버시** - 프롬프트가 컴퓨터를 떠나지 않음
- **무제한 생성** - 원하는 만큼 이미지 생성
- **커스텀 모델** - 모든 스타일의 특화 모델 사용
- **완전한 제어** - 모든 파라미터 세밀 조정
- **제한 없음** - 콘텐츠 제한 없음

## 시스템 요구사항

### 최소 요구사항

| 구성 요소 | 최소 | 권장 |
|-----------|------|------|
| GPU | 4GB VRAM | 8GB+ VRAM |
| RAM | 8GB | 16GB+ |
| 저장 공간 | 20GB | 100GB+ (모델용) |
| OS | Windows 10/11, Linux, macOS | NVIDIA가 있는 Windows/Linux |

### 지원 GPU

**NVIDIA (최고):**
- RTX 4090/4080/4070 - 최상
- RTX 3090/3080/3070 - 우수
- RTX 2080/2070 - 양호
- GTX 1660/1650 - 사용 가능

**AMD:**
- Linux에서 ROCm으로 동작
- Windows 지원 제한적

**Apple Silicon:**
- M1/M2/M3 MPS로 지원
- NVIDIA보다 느리지만 동작함

![컴퓨터 셋업](https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800)
*Photo by [Christian Wiediger](https://unsplash.com/@christianw) on Unsplash*

## 설치 가이드

### Windows 설치

**1단계: Python 설치**

```bash
# python.org에서 Python 3.10.x 다운로드
# 설치 시 "Add Python to PATH" 체크
```

**2단계: Git 설치**

```bash
# git-scm.com에서 다운로드
# 기본 설정 사용
```

**3단계: AUTOMATIC1111 WebUI 클론**

```bash
cd C:\
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
```

**4단계: 모델 다운로드**

Stable Diffusion 모델 다운로드 출처:
- [Civitai](https://civitai.com) - 최대 모델 커뮤니티
- [Hugging Face](https://huggingface.co) - 공식 모델

`.safetensors` 파일을 여기에 배치:
```
stable-diffusion-webui/models/Stable-diffusion/
```

**5단계: 실행**

```bash
webui-user.bat
```

첫 실행 시 의존성 다운로드 (~5-10분).
접속: `http://127.0.0.1:7860`

### macOS 설치 (Apple Silicon)

```bash
# Homebrew 설치 (필요시)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 의존성 설치
brew install cmake protobuf rust python@3.10 git wget

# 리포지토리 클론
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# 실행
./webui.sh
```

### Linux 설치

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.10 python3.10-venv git wget

# 클론 및 실행
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
./webui.sh
```

## 필수 모델 다운로드

### 기본 모델

| 모델 | 스타일 | 크기 | 용도 |
|------|--------|------|------|
| SDXL 1.0 | 범용 | 6.9GB | 고품질 사실적 |
| SD 1.5 | 범용 | 4.2GB | 빠름, 호환성 높음 |
| Juggernaut XL | 사진처럼 | 6.9GB | 인물, 사진 |
| DreamShaper | 아트 | 2.1GB | 일러스트 |

### 특화 모델

- **Realistic Vision** - 사실적인 인물
- **Anime Models** - 일본 애니메이션 스타일
- **Architecture** - 건축 및 인테리어 디자인
- **Product Photography** - 상업 이미지

## WebUI 사용법

### Text-to-Image (txt2img)

기본 워크플로우:
1. 모델 선택 (왼쪽 상단 드롭다운)
2. 프롬프트 입력
3. 네거티브 프롬프트 입력
4. 설정 조정
5. "Generate" 클릭

**프롬프트 예시:**
```
masterpiece, best quality, highly detailed portrait of a woman,
soft lighting, golden hour, bokeh background, 8k resolution
```

**네거티브 프롬프트 예시:**
```
low quality, blurry, deformed, ugly, bad anatomy,
extra limbs, watermark, text, signature
```

### 주요 설정 설명

| 설정 | 설명 | 권장값 |
|------|------|--------|
| Sampling Steps | 많을수록 품질↑, 속도↓ | 20-30 |
| CFG Scale | 프롬프트 충실도 (높을수록 엄격) | 7-11 |
| Sampler | 생성 알고리즘 | DPM++ 2M Karras |
| Size | 출력 해상도 | 512x512 ~ 1024x1024 |
| Batch Count | 생성 횟수 | 4 |

### Image-to-Image (img2img)

기존 이미지 변환:
1. 소스 이미지 업로드
2. 원하는 출력 설명 프롬프트 입력
3. **Denoising Strength** 조정 (0.3-0.7)
4. 생성

**활용:**
- 스타일 전환
- 디테일 추가
- 구도 수정
- 컬러라이제이션

### Inpainting

특정 영역 편집:
1. 이미지 업로드
2. 변경할 영역에 마스크 그리기
3. 채울 내용 설명
4. 생성

적합한 용도:
- 객체 제거
- 배경 변경
- 얼굴 수정
- 요소 추가

## 필수 확장 프로그램

### ControlNet

이미지 구도를 정밀 제어:
- **Canny** - 엣지 감지
- **Depth** - 3D 깊이 맵
- **OpenPose** - 인체 포즈
- **Reference** - 스타일 매칭

**설치:**
```
Extensions → Install from URL →
https://github.com/Mikubill/sd-webui-controlnet
```

### ADetailer

얼굴과 손 자동 수정:
```
Extensions → Available → "ADetailer" 검색 → Install
```

### Ultimate SD Upscale

네이티브 해상도 이상으로 업스케일:
- 일관성 유지
- 타일 렌더링 사용
- 모든 모델과 호환

## 최적화 팁

### 낮은 VRAM GPU용

`webui-user.bat` (Windows) 또는 `webui-user.sh`에 추가:

```bash
set COMMANDLINE_ARGS=--medvram --xformers
```

매우 낮은 VRAM (4GB)용:
```bash
set COMMANDLINE_ARGS=--lowvram --xformers
```

### 속도 최적화

```bash
# xformers 활성화 (상당한 속도 향상)
set COMMANDLINE_ARGS=--xformers

# 빠른 생성을 위한 fp16 사용
set COMMANDLINE_ARGS=--precision full --no-half-vae
```

### 품질 vs 속도

| 우선순위 | Steps | Sampler | CFG |
|----------|-------|---------|-----|
| 속도 | 15-20 | Euler a | 7 |
| 균형 | 25-30 | DPM++ 2M Karras | 8 |
| 품질 | 40-50 | DPM++ SDE Karras | 9 |

## 문제 해결

### "Out of Memory" 오류

**해결책:**
- `--medvram` 또는 `--lowvram` 활성화
- 이미지 크기 줄이기
- 다른 GPU 애플리케이션 닫기
- xformers 활성화

### 검은색 또는 깨진 이미지

**해결책:**
- args에 `--no-half-vae` 추가
- GPU 드라이버 업데이트
- 다른 sampler 시도
- 모델 파일 무결성 확인

### 느린 생성

**해결책:**
- xformers 활성화
- 속도를 위해 SDXL Turbo 사용
- steps 줄이기
- 작은 해상도로 생성 후 업스케일

## 마무리

Stable Diffusion WebUI는 엔터프라이즈급 AI 이미지 생성 기능을 완전 무료로 제공합니다. 클라우드 서비스보다 학습 곡선이 가파르지만, 제어와 유연성은 비교할 수 없습니다.

SD 1.5로 배우고, 품질을 위해 SDXL로 이동하세요. r/StableDiffusion과 Civitai 같은 커뮤니티에서 새로운 모델과 기법을 발견하세요.

**상상력만이 유일한 한계입니다.**

---

*좋아하는 SD 모델이나 워크플로우가 있나요? 팁을 댓글로 공유해주세요!*
