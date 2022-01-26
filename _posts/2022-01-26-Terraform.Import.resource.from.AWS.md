---
layout: post
title: "Importing Existing Infrastructure Resource Into Terraform From AWS"
subtitle:  
categories: development
tags: devops
comments: true
---

AWS에 배포된 인프라스트럭쳐 리소스를 Terraform 파일 정의로 만드는 방법

## 개요

**Terraform**으로 **IaaC** (Infrastructure as a Code) 작업을 하는 것에는 장점이 많다. Infrastructure 상태가 코드화 되어 있으므로 현재 상태를 쉽게 파악가능하며, **Git**과 같은 **VCS** (Version Control System) 과 함께 사용하면 이력관리도 된다. 코드뿐만 아니라 현재 상태 (Terraform의 경우 tfstate 파일)도 Terraform Backend 설정으로 S3 같은 곳에 공유하면 여러 명이 작업할 경우에도 state가 꼬일 가능성이 줄어든다.

하지만, 장점만 있는 것은 아니다. 새로운 시스템을 구축하기 위해서 AWS Resource를 하나씩 수정해가면서 trying할 경우 이걸 매번 tf파일을 수정하면서 apply하기에는 번거롭다. 작업을 하다보면 처음 사용하는 옵션의 경우 Terraform 공식문서에도 세부적인 옵션들에 대해서는 모두 나열하지 않고 AWS 공식문서의 링크로 넘어가는데, 그 문서를 확인하기 보다는 AWS Web Console에 들어가서 Modify 또는 Create를 누른 후 화면에 나오는 옵션값을 보고 tf에 작업을 하는 경우가 많다. 이렇게 tf에 적용을 하는 것보다는 차리리 바로 Console에서 Apply를 눌러가면서 trying하는 것이 효과적이다. 이렇게 여러번 시도 후 최종적으로 동작하는 것을 확인한 후에 이 상태를 tf로 다시 작업하는건 번거롭다. 이 경우 그냥 현재 상태를 그대로 tf로 import할 수 있으면 좋겠다는 생각을 한 사람이 분명 있을 것이다. Terraform 작업자들 중에 꽤 많은 분들이 이런 생각을 한 번 이상은 했을거라고 필자는 생각한다. (*Case 1*)

그리고, 과거 Terraform으로 관리하기 이전에 배포된 Infrastructure에 대해서도 이걸 Terraform 으로 관리하고 싶은데, 다시 tf로 관리하려고 하면 과거에 배포된 것을 delete했다가 다시 create해야하기 때문에 그렇게 하지 못하는 경우도 경험했을 것이다. (*Case 2*)

## 방법

이 경우 Terraform의 `import` 와 `state rm` 을 적절히 사용하면 편리하게 할 수 있다.

- `import` : 배포된 infrastructure를 tfstate 내에 Resource로 생성
- `state rm` : tfstate로 관리하고 있는 Infrastructure Resource를 제거

Case 2의 경우를 먼저 말해보겠다. 그냥 `import`하면 된다. 끝!

Case 1의 경우는 tf로 배포한 infrastructure를 web console에서 수정을 했기 때문에 먼저 tfstate내에 있는 resource를 `state rm`으로 지운 후에 `import`하면 된다. 끝!

### 1. state rm

```bash
terraform state rm module.api_server.aws_instance.my_instance
```

위와 같은 식으로 실제 정의된 resource path를 module을 포함해서 모두 나열해주면 삭제된다. 위 resource path는 `terraform plan` 이나 `terraform apply`를 실행할때 화면에 표시되는 형식이다. 몇 번 눈여겨 봤다면 tf 파일 내에 선언된 것 만으로도 충분히 쉽게 작성이 가능하다.

### 2. import

`import`는 조금 더 복잡하다.

먼저 tf 파일내에 dummy resource를 하나 만든다. s3를 예로 들겠다.

```hcl
resource aws_s3_bucket my_s3 {

}
```

그런 다음 shell에서 import문을 실행한다. (-var-file은 필요한 경우에만 넣으면 된다.)

```shell
terraform import aws_s3_bucket.my_s3 star-test-bucket -var-file=my_values.tfvars 
```

tf에서 선언한 resource path를 적은 다음 AWS내에서 해당 infrastructure의 식별자를 적어주면 된다. 성공적으로 실행되었다면 아래와 같이 출력된다.

```
aws_s3_bucket.my_s3: Importing from ID "star-test-bucket"...
aws_s3_bucket.my_s3: Import prepared!
  Prepared aws_s3_bucket for import
aws_s3_bucket.my_s3: Refreshing state... [id=star-test-bucket]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

이제 tfstate에는 반영이 되었지만 아직 내 tf 파일안에는 빈 칸 그대로이다. 이걸 자동으로 채워주지는 않는다. 이 경우 `terraform plan`을 이용해서 tfstate에 저장된 상태를 볼 수 있다.

```shell
terraform plan -var-file=my_values.tfvars
```

거의 마지막에 **change** 항목으로 출력될 것이다. 이 값을 보고 tf 파일안에 내용으로 채워주면 된다.

### 다른 활용방안

기존에는 직접 tf 파일 내에 설정했던 것을 다른 module로 옮겨서 참조하고 싶다면? 또는 module로 참조하던것을 직접 참조하는 식으로 옮기고 싶을 경우? `state rm`과 `import`를 이용하면 쉽게 해결 가능하다. `state mv`를 이용해서도 가능하지만, 좀 복잡하거나 꼬여있을 경우에는 `state rm`, `import` combination으로도 활용이 가능하다.
