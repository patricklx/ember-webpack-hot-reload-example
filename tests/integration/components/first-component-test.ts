import { module, test } from 'qunit';
import { setupRenderingTest } from 'hot-reload/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | first-component', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<FirstComponent />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <FirstComponent>
        template block text
      </FirstComponent>
    `);

    assert.dom().hasText('template block text');
  });
});
