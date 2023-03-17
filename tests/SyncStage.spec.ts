import 'mocha';
import { assert } from 'chai';

import SyncStage from '../src/SyncStage';

describe('SyncStage', () => {
  it('should have a init function', () => {
    assert.isFunction(SyncStage, 'init'); 
  });
});
