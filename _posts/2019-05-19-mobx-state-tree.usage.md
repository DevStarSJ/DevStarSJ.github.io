---
layout: post
title: "MobX state tree 사용기"
subtitle:  
categories: development
tags: javascript
comments: true
---

아직 Frontend 쪽 작업은 3개월 정도밖에 안해본 초짜 정도의 web clinet 개발 실력을 가지고 있지만...
이번 **React** project 진행에서 **MobX state tree**를 어떻게 사용했는지 그 방법과 사용하면서 느꼈던 점, 겪었던 trouble-shooting을 나열해 보겠다.

먼저, **MobX state tree**가 무엇인지를 알아야 하는데, 그러기 위해서는 **MobX**가 무엇이며, **Redux**와는 어떤 차이점이 있는지를 알면 좋다.

[우아한 형제들 기술블로그 : React에서 Mobx 경험기 (Redux와 비교기)](http://woowabros.github.io/experience/2019/01/02/kimcj-react-mobx.html)

위 글에 아주 잘 설명되어 있으므로 그걸 참고하기 바란다.

난 사실 **MobX** 와 **Redux**로 개발한 경험이 없다. 처음부터 **MobX state tree**를 사용했으므로 사용법 상의 차이점이 무엇인지 어떠한 장단점이 있는지 잘 모른다.

MobX state tree에 대한 refernece나 best practice는 아직 찾기 어려워서 주로 아래 2개의 자료를 활용했다.

- [Mobx state tree 공식 Github의 README](https://github.com/mobxjs/mobx-state-tree)
- [egghead 무료강의: Manage Application State with Mobx-state-tree](https://egghead.io/courses/manage-application-state-with-mobx-state-tree)

아마 대부분이 MobX의 특징이겠으며 여기에 약간의 mst 적인 요소가 추가된 것이겠지만, 내가 작업하면서 느낀 특징은 다음과 같다.

#### MobX state tree 특징들

 **store**(mst에서 상태를 저장해 놓은 object)에서 **observable property**들을 제공해주며 React.component에서 `@observer`를 해주면 값 변경시 다시 page rendering이 이루어진다. 정확히 얘기하자면 해당 property를 사용하는 곳이 새로 실행된다.

 store는 mst의 `types.model`로 선언을 한다. 이것은 일반 JSON object와는 다른 형태의 object여서 **console.log**등으로 출력을 하면 보기 어렵다. 그러기에 `.toJS()`를 이용해서 JSON으로 변환해서 사용하는 경우가 많다. 그래야만 제대로 동작하는 경우도 있다. `types.model`에 JSON을 assign하면 그 형태가 같지 않더라도 암시적으로 변환이 이루어 지는데 `types.model`을 다른 형태의 `types.model`에 넣는 경우 오류가 발생한다. (ex. `{id, name}`만 가지는 model에 `{id, name, age}`를 가지고 있는 model을 assign하면 오류가 발생하지만 해당 model`.toJSON()`을 한 것을 assign하면 오류 없이 id, name만을 넣게 된다.) 문제는 이렇게 `.toJS()`로 변환을 하게 되면 그 `observable`하지 않게 되므로 그 이후 사용되는 곳에 대해서는 값이 변경되더라도 새로 실행되지 않을 수 있다.

 또한 `action`으로 뭔가 값을 받아서 실행하는 것 또한 `@observer`로 선언한 곳에서 사용하더라도 재실행 안될 수 있으므로 가능하면 `view`로 전달받아서 사용할 수 있는 형태로 구성을 해야한다.

 `types.model`을 tree 형태로 구성할 수가 있으며 `getParent(self)`구문을 통해서 부모 tree로의 접근이 가능하다. `types.model`의 값을 읽는건 어디서든 가능하지만 변경하는 것은 해당 model 내의 `action`에서만 가능하다. 이건 부모 tree든 자식 tree든 마찬가지다. 그래서 외부에서 변경해야하는 property에 대해서는 `action`에 setter를 생성해야 한다.

**store**는 주로 singleton 형태의 instance를 만들어서 `@inject(userStore)` 형태로 React.component에 주입을 해서 사용한다. 그러면 `this.props.userStore`로 접근이 가능하다.

#### MobX state tree 구성

먼저 단일 model에 대한 `Model`을 생성하고, 그것들의 array를 가지는 `Store`를 만들어서 사용하였다. React.component 내부에서 사용하는 상태들은 component 내부 state로 구성을 했지만, 특정 page에서 관리하는 state에 대해서는 `Store`를 사용했다. 그래야 React.component들의 구성상 depth가 다른 경우나 접근하기 위해서 **부모 -> 부모 -> 부모 -> 자식 -> 자식** 과 같이 복잡한 관계에서도 쉽게 접근이 가능했다.

React.component가 직접 `@inject` 및 `@observer`를 하기도 했지만, React.component의 재사용성을 위해서 이를 선언한 부모쪽에서 store를 props로 주입해주고 `@observer`만을 선언하는 경우도 많았다. 예를 들어서 **Checkbox List** 관련 React.component를 만들어 두고 `UserStore`의 List를 사용하기도 했다가 `DepartmentStore`를 사용하기도 한 경우에는 직업 `@inject(userStore)` 나 `@inject(departmentStore)`로 사용한게 아니라 `<ComboList store={userStore}>` 및 `<ComboList store={departmentStore}>` 로 사용하는 곳에서 props로 주입했다.

##### 예제 코드

모든 코드를 다 적지는 않겠고, MobX state tree 정의 관련 부분만을 적겠다.

###### models/User.js
```javascript
import {types} from 'mobx-state-tree';
import Department from './Department';

const Item = types.model('User', {
  id: types.maybe(types.number),
  name: types.string,
  age: types.optional(types.maybe(types.number), 20),
  deaprtment: types.maybe(Department),
})
.views(self => ({
  get deaprtmentName() {
    return self.department ? self.department.name : '';
  },
}))
.actions(self => ({
  setProperty(key, value) {
    self[key] = value;
  }
  validate() {
    return self.age >= 20;
  },
}));

export default types.late(() => Item);
```

`export default Item`을 해도 되지만 `types.late(() => Item)`을 한 이유는 model 간의 circular refernece가 있을시 오류를 방지하기 위함이다. `types.model`이 서로 참조하는 경우가 없는 경우라면 `types.late`작업을 굳이 할 필요가 없다.

###### stores/UserStore.js
```javascript
import {types, flow} from 'mobx-state-tree';
import User from '@models/User';
import apis from '@apis';

export default types.model('UserStore', {
  users: types.array(Item),
  searchKeyword: '',
  isUsersLoaded: false,
})
.views(self => ({
  get filteredUsers() {
    const filterSearchKeyword =
      self.searchKeyword !== ''
        ? user => user.name.indexOf(self.searchKeyword) >= 0
        : user => user;

    return self.users
      .filter(filterSearchKeyword);
  }
}))
.actions(self => ({
  loadUsers: flow(function* loadUsers(reload=false) {
    if (reload || !self.isUsersLoaded) {
      self.users = yield apis.items.index();
      self.isUsersLoaded = true;
    }
  }),
}));
```

##### stores/index.js
```javascript
import makeInspectable from 'mobx-devtools-mst';
import {types} from 'mobx-state-tree';

import UserStore from './UserStore';

const userStore = UserStore.create({
  users: [],
});

const stores = {
  userStore,
};

export default stores;

makeInspectable(userStore);
```

###### page/user.js
```javascript
import React, {Fragment} from 'react';
import {inject, observer} from 'mobx-react';
import {shape} from 'prop-types';

@inject('userStore')
@observer
class UserPage extends React.Component {
  static propTypes = {
    userStore: shape().isRequired,
  };

  componentWillMount() {
    const { 
      userStore: {loadUsers},
     } = this.props;
    loadUsers();
  }

  render() {
    const {userStore:{filteredUsers}} = this.props;
    return (
      <Fragment>
        <ul>
          {
            filterdUsers.map(user => 
              <li>{user.age}세 {user.name} 님</li>)
          }
        </ul>      
      </Fragment>
    );
  }
}

export default UserPage;
```

#### 위 구성의 불편한 점

위에 방식으로 사용하다 보니 불편한 점이 있었다.

1. store 간에 값을 전달하는 경우, A store 에서 B store의 값을 변경해야 하는 경우.
2. A store와 B store의 값을 합쳐서 observable한 view를 만들어야 하는 경우

서로 다른 2개의 tree가 서로 interaction해야하거나 join하는 경우에는 대해서 해결책이 전혀 없는건 아니었지만 자연스럽지 않았다.

store간의 interaction의 경우 React.component에서 해당 작업을 해줬으며, join하여 obserable한 무언가를 만들어야 하는 경우에는 join하여 obserable한 특징을 잃어버리지 전에 어떻게든 그 2개의 값을 이용하도록 구성하여 다시 실행되는 것을 보장받도록 하였다.

#### rootStore로 구성

결국 tree를 하나로 합쳤다. **rootStore**를 만들어두고 그 안에 모든 store를 다 포함시켰다. 이 방법이 장점만 있는 것은 아니다. `@inject(userStore)` 이런식으로 이제는 injection을 받지 못하고 무조건 `@inject(stores)`로 injection받아야 한다. 그러면서 기존의 코드들을 다 수정해야 했었는데, 그 과정은 의외로 간단했다. 대부분의 경우 `const {userStore:{filteredUsers}} = this.props;` 이런 방법으로 destruct하여 사용하는데, 여기에 `.stores`만 추가하여 `const {userStore:{filteredUsers}} = this.props.stores;` 또는 `const {stores:{userStore:{filteredUsers}}} = this.props;` 식으로만 해주면 되었다. **eslint**를 잘 지켜서 destruction을 잘 지켜준 코드라면 쉽게 변환이 가능하다.

그렇게 수정을 하면 아래와 같은 모양이 된다.

###### stores/UserStore.js

위 코드와 변함이 없다.

##### stores/index.js
```javascript
import makeInspectable from 'mobx-devtools-mst';
import {types} from 'mobx-state-tree';

import UserStore from './UserStore';

const userStore = UserStore.create({
  users: [],
});

const StoreStore = types.model('RootStore', {
  userStore: types.maybe(UserStore),
});

const stores = StoreStore.create({
  userStore,
});

export default stores;

makeInspectable(stores);
```

###### page/user.js
```javascript
import React, {Fragment} from 'react';
import {inject, observer} from 'mobx-react';
import {shape} from 'prop-types';

@inject('stores')
@observer
class UserPage extends React.Component {
  static propTypes = {
    stores: shape().isRequired,
  };

  componentWillMount() {
    const { 
      userStore: {loadUsers},
     } = this.props.stores;
    loadUsers();
  }

  render() {
    const {userStore:{filteredUsers}} = this.props.stores;
    return (
      <Fragment>
        <ul>
          {
            filterdUsers.map(user => 
              <li>{user.age}세 {user.name} 님</li>)
          }
        </ul>      
      </Fragment>
    );
  }
}

export default UserPage;
```

코드에서 변한 곳이 많지 않다. `stores/index.js`에서 약간의 변경이 있었으며 사용하는 곳에서는 `@inject`하는 곳과 `this.props`를 destruct해주는 곳 뿐이다. 이제 모든 tree가 **rootStore**안에 있으므로 `getParent(self)`구문을 통해서 interaction이 가능해졌다. 이렇게 구성하는게 과연 정답인지에 대해서는 사실 잘 모르겠다. 분명 더 좋고 효과적인 방법이 있을꺼란 생각은 든다. store 상에 구현한 state를 React.component의 state로 더 이관을 한다던지 등의 노력으로 전체적인 구성을 바꾼다면 더 사용하기 편리한 구조가 될 수 있을것이라는 막연한 생각만 있을 뿐이다. 좀 더 고민할 시간적 여유가 된다면 ? 또는 이 방법으로 불편한 점이 계속 발견되어서 구조 변경을 고민하지 않을 수 없을 시점이 된다면 또 고민할 것이다.

#### 기타 MobX state tree 관련 활용 팁

##### 1. Inheritance

**Mobx state tree**의 **types.model**의 경우 Javascript의 class가 아니어서 IDE나 Editor의 도움을 받기 어렵다. 그 뿐만 아니라 class가 아니라는 이유로 abstract class나 interface의 활용도 힘들고, inheritance도 지원되지 않는다. 라고 생각했으나 다행히 inheritance의 기능은 지원해 주었다. type composition를 통해서 미리 만들어 놓은 **types.model**에 다른 이름을 붙이고(`.named`), `props, views, actions`를 추가할 수 있다.

<https://github.com/mobxjs/mobx-state-tree#simulate-inheritance-by-using-type-composition>

처음엔 이것을 이용하여 store나 model을 구현하였는데, 상속받는 모든 곳에서 사용하지 않는 기능에 대해서도 base쪽에 정의를 해야했고, 그러니 사용하는 쪽에서 불편한 점이 있어서 **class**의 **inheritance**를 모방한 방법을 사용하지 않고 **mixin**을 모방하기로 결정했다.

##### 2. Mixin

위 [Link](https://github.com/mobxjs/mobx-state-tree#simulate-inheritance-by-using-type-composition) 에서 볼 수 있듯 `.compose`에 여러 개의 `types.model`을 넣을 수 있다.

이것을 이용해서 multiple inheritance 처럼 활용할 수도 있었으나 `mixin` 형식으로 사용하기로 결정했다. 그러기 위해서는 아래의 규칙을 지켰다.

1. `mixin model`에는 `props`를 가지지 않는다. 단, 해당 mixin안에서만 사용하고 외부에서는 몰라도 되는 state는 props로 가져도 된다.
2. `mixin model`에서 사용할 원래 model의 `props, views, actions`을 options를 통해서 생성시 전달받는다. props, views, actions를 생성하는 구문을 보면 **JSON Object** 같이 key : value 로 이루어져 있다. 그래서 거기서 사용하는 명칭을 string으로 주입받아서 사용하고, 정의하는게 가능하다. 라고 판단했으나... views는 제대로 되지 않았다. ㅠㅠ
3. `views`의 경우에는 어쩔수 없이 `mixin model`안에서 구현을 하고 그것을 사용하는 `types.model`에서는 views를 통해서 alias를 제공한다.

위 규칙을 지키면 `types.model`을 사용하는 입장에서 `mixin model`안에 코드를 열어보지 않더라도, `types.model`을 보면 사용하는 모든 `props, views, actions`의 이름 확인이 가능하게 된다.

간단한 예제 코드는 다음과 같다.

###### ListMixin.js
```javascript
import {types, flow} from 'mobx-state-tree';

export default options => {
  const [list, isListLoading] = options.props;
  const [loadList] = options.actions;
  const {api} = options;

  const mixin = types.model()
  .views(self => ({
    get simpleList() {
      return self[list].map(element => ({id: element.id, name: element.name}))
    }
  }))
  .actions(self => {
    const actions = {};
    actions[loadList] = flow(function* loadListFunction(reload=false) {
      if (reload || !self[isListLoading]) {
        self[isListLoading] = true;
        self[list] = yield api.index();
        self[isListLoading] = false;
      }
    });

    return actions;
  });
  return mixin;
};
```

###### UserStore.js
```javascript
import {types, flow} from 'mobx-state-tree';
import User from '@models/User';
import {ListMixin, BaseStore} from '@mixins';
import apis from '@apis';

export default types
.compose(
  BaseStore,
  ListMixin({
    props: ['users', 'isUsersLoaded'],
    actions: ['loadUsers'],
    api: apis.users
  })
)
.named('DiscountStore')
.props({
  users: types.array(Item),
  searchKeyword: '',
  isUsersLoaded: false,
})
.views(self => ({
  get simpleUsers() { 
    return self.simpleList; 
  },
  get filteredUsers() {
    const filterSearchKeyword =
      self.searchKeyword !== ''
        ? user => user.name.indexOf(self.searchKeyword) >= 0
        : user => user;

    return self.users
      .filter(filterSearchKeyword);
  }
}));
```

`UserStore.js`에서 `props, views, actions` 와 compose 내의 mixin에서 `actions`에 list로 전달된 이름을 보면 사용가능한 모든 이름의 확인이 가능하다.

#### 마치며...

아직 지금 사용하고 있는 것이 과연 맞는 방법인지에 대해서 확신이 서지는 않는다. 아직 사용하는 곳이 많지 않은 것인지... 사용 사례를 찾아보기 쉽지 않아서, 혹시 비슷한 고민을 하시는 분이 있을 수 있을거라 생각이 들어서 현재 사용하고 있는 방법에 대해서 간단히 소개해 보았다.

혹시 비슷한 고민을 하다가 다른 선택을 했는 분이 계시면 사례 공유 부탁드리겠습니다. 그리고, 프론트 개발은 이제 3개월 남짓 된 상태라 잘못 이해하고 사용하는 것을 발견하신 분은 피드백 부탁드리겠습니다.
