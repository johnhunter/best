const { add } = require('./lib.js');

describe('circus test', () => {
  it('works', () => {
    expect(1).toBe(1);
  });
});

describe('second circus test', () => {
  it(`doesn't work`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(add(1, 1)).toBe(2);
  });
});
