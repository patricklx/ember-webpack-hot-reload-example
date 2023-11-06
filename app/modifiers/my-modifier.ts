import { modifier } from 'ember-modifier';

export default modifier(function myModifier(element /*, positional, named*/) {
  element.textContent = '10';
});
