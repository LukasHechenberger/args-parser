import Emitter from 'events';
import Option, { OptionType } from './Option';

/**
 * The regular expression used to parse arguments.
 * @type {RegExp}
 */
export const ArgRegExp = /^(-*)((no-)?([^=]+))(=(.*))?$/;

/**
 * An event emitter that parses arguments for the given options.
 */
export default class Parser extends Emitter {

  /**
   * Creates a new parser with the given options.
   * @param {Parser.Options} options The options to use.
   */
  constructor(options = { options: {} }) {
    super();

    /**
     * The parser options used.
     * @type {Parser.ParserOptions}
     */
    this._parserOptions = options;
    this._parserOptions.alias = {};

    // Insert default (--) for stopParsing
    if (options.stopParsing === true) {
      this._parserOptions.stopParsing = '--';
    }

    // "Cast" options to Option
    const opts = options.options || {};
    this._parserOptions.options = Object.keys(opts)
      .reduce((obj, key) => {
        const rawOpt = opts[key];
        const opt = (rawOpt instanceof Option) ? rawOpt : new Option(rawOpt);

        if (opt.alias) {
          this._parserOptions.alias[opt.alias] = { opt, id: key };
        }

        return Object.assign(obj, {
          [key]: opt,
        });
      }, {});

    // Init parser variables
    /**
     * Whether or not the parser is stopped.
     * @type {boolean}
     */
    this._stopped = false;

    /**
     * `false` if not option expects a value or the option that expects the value.
     * @type {boolean|{ arg: string, def: Option, id: string }}
     */
    this._expectValue = false;

    /**
     * The resulting options.
     * @type {Object}
     * @property {string[]} _ The arguments that were not handled.
     */
    this.options = { _: [] };
  }

  /**
   * Adds a non-option arguments to the results.
   * @param {string} arg The argument to add.
   * @emits {string} Emits a `non-option` event with `arg` passed.
   */
  _addNonOption(arg) {
    this.emit('non-option', arg);

    this.options._.push(arg);
  }

  /**
   * Adds an argument that was not handled to the results.
   * @param {string} arg The argument that was not handled.
   * @emits {string} Emits a `not-handled` event with `arg` passed.
   */
  _addNotHandled(arg) {
    this.emit('not-handled', arg);

    this._addNonOption(arg);
  }

  /**
   * Adds an ignored argument to the results.
   * @param {string} arg The argument that was ignored.
   * @emits {string} Emits a `ignored` event with `arg` passed.
   */
  _addIgnored(arg) {
    this.emit('ignored', arg);

    this._addNonOption(arg);
  }

  /**
   * Adds an option to the results.
   * @param {string} key The option's name.
   * @param {*} value The option's value.
   * @emits {*} Emits an event named after `key` with `value` passed.
   */
  _addOption(key, value) {
    this.emit(key, value);

    this.options[key] = value;
  }

  /**
   * Adds any options that unexpectedly got no value to the unhandled arguemnts.
   */
  _endExpectValue() {
    if (this._expectValue) {
      this._addNotHandled(this._expectValue.arg);
      this._expectValue = false;
    }
  }

  /**
   * Parses the given argument.
   * @param {string} arg The argument to parse.
   * @param {string[]} args The remaining arguments to parse.
   */
  _parseArg(arg, args) {
    if (this._parserOptions.stopParsing !== undefined && arg === this._parserOptions.stopParsing) {
      this._stopped = true;
    }

    // If stopped, add any args as nonOptions
    if (this._stopped) {
      this._endExpectValue();
      this._addIgnored(arg);
      return;
    }

    const m = arg.match(ArgRegExp);
    const isOption = Boolean(m[1]);
    const isShortOption = m[1] === '-';
    let id = m[2];
    const negateBool = m[3] !== undefined;
    const implicitValue = m[6];

    // Handle option args
    if (isOption) {
      this._endExpectValue();

      // Handle combined short options
      if (isShortOption && m[2].length > 1) {
        // Combined short options (e.g. -ab) are added again as single args (-a and -b)
        m[2].split('').reverse().forEach(o => args.unshift(`-${o}`));
        return;
      }

      let def;

      if (isShortOption) {
        const alias = this._parserOptions.alias[id];
        if (alias) {
          def = alias.opt;
          id = alias.id;
          m[2] = alias.id;
        }
      } else {
        def = this._parserOptions.options[id];
      }

      if (!def && negateBool) {
        def = this._parserOptions.options[m[4]];

        if (def && def.type === OptionType.Boolean) {
          id = m[4];
        } else {
          def = undefined;
        }
      }

      // Handle known options
      if (def) {
        if (def.requiresValue) {
          // Set implicit value if given
          if (implicitValue) {
            const val = def.parsedValue(implicitValue);

            if (val !== null) {
              this._addOption(id, val);
              // this.options[id] = val;
            } else {
              this._addNotHandled(arg);
            }
          } else {
            // Wait for value
            this._expectValue = { arg, id, def };
          }
        } else {
          // Set boolean values
          this._addOption(id, id === m[2] || !negateBool);
        }
      } else {
        // Report unknown option
        this._addNotHandled(arg);
      }
    } else if (this._expectValue) { // Handle option values
      const expect = this._expectValue;
      const val = expect.def.parsedValue(arg);

      if (val !== null) {
        this._addOption(expect.id, val);
        // this.options[expect.id] = val;
      } else {
        this._addNotHandled(expect.arg);
        this._addNotHandled(arg);
      }

      this._expectValue = false;
    } else { // Add non-options
      this._addNonOption(arg);
    }
  }

  /**
   * Parses the given arguments.
   * @param {string[]} args The arguments to parse.
   * @return {Object} The resulting options.
   */
  parse(args) {
    const _args = args
      .map(a => a.trim())
      .filter(a => a !== '');

    while (_args.length > 0) {
      this._parseArg(_args.shift(), _args);
    }

    this._endExpectValue();

    return this.options;
  }

  /**
   * Creates a new parser with the given options and returns the results of it parsing the given
   * arguments.
   * @param {string[]} args The arguments to parse.
   * @param {Parser.Options} options The options to create the parser with.
   * @return {Object} The parsed options.
   */
  static parse(args, options) {
    return (new this(options)).parse(args);
  }

}

/**
 * Options a {@link Parser} can be created with.
 * @typedef {Object} Parser.Options
 * @property {Map<String, Option|Object|string>} [options] The options allowed. Any
 * non-{@link Option} values will be converted to {@link Option}s by passing them to
 * {@link Option#constructor} directly.
 * @property {boolean|string} [stopParsing=false] The string to stop parsing after. Defaults to `--`
 * if set to `true`.
 */

/**
 * Options a {@link Parser} uses to parse arguments.
 * @typedef {Object} Parser.ParserOptions
 * @property {Map<String, Option>} [options={}] The options allowed.
 * @property {Map<String, {id: string, opt: Option}>} [alias={}] The aliases in use.
 * @property {boolean|string} [stopParsing=false] The string to stop parsing after or `false`.
 */
