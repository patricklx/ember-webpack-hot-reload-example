import Component from '@glimmer/component';
import printNumber from 'hot-reload/helpers/print-number';

if (import.meta.webpackHot) {
  _imports__ = new class {
    @_tracked template = template;
    @_tracked printNumber = printNumber
  }()
}


export default class Test extends Component {
  number = 3;
  number2 = 5;
  <template>
    Welcome {{this.number}} {{this.number2}}
    <br />

    {{printNumber}}

  </template>
}



