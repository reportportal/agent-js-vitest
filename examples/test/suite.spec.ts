import { assert, describe, expect, it } from 'vitest';

describe('suite name', () => {
  it.skip('foo', () => {
    assert.equal(Math.sqrt(4), 2);
  })

  it('bar', (context) => {
    context.skip();
    expect(1 + 1).eq(2);
  })

  it('snapshot', () => {
    console.log('12345');
    expect({ foo: 'bar' }).toMatchSnapshot();
  })
});

describe('empty suite', () => {
  console.log('empty suite log');
});
