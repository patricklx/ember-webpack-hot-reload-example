import Controller from '@ember/controller';
import FirstComponent from '../components/first-component';
import printNumber from 'hot-reload/helpers/print-number';
import myModifier from 'hot-reload/modifiers/my-modifier';
export default class ApplicationController extends Controller {
  FirstComponent = FirstComponent;
  printNumbers = printNumber;
  myModifier = myModifier;
  x=2;
}
