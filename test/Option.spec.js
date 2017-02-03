import expect from 'unexpected';

import Option, { OptionType } from '../src/Option';

/** @test {Option} */
describe('Option', function() {
  const description = 'Description';

  /** @test {Option#constructor} */
  describe('#constructor', function() {
    it('should work with string argument', function() {
      const option = new Option(description);
      expect(option, 'to equal', new Option({ description }));
    });

    it('should set default type `boolean`', function() {
      expect((new Option(description)).type, 'to equal', OptionType.Boolean);
      expect((new Option({ description })).type, 'to equal', OptionType.Boolean);
    });

    it('should work without any arguments', function() {
      expect(() => (new Option()), 'not to throw');
    });

    it('should throw with invalid type', function() {
      const type = 'invalid';
      expect(() => (new Option({ type })), 'to throw error', `Invalid type ${type}`);
    });
  });

  /** @test {Option#requiresValue} */
  describe('#requiresValue', function() {
    it('should return false for boolean options', function() {
      expect((new Option().requiresValue), 'to be', false);
    });

    it('should return true for any other type', function() {
      Object.keys(OptionType)
        .map(k => OptionType[k])
        .filter(type => type !== OptionType.Boolean)
        .forEach(type => expect((new Option({ type })).requiresValue, 'to be', true));
    });
  });

  /** @test {Option#parsedValue} */
  describe('#parsedValue', function() {
    it('should return parsed number value', function() {
      expect((new Option({ type: OptionType.Number }).parsedValue('13')), 'to equal', 13);
    });

    it('should return null if a number cannot be parsed', function() {
      expect((new Option({ type: OptionType.Number }).parsedValue('NaN')), 'to be', null);
    });

    it('should return original value for any other type', function() {
      const value = 'value';
      Object.keys(OptionType)
        .map(k => OptionType[k])
        .filter(type => ![OptionType.Number].includes(type))
        .forEach(type => expect((new Option({ type })).parsedValue(value), 'to be', value));
    });
  });
});
