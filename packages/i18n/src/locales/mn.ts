import { FormKitValidationMessages } from '@formkit/validation'

/**
 * Here we can import additional helper functions to assist in formatting our
 * language. Feel free to add additional helper methods to libs/formats if it
 * assists in creating good validation messages for your locale.
 */
import { sentence as s, list, date, order } from '../formatters'
import { FormKitLocaleMessages } from '../i18n'

/**
 * Standard language for interface features.
 * @public
 */
const ui: FormKitLocaleMessages = {
  /**
   * Shown on a button for adding additional items.
   */
  add: 'Нэмэх',
  /**
   * Shown when a button to remove items is visible.
   */
  remove: 'Хасах',
  /**
   * Shown when there are multiple items to remove at the same time.
   */
  removeAll: 'Бүгдийг хасах',
  /**
   * Shown when all fields are not filled out correctly.
   */
  incomplete: 'Уучлраарай, зарим нүдэн дахь өгөгдөл дутуу байна.',
  /**
   * Shown in a button inside a form to submit the form.
   */
  submit: 'Илгээх',
  /**
   * Shown when no files are selected.
   */
  noFiles: 'Файл сонгоогүй байна',
  /**
   * Shown on buttons that move fields up in a list.
   */
  moveUp: 'Дээшээ',
  /**
   * Shown on buttons that move fields down in a list.
   */
  moveDown: 'Доошоо',
  /**
   * Shown when something is actively loading.
   */
  isLoading: 'Ачааллаж байна...',
  /**
   * Shown when there is more to load.
   */
  loadMore: 'Нэмж ачааллах',
  /**
   * Show on buttons that navigate state forward
   */
  next: 'Дараагийн',
  /**
   * Show on buttons that navigate state backward
   */
  prev: 'Өмнөх',
  /**
   * Shown when adding all values.
   */
  addAllValues: 'Бүх утгуудыг нэмэх',
  /**
   * Shown when adding selected values.
   */
  addSelectedValues: 'Сонгогдсон утгуудыг нэмэх',
  /**
   * Shown when removing all values.
   */
  removeAllValues: 'Бүх утгуудыг устгах',
  /**
   * Shown when removing selected values.
   */
  removeSelectedValues: 'Сонгогдсон утгуудыг хасах',
  /**
   * Shown when there is a date to choose.
   */
  chooseDate: 'Огноо сонгох',
  /**
   * Shown when there is a date to change.
   */
  changeDate: 'Огноо өөрчлөх',
  /**
   * Shown when there is something to close
   */
  close: 'Хаах',
  /**
   * Shown when there is something to open.
   */
  open: 'Нээлттэй',
}

/**
 * These are all the possible strings that pertain to validation messages.
 * @public
 */
