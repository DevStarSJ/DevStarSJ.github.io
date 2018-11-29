---
layout: post
title: "파이썬 코딩의 기술 (Effective Python) 정리"
subtitle: "파이썬 코딩의 기술 (Effective Python) 정리"
categories: development
tags: python
comments: true
---
파이썬 코딩의 기술 책을 읽고 정리한 문서입니다

# 목차

# CHAPTER 1. 파이썬다운 생각
- 파이썬 프로그래머들은 복잡함보다는 단순함을 선호하고 가독성을 극대화하기 위해 명료한 것을 좋아한다

```
>>> import this
The Zen of Python, by Tim Peters

Beautiful is better than ugly.
Explicit is better than implicit.
Simple is better than complex.
Complex is better than complicated.
Flat is better than nested.
Sparse is better than dense.
Readability counts.
Special cases aren't special enough to break the rules.
Although practicality beats purity.
Errors should never pass silently.
Unless explicitly silenced.
In the face of ambiguity, refuse the temptation to guess.
There should be one-- and preferably only one --obvious way to do it.
Although that way may not be obvious at first unless you're Dutch.
Now is better than never.
Although never is often better than *right* now.
If the implementation is hard to explain, it's a bad idea.
If the implementation is easy to explain, it may be a good idea.
Namespaces are one honking great idea -- let's do more of those!
```

## BETTER WAY 1
사용중인 파이썬 버전 알기

```$ python --version```  
```$ python3 --version```

```
import sys
print(sys.version_info)
print(sys.version)

>>>
sys.version_info(major=3, minor=4, micro=2, releaselevel='final', serial=0)  
3.4.2 (defaul, Mar 2 2018, ~)
```

- 파이썬에는 CPython, Jython, IronPython, PyPy 같은 다양한 런타임이 있음
- 시스템에서 파이썬을 실행하는 명령이 몇 버전인지 확인하기
- 새 파이썬 프로젝트를 시작할 때는 파이썬 3 추천

