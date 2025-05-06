import {
  reactive,
  computed,
  ref,
  watch,
  markRaw,
  triggerRef,
  nextTick,
  isRef,
  isReactive,
} from 'vue'
import {
  FormKitPlugin,
  FormKitFrameworkContext,
  FormKitMessage,
  createClasses,
  createMessage,
  generateClassList,
  FormKitTypeDefinition,
} from '@formkit/core'
import {
  eq,
  has,
  camel,
  empty,
  undefine,
  cloneAny,
  shallowClone,
} from '@formkit/utils'
import { createObserver } from '@formkit/observer'
import { FormKitPseudoProps } from '@formkit/core'

/**
 * A plugin that creates Vue-specific context object on each given node.
 *
 * @param node - FormKitNode to create the context on.
 *
 * @public
 */
const vueBindings: FormKitPlugin = function vueBindings(node) {
  /**
   * Start a validity counter on all blocking messages.
   */
  node.ledger.count('blocking', (m) => m.blocking)
  const isValid = ref<boolean>(!node.ledger.value('blocking'))
  /**
   * Start an error message counter.
   */
  node.ledger.count('errors', (m) => m.type === 'error')
  const hasErrors = ref<boolean>(!!node.ledger.value('errors'))

  /**
   * Keep track of the first time a Vue tick cycle has passed.
   */
  let hasTicked = false
  nextTick(() => {
    hasTicked = true
  })

  /**
   * All messages with the visibility state set to true.
   */
  const availableMessages = reactive<Record<string, FormKitMessage>>(
    node.store.reduce((store, message) => {
      if (message.visible) {
        store[message.key] = message
      }
      return store
    }, {} as Record<string, FormKitMessage>)
  )
  /**
   * A flag that determines when validation messages should be displayed.
   */
  const validationVisibility = ref<string>(
    node.props.validationVisibility ||
      (node.props.type === 'checkbox' ? 'dirty' : 'blur')
  )
  node.on('prop:validationVisibility', ({ payload }) => {
    validationVisibility.value = payload
  })

  /**
   * Keep track of if this input has ever shown validation errors.
   */
  const hasShownErrors = ref(validationVisibility.value === 'live')

  /**
   * If the input is required or not, this is the only validation rule that
   * needs to be explicitly called out since it powers the aria-required attr.
   */
  const isRequired = ref<boolean>(false)
  const checkForRequired = (parsedRules?: Array<{ name: string }>) => {
    isRequired.value = (parsedRules ?? []).some(
      (rule) => rule.name === 'required'
    )
  }
  checkForRequired(node.props.parsedRules)
  node.on('prop:parsedRules', ({ payload }) => checkForRequired(payload))

  /**
   * An array of unique identifiers that should only be used for iterating
   * inside a synced list.
   */
  const items = ref(node.children.map((child) => child.uid))

  /**
   * The current visibility state of validation messages.
   */
  const validationVisible = computed<boolean>(() => {
    if (!context.state) return false
    if (context.state.submitted) return true
    if (!hasShownErrors.value && !context.state.settled) {
      return false
    }
    switch (validationVisibility.value) {
      case 'live':
        return true
      case 'blur':
        return context.state.blurred
      case 'dirty':
        return context.state.dirty
      default:
        return false
    }
  })

  /**
   * Determines if the input should be considered "invalid" — note that this is different than a valid input! A
   * valid input is one where the input is not loading, not pending validation, not unsettled, and passes all
   * validation rules. An invalid input is one whose validation rules are not explicitly not passing, and those rules
   * are visible to the user.
   */
  const isInvalid = computed<boolean>(() => {
    return context.state.failing && validationVisible.value
  })

  /**
   * Determines if the input should be considered "complete".
   */
  const isComplete = computed<boolean>(() => {
    return context && hasValidation.value
      ? isValid.value && !hasErrors.value
      : context.state.dirty && !empty(context.value)
  })

  /**
   * If the input has validation rules or not.
   */
  const hasValidation = ref<boolean>(
    Array.isArray(node.props.parsedRules) && node.props.parsedRules.length > 0
  )
  node.on('prop:parsedRules', ({ payload: rules }) => {
    hasValidation.value = Array.isArray(rules) && rules.length > 0
  })

  /**
   * All messages that are currently on display to an end user. This changes
   * based on the current message type visibility, like errorVisibility.
   */
  const messages = computed<Record<string, FormKitMessage>>(() => {
    const visibleMessages: Record<string, FormKitMessage> = {}
    for (const key in availableMessages) {
      const message = availableMessages[key]
      if (message.type !== 'validation' || validationVisible.value) {
        visibleMessages[key] = message
      }
    }
    return visibleMessages
  })

  /**
   * UI Messages.
   */
  const ui = reactive(
    node.store.reduce((messages, message) => {
      if (message.type === 'ui' && message.visible)
        messages[message.key] = message
      return messages
    }, {} as Record<string, FormKitMessage>)
  )

  const passing = computed<boolean>(() => !context.state.failing)

  /**
   * This is the reactive data object that is provided to all schemas and
   * forms. It is a subset of data in the core node object.
   */
  const cachedClasses = reactive<Record<string, string>>({})
  const classes = new Proxy(cachedClasses as Record<PropertyKey, string>, {
    get(...args) {
      if (!node) return ''
      const [target, property] = args
      let className: string | null = Reflect.get(...args)
      if (!className && typeof property === 'string') {
        if (!has(target, property) && !property.startsWith('__v')) {
          const observedNode = createObserver(node)
          observedNode.watch((node) => {
            const rootClasses =
              typeof node.config.rootClasses === 'function'
                ? node.config.rootClasses(property, node)
                : {}
            const globalConfigClasses = node.config.classes
              ? createClasses(property, node, node.config.classes[property])
              : {}
            const classesPropClasses = createClasses(
              property,
              node,
              node.props[`_${property}Class`]
            )
            const sectionPropClasses = createClasses(
              property,
              node,
              node.props[`${property}Class`]
            )
            className = generateClassList(
              node,
              property,
              rootClasses,
              globalConfigClasses,
              classesPropClasses,
              sectionPropClasses
            )
            target[property] = className ?? ''
          })
        }
      }
      return className
    },
  })

  node.on('prop:rootClasses', () => {
    const keys = Object.keys(cachedClasses)
    for (const key of keys) {
      delete cachedClasses[key]
    }
  })

  const describedBy = computed<string | undefined>(() => {
    if (!node) return undefined
    const describers = []
    if (context.help) {
      describers.push(`help-${node.props.id}`)
    }
    for (const key in messages.value) {
      describers.push(`${node.props.id}-${key}`)
    }
    return describers.length ? describers.join(' ') : undefined
  })

  const value = ref(node.value)
  const _value = ref(node.value)

  const context: FormKitFrameworkContext = reactive({
    _value,
    attrs: node.props.attrs,
    disabled: node.props.disabled,
    describedBy,
    fns: {
      length: (obj: Record<PropertyKey, any>) => Object.keys(obj).length,
      number: (value: any) => Number(value),
      string: (value: any) => String(value),
      json: (value: any) => JSON.stringify(value),
      eq,
    },
    handlers: {
      blur: (e?: Event) => {
        if (!node) return
        node.store.set(
          createMessage({ key: 'blurred', visible: false, value: true })
        )
        if (typeof node.props.attrs.onBlur === 'function') {
          node.props.attrs.onBlur(e)
        }
      },
      touch: () => {
        const doCompare = context.dirtyBehavior === 'compare'
        if (node.store.dirty?.value && !doCompare) return
        const isDirty = !eq(node.props._init, node._value)
        if (!isDirty && !doCompare) return
        node.store.set(
          createMessage({ key: 'dirty', visible: false, value: isDirty })
        )
      },
      DOMInput: (e: Event) => {
        node.input((e.target as HTMLInputElement).value)
        node.emit('dom-input-event', e)
      },
    },
    help: node.props.help,
    id: node.props.id as string,
    items,
    label: node.props.label,
    messages,
    didMount: false,
    node: markRaw(node),
    options: node.props.options,
    defaultMessagePlacement: true,
    slots: node.props.__slots,
    state: {
      blurred: false,
      complete: isComplete,
      dirty: false,
      empty: empty(value),
      submitted: false,
      settled: node.isSettled,
      valid: isValid,
      invalid: isInvalid,
      errors: hasErrors,
      rules: hasValidation,
      validationVisible,
      required: isRequired,
      failing: false,
      passing,
    },
    type: node.props.type,
    family: node.props.family,
    ui,
    value,
    classes,
  })

  /**
   * Ensure the context object is properly configured after booting up.
   */
  node.on('created', () => {
    if (!eq(context.value, node.value)) {
      _value.value = node.value
      value.value = node.value
      triggerRef(value)
      triggerRef(_value)
    }
    ;(async () => {
      await node.settled
      if (node) node.props._init = cloneAny(node.value)
    })()
  })

  /**
   * When the node mounts, set the didMount flag.
   */
  node.on('mounted', () => {
    context.didMount = true
  })

  /**
   * Sets the settled state.
   */
  node.on('settled', ({ payload: isSettled }) => {
    context.state.settled = isSettled
  })

  /**
   * Observes node.props properties explicitly and updates them in the context
   * object.
   * @param observe - Props to observe and register as context data.
   */
  function observeProps(observe: FormKitPseudoProps) {
    const propNames = Array.isArray(observe) ? observe : Object.keys(observe)
    propNames.forEach((prop) => {
      prop = camel(prop)
      if (!has(context, prop)) {
        context[prop] = node.props[prop]
      }
      node.on(`prop:${prop}`, ({ payload }) => {
        context[prop as keyof FormKitFrameworkContext] = payload
      })
    })
  }

  /**
   * We use a node observer to individually observe node props.
   */
  const rootProps = () => {
    const props = [
      '__root',
      'help',
      'label',
      'disabled',
      'options',
      'type',
      'attrs',
      'preserve',
      'preserveErrors',
      'id',
      'dirtyBehavior',
    ]
    const iconPattern = /^[a-zA-Z-]+(?:-icon|Icon)$/
    const matchingProps = Object.keys(node.props).filter((prop) => {
      return iconPattern.test(prop)
    })
    return props.concat(matchingProps)
  }
  observeProps(rootProps())

  /**
   * Once the input is defined, deal with it.
   * @param definition - Type definition.
   */
  function definedAs<V = unknown>(definition: FormKitTypeDefinition<V>) {
    if (definition.props) observeProps(definition.props)
  }

  node.props.definition && definedAs(node.props.definition)

  /**
   * When new props are added to the core node as "props" (ie not attrs) then
   * we automatically need to start tracking them here.
   */
  node.on('added-props', ({ payload }) => observeProps(payload))

  /**
   * Watch for input events from core.
   */
  node.on('input', ({ payload }) => {
    if (node.type !== 'input' && !isRef(payload) && !isReactive(payload)) {
      _value.value = shallowClone(payload)
    } else {
      _value.value = payload
      triggerRef(_value)
    }
  })

  /**
   * Model updates from core. This is the raw value and should emitted as a
   * model update even if the value did not update internally. Why? Because
   * the model that created this event may have not be the same value as our
   * internal value.
   *
   * See test: "emits a modelUpdated event even when the value results in the
   * same value"
   */
  node.on('commitRaw', ({ payload }) => {
    if (node.type !== 'input' && !isRef(payload) && !isReactive(payload)) {
      value.value = _value.value = shallowClone(payload)
    } else {
      value.value = _value.value = payload
      triggerRef(value)
    }
    node.emit('modelUpdated')
  })

  /**
   * Watch for input commits from core.
   */
  node.on('commit', ({ payload }) => {
    // The input is dirty after a value has been input by a user
    if (
      (!context.state.dirty || context.dirtyBehavior === 'compare') &&
      node.isCreated &&
      hasTicked
    ) {
      if (!node.store.validating?.value) {
        context.handlers.touch()
      } else {
        const receipt = node.on('message-removed', ({ payload: message }) => {
          if (message.key === 'validating') {
            context.handlers.touch()
            node.off(receipt)
          }
        })
      }
    }
    if (
      isComplete &&
      node.type === 'input' &&
      hasErrors.value &&
      !undefine(node.props.preserveErrors)
    ) {
      node.store.filter(
        (message) =>
          !(message.type === 'error' && message.meta?.autoClear === true)
      )
    }
    if (node.type === 'list' && node.sync) {
      items.value = node.children.map((child) => child.uid)
    }
    context.state.empty = empty(payload)
  })

  /**
   * Update the local state in response to messages.
   * @param message - A formkit message
   */
  const updateState = async (message: FormKitMessage) => {
    if (
      message.type === 'ui' &&
      message.visible &&
      !message.meta.showAsMessage
    ) {
      ui[message.key] = message
    } else if (message.visible) {
      availableMessages[message.key] = message
    } else if (message.type === 'state') {
      context.state[message.key] = !!message.value
    }
  }

  /**
   * Listen to message events and modify the local message data values.
   */
  node.on('message-added', (e) => updateState(e.payload))
  node.on('message-updated', (e) => updateState(e.payload))
  node.on('message-removed', ({ payload: message }) => {
    delete ui[message.key]
    delete availableMessages[message.key]
    delete context.state[message.key]
  })
  node.on('settled:blocking', () => {
    isValid.value = true
  })
  node.on('unsettled:blocking', () => {
    isValid.value = false
  })
  node.on('settled:errors', () => {
    hasErrors.value = false
  })
  node.on('unsettled:errors', () => {
    hasErrors.value = true
  })

  /**
   * Watch the validation visible prop and set the hasShownErrors state.
   */
  watch(validationVisible, (value) => {
    if (value) {
      hasShownErrors.value = true
    }
  })

  node.context = context

  // The context is complete
  node.emit('context', node, false)

  node.on('destroyed', () => {
    node.context = undefined
    /* @ts-ignore */ // eslint-disable-line
    node = null
  })
}

export default vueBindings
