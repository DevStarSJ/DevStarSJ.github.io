---
layout: post
title: "Stanford CS231n Lecture 2. Image Classification"
subtitle: "Stanford CS231n Lecture 2. Image Classification"
categories: data
tags: cs231
comments: true
---
Stanfoard [CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)를 요약한 포스팅입니다. 정보 전달보다 자신을 위한 정리 목적이 강한 글입니다! :)


## Image Classification
- Computer Vision의 핵심 Task
	- Input : Image
	- Output : Category Labels
- Semantic Gap
	- 이미지에서 추출할 수 있는 정보(색, 질감)와 사람들이 원하는 추상적 정보의 차이
- Challenges
	- Viewpoint Variation ( 보는 각도 )
	- Illumination ( 조명 )
	- Deformation ( 변형 ) 
	- Occlusion ( 은폐, 숨김 )		 
	- Background Clutter ( 배경과 섞임 )
	- Intraclass Variation ( 물체의 다양성 )
- 상상하는 모든 이미지를 실시간으로 판단하고 싶음
- Attempts
	- Find edges
	- Find corners
	- brittle

### Data-Driven Approach
- Collect a dataset of images and labels
- Use Maching Learning to train a classifier
- Evaluate the classifier on new images 

## Classifier : Nearest Neighbor
- Train : Memorize all data and labels
- Predict : Predict the label of the most similiar training image
	
### Example Dataset: CIFAR10
- 10 classes(airplane, automobile, bird, cat, deer, dog, frog, horse, ship, truck)
- 50000 training images
- 10,000 testing images	
	
### Distance Metric
- L1(Manhattan) distance
- L2(Euclidean) distance

### Hyper Paramter
- What is the best value of k to use?
- Whate is the best distinct to use?
- Choices about the algorithm that we set rather than learn
- Setting Hyper Paramters
	- Idea 1. Choose hyper paramters that work best on your data 
		- Bad : $$K=1$$ always work perfectly on training data
	- Idea 2. Split data into **train** and **test**, choose hyper parameters that work best on test data
		- Bad : No idea how algorithm will perform on new data
	- Idea 3. Split data into **train**, **val**, and **test**; choose hyper parameters on val and evaluate on test
		- Better! 
		- validation set : check accuracy, check how well algorithm is doing
	- idea 4. **Cross-Validation**: Split data into folds, try each fold as validation and average the results
		- Useful for small datasets, but not used too frequently in deep learning

### KNN on images never used
- Very slow at test time
- Distance metrics on pixels are not informative
- Curse of dimensionality ( 차원의 저주 )

### Parametric Approach
- Image : Array of **$$32\times 32\times 3$$** (3072)
- Function : $$f(x,W)$$
- Output : 10 numbers giving class scores

### Coming up
- Loss function : quantifying what it means to have a "good" W
- Optimization : start with random W and ifnd a W that minimizes the loss
- ConvNets : tweak the functional form of f

## Reference
- [Stanfoard CS231n 2017](https://www.youtube.com/watch?v=vT1JzLTH4G4&list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv&index=0)