## BETTER WAY 2
[PEP 8 스타일 가이드](https://www.python.org/dev/peps/pep-0008/)를 따르자

### 화이트스페이스(공백)
- 탭이 아닌 스페이스로 들여쓴다
- 문법적으로 의미있는 들여쓰기는 스페이스 4개
- 한 줄의 문자 길이가 79자 이하여야 한다
- 표현식이 길어서 다음 줄로 일어지면 스페이스 4개 사용
- 파일에서 함수와 클래스는 빈 줄 2개로 구분해야 한다
- 클래스에서 메서드는 빈 줄 1개로 구분해야 한다
- 리스트 인덱스, 함수 호출, 키워드 인수 할당에는 스페이스를 사용하지 않는다
- 변수 할당 앞뒤에 스페이스를 하나만 사용한다

### 명명(naming)
- 함수, 변수, 속성은 **lowercase_underscore** 형식을 따른다
- 보호(protected) 인스턴스 속성은 **\_leading_underscore** 형식을 따른다
- 비공개(private) 인스턴스 속성은 **\__double_leading_underscore** 형식을 따른다
- 클래스와 예외는 CapitalizedWord 형식을 따른다
- 모듈 수준 상수는 ALL_CAPS 형식을 따른다
- 클래스와 인스턴스 메서드는 첫 파라미터의 이름을 self로 지정
- 클래스 메서드에서는 첫 파라미터의 이름을 cls로 지정

### 표현식과 문장
- 긍정 표현식의 부정(if not a is b) 대신에 인라인 부정(if a is not b)를 사용한다
- 길이를 확인(if len(somelist)==0)하여 빈 값([] 또는 '')을 확인하지 않는다. if not somelist를 사용하고 빈 값은 암시적으로 False가 된다고 가정한다
- 비어있지 않은 값([1] 또는 'hi')에도 위와 같은 방식이 적용된다. 값이 비어있지 않으면 if somelist 문이 암시적으로 True가 된다
- 한줄로 된 if문, for와 while 루프, except 복합문을 쓰지 않는다. 이런 문장은 여러 줄로 나눠서 명료하게 작성한다
- 항상 파일의 맨 위에 import문을 놓는다
- 모듈을 임포트할 때는 항상 모듈의 절대 이름을 사용하며 현재 모듈의 경로를 기준으로 상대 경로로 된 이름을 사용하지 않는다. 예를들어 bar 패키지의 foo 모듈을 임포트하려면 from bar import foo라고 해야 한다
- 상대적인 임포트를 해야한다면 명시적인 구문을 써서 from . import foo라고 한다
- 임포트는 '표준 라이브러리 모듈, 서드파티 모듈, 자신이 만든 모듈' 섹션 순으로 구분해야 한다. 각각의 하위 섹션에서는 알파벳 순서로 임포트한다

## BETTER WAY 3
bytes, str, unicode의 차이점을 알자

- 파이썬3는 문자를 bytes와 str 두가지 타입으로 나타냅니다. bytes 인스턴스는 raw 8 비트 값을 저장하며 str 인스턴스는 유니코드 문자를 저장합니다  
- 파이썬2는 문자를 str와 unicode로 나타냅니다. str 인스턴스는 raw 8 비트값을 저장하며 unicode 인스턴스는 유니코드 문자를 저장합니다

- 유니코드 문자를 바이너리 데이터(raw 8 비트)로 표현하는 방법은 많습니다. 가장 일반적인 인코딩은 UTF-8입니다. 중요한 것은 파이썬3의 str 인스턴스와 파이썬 2의 unicode 인스턴스는 연관된 바이너리 인코딩이 없다는 점입니다. 유니코드 문자를 바이너리 데이터로 변환하려면 ```encode``` 메서드를 사용하고, 바이너리 데이터를 유니코드 문자로 변환하려면 ```decode``` 메서드를 사용해야 합니다
- 외부에 제공할 인터페이스에선 유니코드를 인코드하고 디코드해야 합니다. 프로그램의 핵심 부분엔 유니코드 문자 타입(파이썬3은 str, 파이썬2는 unicode)를 사용하고 문자 인코딩에 대해선 어떤 가정을 하지 말아야 합니다. 이렇게 하면 출력 텍스트 인코딩을 유지하면서 다른 텍스트 인코딩을 쉽게 수용할 수 있습니다

그러나 아래와 같은 상황에 부딪힐 수 있습니다

- UTF-8(혹은 다른 인코딩)으로 인코드된 문자인 raw 8비트 값으로 처리하려는 상황
- 인코딩이 없는 유니코드 문자를 처리하는 상황

```
# Python 3
# 먼저 str/bytes를 입력으로 받고 str을 반환하는 메서드
def to_str(bytes_or_str):
    if isinstance(bytes_or_str, bytes):
        value = bytes_or_str.decode('utf-8')
    else:
        value = bytes_or_str
    return value
```

```
# Python 3
# str/bytes를 받고 bytes를 반환하는 메서드
def to_bytes(bytes_or_str):
    if isinstance(bytes_or_str, str):
        value = bytes_or_str.encode('utf-8')
    else:
        value = bytes_or_str
    return value
```

파이썬2에선 str이나 unicode를 입력으로 받고 unicode를 반환시키는 메서드가 필요합니다

```
# Python2
def to_unicode(unicode_or_str):
	if isinstance(unicode_or_str, str):
		value = unicode_or_str.decode('utf-8')
	else:
		value = unicode_or_str
	return value
```

```
# Python2
def to_str(unicode_or_str):
	if isinstance(unicode_or_str, unicode):
		value = unicode_or_str.encode('utf-8')
	else:
		value = unicode_or_str
	return value
```

파이썬에서 로 8비트 값과 유니코드 문자를 처리할 때는 중대한 이슈 2개가 있음  

- 1 : 파이썬2의 str은 7비트 아스키 문자만 포함하고 있다면 unicode와 str 인스턴스가 같은 타입처럼 보입니다 ( 반면 파이썬3은 bytes와 str 인스턴스는 빈 문자열이라도 절대 같지 않으므로 함수에 넘기는 문자열 타입을 신중하게 처리해야 함)
	- 이런 str과 unicode를 + 연산자로 묶을 수 있음
	- equality, inequality 연산자로 비교할 수 있음
	- '%s' 같은 포맷 문자열에 unicode 인스턴스를 사용할 수 있음
- 2 : 파이썬 3에선 내장 함수 open이 반환하는 파일 핸들에서 사용하는 연산이 기본적으로 UTF-8 인코딩을 사용. 파이썬2은 기본으로 바이너리 인코딩을 사용
	- 바이너리 쓰기모드('wb')로 오픈해야 함
	
	```
	with open('/tmp/data.bin/', 'wb') as f:
		f.write(os.urandom(10))
	```
	
## BETTER WAY 4
복잡한 표현식 대신 헬퍼 함수를 작성하자

URL에서 쿼리 문자열을 디코드해야 한다고 할 경우   

```
from urllib.parse import parse_qs
my_values = parse_qs('red=5&blue=0&green=',
					  keep_blank_values=True)
print(repr(my_values))
>>> {'red': ['5'], 'green':[''], 'blue': ['0']}
```	

이렇게 만들면 ```my_values.get('red')```로 값을 추출할 수 있으나 딕셔너리에 없는 값은 None으로 나올 것입니다. 이럴 경우엔 ```my_values.get('opacity', [''])[0] or 0``` 으로 처리하면 없는 값도 0이 나올 것입니다. 여기서 사용된 트릭은 빈 문자열, 빈 리스트, 0이 모두 암시적으로 False로 평가되는 것을 사용했습니다  

수학식에서도 사용하기 위해 int로 감싸줘야 합니다. 코드를 펼쳐서 보면 아래와 같습니다

```
green = my_values.get('green', [''])
if green[0]:
	green = int(green[0])
else:
	green = 0	
```

이 로직을 반복해서 사용해야 한다면 헬퍼 함수를 만드는 것이 좋습니다

```
def get_first_int(Values, key, default=0):
	found = values.get(key, [''])
	if found[0]:
		found = int(found[0])
	else:
		found = default
	return found
```

이젠 ```green = get_first_int(my_values, 'green')```으로 간단히 표현할 수 있습니다


## BETTER WAY 5
시퀀스를 슬라이스하는 방법을 알자

파이썬은 시퀀스를 슬라이스(slice:자르기)해서 조각으로 맏느는 문법을 제공합니다. 이렇게 슬라이스하면 최소한의 노력으로 시퀀스 아이템의 부분집합(subset)에 접근할 수 있습니다. 가장 간단한 슬라이싱 대상은 내장 타입인 list, str, bytes입니다. ```__getitem__```과 ```__setitem__```이라는 특별한 메서드를 구현한 클래스에도 슬라이싱을 적용할 수 있습니다  

문법의 기본 형태는 somelist[start:end]이며 start 인덱스는 포함되고 end 인덱스는 제외됩니다. 끝을 기준으로 계산할 때는 음수로 슬라이스할 수 있습니다. 

할당에 사용하면 슬라이스는 원본 리스트에서 지정한 범위를 대체합니다. 길이가 같아야 하는 튜플 할당과는 달리 슬라이스 할당은 길이가 달라도 됩니다. 리스트는 새로 들어온 값에 맞춰 늘어나거나 줄어듭니다  

```
print('before', a)
a[2:7] = [99, 22, 14]
print('after', a)
>>>
before ['a','b','c','d','e','f','g','h']
after ['a', 'b', 99, 22, 14, 'h']	
```

시작과 끝 인덱스를 모두 생략하고 슬라이스하면 원본 리스트의 복사본을 얻습니다

```
b = a[:]
asser b== a and b is not a
```

슬라이스에 시작과 끝 인덱스를 지정하지 않고 할당하면 슬라이스 전체 내용을 참조 대상의 복사본으로 대체

```
b = a
print('before', a)
a[:] = [101, 102, 103]
assert a is b # 여전히 같은 리스트 객체
print('after', a) # 이제 다른 내용을 담음
>>>
before ['a','b','99, 22, 14, 'h']
after [101, 102, 103]
```

## BETTER WAY 6
한 슬라이스에 start, end, stride를 함께 쓰지 말자

파이썬 슬라이스 문법 중 stride는 오작동을 하는 경우가 있다. 예를 들어 utf-8 바이트 문자열로 인코드된 유니코드 문자에는 작동하지 않습니다. 따라서 stride 부분이 매우 혼란스러울 수 있기에 함께 사용하지 않는 것을 추천합니다. 특히 stride가 음수일 땐 더욱!! 만약 파라미터를 3개 사용해야 한다면 내장 모듈인 ```itertools```의 ```islice```를 사용하면 됩니다


## BETTER WAY 7
map과 filter 대신 리스트 컴프리헨션을 사용하자


파이썬에서 한 리스트에서 다른 리스트를 만드는 간단한 문법을 리스트 컴프리헨션이라고 합니다. 각 숫자의 제곱을 계산할 경우 아래와 같이 쓸 수 있습니다

```
a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
squares = [x**2 for x in a]
```

간단한 연산에는 리스트 컴프리헨션이 명확합니다. map을 사용할 땐 lambda 함수를 생성해야 해서 깔끔해 보이지 않습니다.

```
sqaures = map(lambda x: x**2, a)
```

리스트 컴프리헨션은 입력 리스트에 있는 아이템을 걸러서 출력 결과를 설정할 수 있습니다. 2로 나누어 떨어지는 숫자의 제곱만 계산할 경우 아래와 같습니다

```
even_squares = [x**2 for x in a if x % 2 == 0]
```

filter와 map의 조합으로도 같은 결과를 얻을 수 있지만 읽긴 어렵습니다

```
alt = map(lambda x: x**2, filter(lambda x: x % 2 ==0, a))
assert even_squares == list(alt)
```

딕셔너리, 셋 컴프리헨션도 있습니다! 단, 컴프리헨션은 순간적으로 메모리에 데이터를 로드하기 때문에, 많은 데이터가 있는 경우 메모리 오류가 날 수 있음 이럴 땐 제네레이터를 사용하면 좋습니다



