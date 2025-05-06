import { parentSymbol, componentSymbol } from '../FormKit'
import { rootSymbol } from '../FormKitRoot'
import {
  error,
  createNode,
  FormKitNode,
  FormKitOptions,
  FormKitMessage,
  createMessage,
} from '@formkit/core'
import { FormKitRuntimeProps } from '@formkit/inputs'
import {
  nodeProps,
  except,
  camel,
  extend,
  only,
  kebab,
  cloneAny,
  slugify,
  isObject,
  token,
  undefine,
  oncePerTick,
  eq,
  shallowClone,
} from '@formkit/utils'
import {
  toRef,
  watchEffect,
  inject,
  provide,
  watch,
  getCurrentInstance,
  computed,
  ref,
  WatchStopHandle,
  onBeforeUnmount,
  onMounted,
  SetupContext,
} from 'vue'
import { FormKitInputs } from '@formkit/inputs'
import { optionsSymbol } from '../plugin'
import { FormKitGroupValue } from 'packages/core/src'
import { FormKitPseudoProps } from '@formkit/core'

interface FormKitComponentListeners {
  onSubmit?: (payload?: FormKitGroupValue) => Promise<unknown> | unknown
  onSubmitRaw?: (event?: Event) => unknown
  onSubmitInvalid?: (node?: Node) => unknown
}

const isBrowser = typeof window !== 'undefined'

/**
 * Props that are extracted from the attrs object.
 * TODO: Currently local, this should probably exported to a inputs or another
 * package.
 */
const pseudoProps = [
  // Boolean props
  'ignore',
  'disabled',
  'preserve',
  // String props
  'help',
  'label',
  /^preserve(-e|E)rrors/,
  /^[a-z]+(?:-visibility|Visibility|-behavior|Behavior)$/,
  /^[a-zA-Z-]+(?:-class|Class)$/,
  'prefixIcon',
  'suffixIcon',
  /^[a-zA-Z-]+(?:-icon|Icon)$/,
]

const boolProps = ['disabled', 'ignore', 'preserve']

/**
 * Given some props, map those props to individualized props internally.
 * @param node - A formkit node
 * @param props - Some props that may include a classes object
 */
function classesToNodeProps(node: FormKitNode, props: Record<string, any>) {
  if (props.classes) {
    Object.keys(props.classes).forEach(
      (key: keyof (typeof props)['classes']) => {
        if (typeof key === 'string') {
          node.props[`_${key}Class`] = props.classes[key]
          // We need to ensure Vue is aware that we want to actually observe the
          // child values too, so we touch them here.
          if (isObject(props.classes[key]) && key === 'inner')
            Object.values(props.classes[key])
        }
      }
    )
  }
}

/**
 * Extracts known FormKit listeners.
 * @param props - Extract known FormKit listeners.
 * @returns
 */
function onlyListeners(
  props: Record<string, unknown> | null | undefined
): FormKitComponentListeners {
  if (!props) return {}
  const knownListeners = ['Submit', 'SubmitRaw', 'SubmitInvalid'].reduce(
    (listeners, listener) => {
      const name = `on${listener}`
      if (name in props) {
        if (typeof props[name] === 'function') {
          listeners[name] = props[name] as CallableFunction
        }
      }
      return listeners
    },
    {} as Record<string, CallableFunction>
  )
  return knownListeners as FormKitComponentListeners
}

/**
 * A composable for creating a new FormKit node.
 *
 * @param type - The type of node (input, group, list)
 * @param attrs - The FormKit "props" — which is really the attrs list.
 *
 * @returns {@link @formkit/core#FormKitNode | FormKitNode}
 *
 * @public
 */
export function useInput<
  Props extends FormKitInputs<Props>,
  Context extends SetupContext<any, any>
