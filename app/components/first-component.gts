import Component from '@glimmer/component';

export default class Test extends Component {
  number = 3;
  number2 = 5;
  <template>
    Welcome {{this.number}} {{this.number2}}
  </template>
}

