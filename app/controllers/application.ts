import Controller from '@ember/controller';
import FirstComponent from '../components/first-component';
import printNumber from 'hot-reload/helpers/print-number';
import myModifier from 'hot-reload/modifiers/my-modifier';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class ApplicationController extends Controller {
  @tracked renderA = false;
  FirstComponent = FirstComponent;
  printNumbers = printNumber;
  myModifier = myModifier;
  x= 11;



  @action
  toggleRender() {
    this.renderA = !this.renderA;
  }
}
