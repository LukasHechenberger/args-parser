/**
 * Possible types for {@link Option}s.
 * @type {Object}
 * @property {string} Boolean Boolean option type.
 * @property {string} String String option type.
 * @property {string} Number Number option type.
 */
export const OptionType = {
  Boolean: 'boolean',
  String: 'string',
  Number: 'number',
};

const OptionTypeValues = Object.keys(OptionType).map(k => OptionType[k]);

/**
 * Option definition that can be parse by {@link Parser}.
 */
export default class Option {

  /**
   * Creates a new option based on a description or some options. If a string is passed
   * {@link Option#type} is set to {@link OptionType.Boolean} by default.
   * @param {string|Option.Options} descOrOptions The description or options used to create the
   * Option.
   */
  constructor(descOrOptions = {}) {
    if (typeof descOrOptions === 'string') {
      /**
       * A short string describing the option.
       * @type {string}
       */
      this.description = descOrOptions;

      /**
       * The option's type. One of {@link OptionType}.
       * @type {string}
       */
      this.type = OptionType.Boolean;
    } else {
      const type = descOrOptions.type;
      if (type !== undefined && !OptionTypeValues.includes(type)) {
        throw new Error(`Invalid type ${type}`);
      }

      this.description = descOrOptions.description;
      this.type = type || OptionType.Boolean;

      /**
       * The alias to use for the option.
       * @type {string}
       */
      this.alias = descOrOptions.alias;
    }
  }

  /**
   * Whether or not the option requires a value to be passed.
   * @type {boolean}
   */
  get requiresValue() {
    return this.type !== OptionType.Boolean;
  }

  /**
   * Casts the given value to the appropriate type. If an invalid value is passed null is returned.
   * @param {string} value The value to parse.
   * @return {?*} The parsed value or null.
   */
  parsedValue(value) {
    if (this.type === OptionType.Number) {
      const n = Number(value);

      return Number.isNaN(n) ? null : n;
    }

    return value;
  }

}

/**
 * Options an {@link Option} can be created with.
 * @typedef {Object} Option.Options
 * @property {string} [description] A short string describing the option.
 * @property {string} [type=OptionType.Boolean] The option's type. One of {@link OptionType}.
 * @property {string} [alias] The alias to use for the option.
 */