>(props: Props, context: Context, options: FormKitOptions = {}): FormKitNode {
  /**
   * The configuration options, these are provided by either the plugin or by
   * explicit props.
   */
  const config = Object.assign({}, inject(optionsSymbol) || {}, options)

  /**
   * The root element — generally this is either a Document or ShadowRoot.
   */
  const __root = inject(rootSymbol, ref(isBrowser ? document : undefined))

  /**
   * The component symbol, this is used to register the node with the "owner"
   * component.
   */
  const __cmpCallback = inject(componentSymbol, () => {
    /* void */
  })

  /**
   * The current instance.
   */
  const instance = getCurrentInstance()

  /**
   * Extracts the listeners.
   */
  const listeners = onlyListeners(instance?.vnode.props)

  /**
   * Determines if the prop is v-modeled. Credit to:
   * {@link https://github.com/LinusBorg | Thorsten Lünborg}
   * for coming up with this solution.
   */
  const isVModeled = ['modelValue', 'model-value'].some(
    (prop) => prop in (instance?.vnode.props ?? {})
  )

  // Track if the input has mounted or not.
  let isMounted = false
  onMounted(() => {
    isMounted = true
  })

  /**
   * Determines if the object being passed as a v-model is reactive.
   */
  // const isReactiveVModel = isVModeled && isReactive(props.modelValue)

  /**
   * Define the initial component
   */
  const value: any =
    props.modelValue !== undefined
      ? props.modelValue
      : cloneAny(context.attrs.value)

  /**
   * Creates the node's initial props from the context, props, and definition
   * @returns
   */
  function createInitialProps(): Record<string, any> {
    const initialProps: Record<string, any> = {
      ...nodeProps(props),
      ...listeners,
      type: props.type ?? 'text',
      __root: __root.value,
      __slots: context.slots,
    }
    const attrs = except(nodeProps(context.attrs), pseudoProps)
    if (!attrs.key) attrs.key = token()
    initialProps.attrs = attrs
    const propValues = only(nodeProps(context.attrs), pseudoProps)
    for (const propName in propValues) {
      if (boolProps.includes(propName) && propValues[propName] === '') {
        propValues[propName] = true
      }
      initialProps[camel(propName)] = propValues[propName]
    }
    const classesProps = { props: {} }
    classesToNodeProps(classesProps as FormKitNode, props)
    Object.assign(initialProps, classesProps.props)
    if (typeof initialProps.type !== 'string') {
      initialProps.definition = initialProps.type
      delete initialProps.type
    }
    return initialProps
  }

  /**
   * Create the FormKitNode.
   */
  const initialProps = createInitialProps()

  /**
   * The parent node.
   */
  const parent = initialProps.ignore
    ? null
    : props.parent || inject(parentSymbol, null)
  const node = createNode(
    extend(
      config || {},
      {
        name: props.name || undefined,
        value,
        parent,
        plugins: (config.plugins || []).concat(props.plugins ?? []),
        config: props.config || {},
        props: initialProps,
        index: props.index,
        sync: !!undefine(context.attrs.sync || context.attrs.dynamic),
      },
      false,
      true
    ) as Partial<FormKitOptions>
  ) as FormKitNode

  /**
   * Call the component callback.
   */
  __cmpCallback(node)

  /**
   * If no definition has been assigned at this point — we're out!
   */
  if (!node.props.definition) error(600, node)

  /**
   * All props that are bound "late" (after node creation) — are added to a set
   * which is used to watch the context.attrs object.
   */
  const lateBoundProps = ref<Set<string | RegExp>>(
    new Set(
      Array.isArray(node.props.__propDefs)
        ? node.props.__propDefs
        : Object.keys(node.props.__propDefs ?? {})
    )
  )

  /**
   * Any additional props added at a "later" time should also be part of the
   * late bound props.
   */
  node.on(
    'added-props',
    ({ payload: lateProps }: { payload: FormKitPseudoProps }) => {
      const propNames = Array.isArray(lateProps)
        ? lateProps
        : Object.keys(lateProps ?? {})
      propNames.forEach((newProp) => lateBoundProps.value.add(newProp))
    }
  )

  /**
   * These prop names must be assigned.
   */
  const pseudoPropNames = computed(() =>
    pseudoProps.concat([...lateBoundProps.value]).reduce((names, prop) => {
      if (typeof prop === 'string') {
        names.push(camel(prop))
        names.push(kebab(prop))
      } else {
        names.push(prop)
      }
      return names
    }, [] as Array<string | RegExp>)
  )

  /* Splits Classes object into discrete props for each key */
  watchEffect(() => classesToNodeProps(node, props))

  /**
   * The props object already has properties even if they start as "undefined"
   * so we can loop over them and individual watchEffect to prevent responding
   * inappropriately.
   */
  const passThrough = nodeProps(props)
  for (const prop in passThrough) {
    watch(
      () => props[prop as keyof FormKitRuntimeProps<Props>],
      () => {
        if (props[prop as keyof FormKitRuntimeProps<Props>] !== undefined) {
          node.props[prop] = props[prop as keyof FormKitRuntimeProps<Props>]
        }
      }
    )
  }

  // Ensure the root always stays up to date.
  watchEffect(() => {
    node.props.__root = __root.value
  })

  /**
   * Watch "pseudoProp" attributes explicitly.
   */
  const attributeWatchers = new Set<WatchStopHandle>()
  const possibleProps = nodeProps(context.attrs)
  watchEffect(() => {
    watchAttributes(only(possibleProps, pseudoPropNames.value))
  })

  /**
   * Defines attributes that should be used as props.
   * @param attrProps - Attributes that should be used as props instead
   */
  function watchAttributes(attrProps: Record<string, any>) {
    attributeWatchers.forEach((stop) => {
      stop()
      attributeWatchers.delete(stop)
    })
    for (const prop in attrProps) {
      const camelName = camel(prop)
      attributeWatchers.add(
        watch(
          () => context.attrs[prop],
          () => {
            node.props[camelName] = context.attrs[prop]
          }
        )
      )
    }
  }

  /**
   * Watch and dynamically set attribute values, those values that are not
   * props and are not pseudoProps
   */
  watchEffect(() => {
    const attrs = except(nodeProps(context.attrs), pseudoPropNames.value)
    // An explicit exception to ensure naked "multiple" attributes appear on the
    // outer wrapper as data-multiple="true"
    if ('multiple' in attrs) attrs.multiple = undefine(attrs.multiple)
    if (typeof attrs.onBlur === 'function') {
      attrs.onBlur = oncePerTick(attrs.onBlur)
    }
    node.props.attrs = Object.assign({}, node.props.attrs || {}, attrs)
  })

  /**
   * Add any/all "prop" errors to the store.
   */
  watchEffect(() => {
    const messages = (props.errors ?? []).map((error) =>
      createMessage({
        key: slugify(error),
        type: 'error',
        value: error,
        meta: { source: 'prop' },
      })
    )
    node.store.apply(
      messages,
      (message) => message.type === 'error' && message.meta.source === 'prop'
    )
  })

  /**
   * Add input errors.
   */
  if (node.type !== 'input') {
    const sourceKey = `${node.name}-prop`
    watchEffect(() => {
      const inputErrors = props.inputErrors ?? {}
      const keys = Object.keys(inputErrors)
      if (!keys.length) node.clearErrors(true, sourceKey)
      const messages = keys.reduce((messages, key) => {
        let value = inputErrors[key]
        if (typeof value === 'string') value = [value]
        if (Array.isArray(value)) {
          messages[key] = value.map((error) =>
            createMessage({
              key: error,
              type: 'error',
              value: error,
              meta: { source: sourceKey },
            })
          )
        }
        return messages
      }, {} as Record<string, FormKitMessage[]>)
      node.store.apply(
        messages,
        (message) =>
          message.type === 'error' && message.meta.source === sourceKey
      )
    })
  }

  /**
   * Watch the config prop for any changes.
   */
  watchEffect(() => Object.assign(node.config, props.config))

  /**
   * Produce another parent object.
   */
  if (node.type !== 'input') {
    provide(parentSymbol, node)
  }

  // let inputTimeout: number | undefined

  let clonedValueBeforeVmodel: unknown = undefined
  /**
   * Explicitly watch the input value, and emit changes (lazy)
   */
  node.on('modelUpdated', () => {
    // Emit the values after commit
    context.emit('inputRaw', node.context?.value, node)
    if (isMounted) {
      context.emit('input', node.context?.value, node)
    }
    if (isVModeled && node.context) {
      clonedValueBeforeVmodel = cloneAny(node.value)
      context.emit('update:modelValue', shallowClone(node.value))
    }
  })

  /**
   * Enabled support for v-model, using this for groups/lists is not recommended
   */
  if (isVModeled) {
    watch(
      toRef(props, 'modelValue'),
      (value) => {
        if (!eq(clonedValueBeforeVmodel, value)) {
          node.input(value, false)
        }
      },
      { deep: true }
    )

    /**
     * On initialization, if the node’s value was updated (like in a plugin
     * hook) then we should emit a `modelUpdated` event.
     */
    if (node.value !== value) {
      node.emit('modelUpdated')
    }
  }

  /**
   * When this input shuts down, we need to "delete" the node too.
   */
  onBeforeUnmount(() => node.destroy())

  return node
}
