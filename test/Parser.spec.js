import expect from 'unexpected';
import { spy, stub } from 'sinon';

import Emitter from 'events';
import Parser from '../src/Parser';
import Option from '../src/Option';

/** @test {Parser} */
describe('Parser', function() {
  /** @test {Parser#constructor} */
  describe('#constructor', function() {
    it('should create an instance of emitter', function() {
      expect((new Parser({})), 'to be a', Emitter);
    });

    it('should store parser options', function() {
      const opts = { test: 123 };

      expect((new Parser(opts))._parserOptions, 'to equal', opts);
    });

    it('should set default value for options.stopParsing', function() {
      expect((new Parser({ stopParsing: true }))._parserOptions.stopParsing,
        'to equal', '--');
    });

    it('should cast options.options to option', function() {
      const description = 'Description';
      const option = new Option(description);
      const opts = (new Parser({ options: {
        bool: 'Description',
        string: { type: 'string', description },
        option,
      } }))._parserOptions.options;

      expect(opts.bool, 'to equal', new Option({ type: 'boolean', description }));
      expect(opts.string, 'to equal', new Option({ type: 'string', description }));
      expect(opts.option, 'to be', option);
    });

    it('should register aliases', function() {
      const opt = new Option({ alias: 't' });
      const parser = new Parser({ options: { test: opt } });

      expect(parser._parserOptions.alias.t, 'to equal', { opt, id: 'test' });
    });

    it('should work without options', function() {
      expect(() => new Parser(), 'not to throw');
    });
  });

  function testReporter(name, eventName, args = ['argument']) {
    const parser = new Parser({});

    it(`should emit ${eventName} event`, function() {
      const listener = spy();
      parser.on(eventName, listener);
      parser[`_add${name}`](...args);

      expect(listener.calledOnce, 'to be', true);
      expect(listener.lastCall.args, 'to equal', [args[args.length - 1]]);
    });
  }

  /** @test {Parser#_addNonOption} */
  describe('#_addNonOption', function() {
    testReporter('NonOption', 'non-option');
  });

  /** @test {Parser#_addNotHandled} */
  describe('#_addNotHandled', function() {
    testReporter('NotHandled', 'not-handled');
  });

  /** @test {Parser#_addIgnored} */
  describe('#_addIgnored', function() {
    testReporter('Ignored', 'ignored');
  });

  /** @test {Parser#_addOption} */
  describe('#_addOption', function() {
    testReporter('Option', 'opt', ['opt', 'val']);

    const parser = new Parser({ });

    it('should set option value', function() {
      parser._addOption('opt', true);

      expect(parser.options.opt, 'to equal', true);
    });

    it('should override on multiple values', function() {
      parser._addOption('opt', false);

      expect(parser.options.opt, 'to equal', false);
    });
  });

  /** @test {Parser#_endExpectValue} */
  describe('#_endExpectValue', function() {
    const parser = new Parser();

    it('should add any args that expect values', function() {
      parser._expectValue = { arg: '--arg' };
      parser._endExpectValue();

      expect(parser.options._, 'to equal', ['--arg']);
    });
  });

  /** @test {Parser#_parseArg} */
  describe('#_parseArg', function() {
    it('should add ignored args if stopped', function() {
      const parser = new Parser({ stopParsing: true });
      spy(parser, '_addIgnored');

      parser.parse(['--', 'additional']);
      expect(parser._addIgnored.callCount, 'to equal', 2);
      expect(parser._addIgnored.lastCall.args, 'to equal', ['additional']);
    });

    it('should report unknown options', function() {
      const parser = new Parser({ stopParsing: true });
      spy(parser, '_addNotHandled');

      parser.parse(['--unknown']);
      expect(parser._addNotHandled.calledOnce, 'to be', true);
      expect(parser._addNotHandled.lastCall.args, 'to equal', ['--unknown']);
    });

    it('should split combined short options', function() {
      const parser = new Parser({ options: {
        a: 'Description a',
        b: 'Description b',
      } });

      const args = ['-ab'];
      parser._parseArg(args.shift(), args);

      expect(args, 'to equal', ['-a', '-b']);
    });

    it('should set bool options', function() {
      const parser = new Parser({ options: { bool: 'Description' } });

      parser.parse(['--bool']);
      expect(parser.options, 'to have properties', { bool: true });
    });

    it('should set negated bool options', function() {
      const parser = new Parser({ options: { bool: 'Description' } });

      parser.parse(['--no-bool']);
      expect(parser.options, 'to have properties', { bool: false });
    });

    it('should ignore undefined negated options', function() {
      const parser = new Parser();
      const listener = spy();
      parser.on('not-handled', listener);

      parser.parse(['--no-bool']);
      expect(listener.calledOnce, 'to be true');
      expect(listener.lastCall.args, 'to equal', ['--no-bool']);
    });

    it('should ignore non-bool negated options', function() {
      const parser = new Parser({ options: { string: new Option({ type: 'string' }) } });
      const listener = spy();
      parser.on('not-handled', listener);

      parser.parse(['--no-string']);
      expect(listener.calledOnce, 'to be true');
      expect(listener.lastCall.args, 'to equal', ['--no-string']);
    });

    it('should store implicit value for non-boolean options', function() {
      const parser = new Parser({ options: { string: new Option({ type: 'string' }) } });

      parser.parse(['--string=Test']);
      expect(parser.options, 'to have properties', { string: 'Test' });
    });

    it('should ignore invalid implicit values', function() {
      const parser = new Parser({ options: { number: new Option({ type: 'number' }) } });
      const listener = spy();
      parser.on('not-handled', listener);

      parser.parse(['--number=Test']);
      expect(listener.calledOnce, 'to be true');
      expect(listener.lastCall.args, 'to equal', ['--number=Test']);
    });

    it('should expect value if none is given implicit', function() {
      const def = new Option({ type: 'number' });
      const parser = new Parser({ options: { number: def } });
      parser._parseArg('--number');

      expect(parser._expectValue, 'to equal', { arg: '--number', def, id: 'number' });
    });

    it('should ignore invalid expected values', function() {
      const parser = new Parser({ options: { number: new Option({ type: 'number' }) } });
      const listener = spy();
      parser.on('not-handled', listener);

      parser.parse(['--number', 'Test']);
      expect(listener.callCount, 'to equal', 2);
      expect(listener.getCall(0).args, 'to equal', ['--number']);
      expect(listener.lastCall.args, 'to equal', ['Test']);
    });

    it('should store valid expected values', function() {
      const parser = new Parser({ options: { number: new Option({ type: 'number' }) } });
      parser.parse(['--number', '13']);

      expect(parser.options, 'to have properties', { number: 13 });
    });

    it('should store any non-option arguments', function() {
      const parser = new Parser();
      const listener = spy();
      parser.on('non-option', listener);

      parser.parse(['test']);
      expect(listener.calledOnce, 'to be', true);
      expect(listener.lastCall.args, 'to equal', ['test']);
    });

    it('should handle aliases', function() {
      const parser = new Parser({ options: { test: { alias: 't' } } });
      const listener = spy();
      parser.on('test', listener);

      expect(listener.calledOnce, 'to be', true);
      expect(listener.lastCall.args, 'to equal', [true]);
    });
  });

  /** @test {Parser#parse} */
  describe('#parse', function() {
    let parser;

    beforeEach(function() {
      parser = new Parser({});
      stub(parser, '_parseArg');
    });

    it('should remove empty string arguments', function() {
      parser.parse(['', 'arg']);
      expect(parser._parseArg.calledOnce, 'to be', true);
      expect(parser._parseArg.lastCall.args[0], 'to equal', 'arg');
    });

    it('should trim arguments', function() {
      parser.parse([' padded']);
      expect(parser._parseArg.calledOnce, 'to be', true);
      expect(parser._parseArg.lastCall.args[0], 'to equal', 'padded');
    });
  });
});
