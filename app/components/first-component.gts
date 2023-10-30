import Component from '@glimmer/component';
import printNumber from 'hot-reload/helpers/print-number';
import { tracked } from "@glimmer/tracking";


console.log('dsfadafgggfgasgsassddssd');

export default class Test extends Component {
  @tracked
  number = 3;

  number2 = 5;
  <template>
    Welcome hot {{this.number}} {{this.number2}}
    <br />

    {{printNumber}}

  </template>
}