const validation: FormKitValidationMessages = {
  /**
   * The value is not an accepted value.
   * @see {@link https://formkit.com/essentials/validation#accepted}
   */
  accepted({ name }): string {
    /* <i18n case="Shown when the user-provided value is not a valid 'accepted' value."> */
    return `${name} утгыг зөвшөөрнө үү.`
    /* </i18n> */
  },

  /**
   * The date is not after
   * @see {@link https://formkit.com/essentials/validation#date-after}
   */
  date_after({ name, args }) {
    if (Array.isArray(args) && args.length) {
      /* <i18n case="Shown when the user-provided date is not after the date supplied to the rule."> */
      return `${s(name)} нь ${date(args[0])}-ны дараа орох ёстой.`
      /* </i18n> */
    }
    /* <i18n case="Shown when the user-provided date is not after today's date, since no date was supplied to the rule."> */
    return `${s(name)} утга ирээдүйг заах ёстой.`
    /* </i18n> */
  },

  /**
   * The value is not a letter.
   * @see {@link https://formkit.com/essentials/validation#alpha}
   */
  alpha({ name }) {
    /* <i18n case="Shown when the user-provided value contains non-alphabetical characters."> */
    return `${s(name)} зөвхөн үсэг агуулах ёстой.`
    /* </i18n> */
  },

  /**
   * The value is not alphanumeric
   * @see {@link https://formkit.com/essentials/validation#alphanumeric}
   */
  alphanumeric({ name }) {
    /* <i18n case="Shown when the user-provided value contains non-alphanumeric characters."> */
    return `${s(name)} зөвхөн үсэг болон тоог агуулах ёстой.`
    /* </i18n> */
  },

  /**
   * The value is not letter and/or spaces
   * @see {@link https://formkit.com/essentials/validation#alpha-spaces}
   */
  alpha_spaces({ name }) {
    /* <i18n case="Shown when the user-provided value contains non-alphabetical and non-space characters."> */
    return `${s(name)} зөвхөн үсэг болон зай агуулах ёстой.`
    /* </i18n> */
  },

  /**
   * The date is not before
   * @see {@link https://formkit.com/essentials/validation#date-before}
   */
  date_before({ name, args }) {
    if (Array.isArray(args) && args.length) {
      /* <i18n case="Shown when the user-provided date is not before the date supplied to the rule."> */
      return `${s(name)} нь ${date(args[0])}-ны өмнө байх ёстой.`
      /* </i18n> */
    }
    /* <i18n case="Shown when the user-provided date is not before today's date, since no date was supplied to the rule."> */
    return `${s(name)} өнгөрсөн огноо байх ёстой.`
    /* </i18n> */
  },

  /**
   * The value is not between two numbers
   * @see {@link https://formkit.com/essentials/validation#between}
   */
  between({ name, args }) {
    if (isNaN(args[0]) || isNaN(args[1])) {
      /* <i18n case="Shown when any of the arguments supplied to the rule were not a number."> */
      return `Энэ нүдэн дэхь өгөгдөл буруу учраас илгээх боломжгүй.`
      /* </i18n> */
    }
    const [a, b] = order(args[0], args[1])
    /* <i18n case="Shown when the user-provided value is not between two numbers."> */
    return `${s(name)} нь заавал ${a}, ${b} хоёрын дунд байх ёстой.`
    /* </i18n> */
  },

  /**
   * The confirmation field does not match
   * @see {@link https://formkit.com/essentials/validation#confirm}
   */
  confirm({ name }) {
    /* <i18n case="Shown when the user-provided value does not equal the value of the matched input."> */
    return `${s(name)} таарахгүй байна.`
    /* </i18n> */
  },

  /**
   * The value is not a valid date
   * @see {@link https://formkit.com/essentials/validation#date-format}
   */
  date_format({ name, args }) {
    if (Array.isArray(args) && args.length) {
      /* <i18n case="Shown when the user-provided date does not satisfy the date format supplied to the rule."> */
      return `${s(name)} нь хүчинтэй огноо биш тул ${
        args[0]
      } гэсэн огноог ашиглаарай.`
      /* </i18n> */
    }
    /* <i18n case="Shown when no date argument was supplied to the rule."> */
    return 'Энэхүү нүд буруу тул цааш илгээх боломжгүй.'
    /* </i18n> */
  },

  /**
   * Is not within expected date range
   * @see {@link https://formkit.com/essentials/validation#date-between}
   */
  date_between({ name, args }) {
    /* <i18n case="Shown when the user-provided date is not between the start and end dates supplied to the rule. "> */
    return `${s(name)} нь заавал ${date(args[0])}, ${date(
      args[1]
    )} хоёр огноон дунд байх ёстой.`
    /* </i18n> */
  },

  /**
   * Shown when the user-provided value is not a valid email address.
   * @see {@link https://formkit.com/essentials/validation#email}
   */
  email: 'Та хүчинтэй имейл хаягаа оруулна уу.',

  /**
   * Does not end with the specified value
   * @see {@link https://formkit.com/essentials/validation#ends-with}
   */
  ends_with({ name, args }) {
    /* <i18n case="Shown when the user-provided value does not end with the substring supplied to the rule."> */
    return `${s(name)} нь ${list(args)} гэсэн утгаар төгсөөгүй байна.`
    /* </i18n> */
  },

  /**
   * Is not an allowed value
   * @see {@link https://formkit.com/essentials/validation#is}
   */
  is({ name }) {
    /* <i18n case="Shown when the user-provided value is not one of the values supplied to the rule."> */
    return `${s(name)} нь зөвшөөрөгдөх утга биш.`
    /* </i18n> */
  },

  /**
   * Does not match specified length
   * @see {@link https://formkit.com/essentials/validation#length}
   */
  length({ name, args: [first = 0, second = Infinity] }) {
    const min = Number(first) <= Number(second) ? first : second
    const max = Number(second) >= Number(first) ? second : first
    if (min == 1 && max === Infinity) {
      /* <i18n case="Shown when the length of the user-provided value is not at least one character."> */
      return `${s(name)} дээр хаяж нэг үсэг байх ёстой`
      /* </i18n> */
    }
    if (min == 0 && max) {
      /* <i18n case="Shown when first argument supplied to the rule is 0, and the user-provided value is longer than the max (the 2nd argument) supplied to the rule."> */
      return `${s(name)}-н урт нь ${max}-ээс ихгүй байх ёстой.`
      /* </i18n> */
    }
    if (min === max) {
      /* <i18n case="Shown when first and second argument supplied to the rule are the same, and the user-provided value is not any of the arguments supplied to the rule."> */
      return `${s(name)} нь ${max} урт байвал зүгээр.`
      /* </i18n> */
    }
    if (min && max === Infinity) {
      /* <i18n case="Shown when the length of the user-provided value is less than the minimum supplied to the rule and there is no maximum supplied to the rule."> */
      return `${s(name)}-н урт нь ${min}-ээс их буюу тэнцүү байж болно.`
      /* </i18n> */
    }
    /* <i18n case="Shown when the length of the user-provided value is between the two lengths supplied to the rule."> */
    return `${s(name)}-н урт нь ${min}, ${max} хоёрын дунд байх ёстой.`
    /* </i18n> */
  },

  /**
   * Value is not a match
   * @see {@link https://formkit.com/essentials/validation#matches}
   */
  matches({ name }) {
    /* <i18n case="Shown when the user-provided value does not match any of the values or RegExp patterns supplied to the rule. "> */
    return `${s(name)} нь зөвшөөрөгдөх утга биш.`
    /* </i18n> */
  },

  /**
   * Exceeds maximum allowed value
   * @see {@link https://formkit.com/essentials/validation#max}
   */
  max({ name, node: { value }, args }) {
    if (Array.isArray(value)) {
      /* <i18n case="Shown when the length of the array of user-provided values is longer than the max supplied to the rule."> */
      return `${name} нь ${args[0]}-аас их байж болохгүй.`
      /* </i18n> */
    }
    /* <i18n case="Shown when the user-provided value is greater than the maximum number supplied to the rule."> */
    return `${s(name)} нь ${args[0]}-тай тэнцүү эсвэл бага байх ёстой.`
    /* </i18n> */
  },

  /**
   * The (field-level) value does not match specified mime type
   * @see {@link https://formkit.com/essentials/validation#mime}
   */
  mime({ name, args }) {
    if (!args[0]) {
      /* <i18n case="Shown when no file formats were supplied to the rule."> */
      return 'Файлын формат буруу.'
      /* </i18n> */
    }
    /* <i18n case="Shown when the mime type of user-provided file does not match any mime types supplied to the rule."> */
    return `${s(name)} төрөл нь ${args[0]} байх ёстой.`
    /* </i18n> */
  },

  /**
   * Does not fulfill minimum allowed value
   * @see {@link https://formkit.com/essentials/validation#min}
   */
  min({ name, node: { value }, args }) {
    if (Array.isArray(value)) {
      /* <i18n case="Shown when the length of the array of user-provided values is shorter than the min supplied to the rule."> */
      return `${name} нь ${args[0]}-аас их байж болохгүй.`
      /* </i18n> */
    }
    /* <i18n case="Shown when the user-provided value is less than the minimum number supplied to the rule."> */
    return `${name} нь дор хаяж ${args[0]}-тай тэнцүү байх ёстой.`
    /* </i18n> */
  },

  /**
   * Is not an allowed value
   * @see {@link https://formkit.com/essentials/validation#not}
   */
  not({ name, node: { value } }) {
    /* <i18n case="Shown when the user-provided value matches one of the values supplied to (and thus disallowed by) the rule."> */
    return `“${value}” бол зөвшөөрөгдөх ${name} гэсэн утга биш.`
    /* </i18n> */
  },

  /**
   *  Is not a number
   * @see {@link https://formkit.com/essentials/validation#number}
   */
  number({ name }) {
    /* <i18n case="Shown when the user-provided value is not a number."> */
    return `${s(name)} зөвхөн тоо байх ёстой.`
    /* </i18n> */
  },

  /**
   * Required field.
   * @see {@link https://formkit.com/essentials/validation#required}
   */
  required({ name }) {
    /* <i18n case="Shown when a user does not provide a value to a required input."> */
    return `${s(name)} байх ёстой.`
    /* </i18n> */
  },

  /**
   * Does not start with specified value
   * @see {@link https://formkit.com/essentials/validation#starts-with}
   */
  starts_with({ name, args }) {
    /* <i18n case="Shown when the user-provided value does not start with the substring supplied to the rule."> */
    return `${s(name)} нь ${list(args)}-ээр эхлээгүй байна.`
    /* </i18n> */
  },

  /**
   * Is not a url
   * @see {@link https://formkit.com/essentials/validation#url}
   */
  url() {
    /* <i18n case="Shown when the user-provided value is not a valid url."> */
    return `Хүчннтай URL оруулна уу.`
    /* </i18n> */
  },
  /**
   * Shown when the date is invalid.
   */
  invalidDate: 'Сонгосон огноо буруу байна.',
}

export const mn = { ui, validation }
