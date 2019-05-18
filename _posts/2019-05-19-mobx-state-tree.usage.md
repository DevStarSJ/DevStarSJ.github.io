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
import React from 'react';
import {inject, observer} from 'mobx-react';
import {shape} from 'prop-types';
import _ from 'lodash';

import SearchBar from '@components/SearchBar';
import SortableTable from '@components/SortableTable';
import Layout from '@components/Layout';
import pricesToString from '@utils/numbers/pricesToString';
import Button from '@components/Button';
import Modal from '@components/Modal';
import ItemManagementSideBar from '../ItemManagementSideBar';
import styles from './styles.scss';


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
    );
  }
}

export default UserPage;

```
