import 'mocha';
import { assert } from 'chai';

import SyncStage from '../src/index';

describe('SyncStage', () => {
  it('should have a init function', () => {
    assert.isFunction(SyncStage, 'init');
  });
});
