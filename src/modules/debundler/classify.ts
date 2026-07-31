const BABEL_HELPER_RE =
  /^__(?:slicedToArray|arrayWithHoles|iterableToArrayLimit|unsupportedIterableToArray|arrayLikeToArray|nonIterableRest|nonIterableSpread|classCallCheck|createClass|createForOfIteratorHelper|typeof|toConsumableArray|toPropertyKey|toPrimitive|extends|instanceof|interopRequireDefault|interopRequireWildcard|objectSpread|objectSpread2|objectWithoutProperties|objectWithoutPropertiesLoose|objectDestructuringEmpty|possibleConstructorReturn|assertThisInitialized|setPrototypeOf|getPrototypeOf|inherits|construct|defineEnumerableProperties|defineProperty|wrapNativeSuper|wrapRegExp|taggedTemplateLiteral|taggedTemplateLiteralLoose|readOnlyError|tdz|asyncGeneratorStep|asyncToGenerator|awaitAsyncGenerator|AwaitValue|wrapAsyncGenerator|initializerWarningHelper|initializerDefineProperty|applyDecoratedDescriptor|decorate|skipFirstGeneratorNext|newArrowCheck|iterableToArray|arrayWithoutHoles)$/;

const REGENERATOR_RE = /^(?:regenerator|regeneratorRuntime|runtime|asyncIterator)$/;

const JSX_RE = /^(?:jsx|jsxDev|jsxProd|jsxs|ReactElement|createElement|Fragment|_?jsx)$/;

const RUNTIME_DOUBLE_UNDERSCORE_RE = /^__[A-Z]/;

const RUNTIME_SINGLE_UNDERSCORE_RE =
  /^_(?:set|add|get|MessageQueue|jsx|createClass|defaults|extends|Object|construct|apply|typeof|slicedToArray|toConsumableArray|objectWithoutProperties|interopRequire|asyncToGenerator|possibleConstructorReturn|taggedTemplateLiteral|classCallCheck|wrapNativeSuper|readOnlyError|measureSpan[s]?|addTracingHeadersToFetchRequest|setSpanAttribute)$/;

const QUERY_RE = /^[?]$/;

export interface ClassifiedModule {
  dir: string;
  filename: string;
}

export function normalizePath(filePath: string): string {
  let path = filePath;

  while (path.startsWith("../")) {
    path = path.slice(3);
  }

  if (!path.startsWith("discord_") && !path.startsWith("node_modules/")) {
    path = `discord_app/${path}`;
  }

  return path;
}

export function classifyModule(id: number, name: string, filePath: string | null): ClassifiedModule {
  if (filePath) {
    const normalized = normalizePath(filePath);
    const lastSep = normalized.lastIndexOf("/");
    return {
      dir: lastSep === -1 ? "" : normalized.slice(0, lastSep),
      filename: normalized.slice(lastSep + 1),
    };
  }

  const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const padded = String(id).padStart(5, "0");
  const fname = `${padded}_${cleanName}.js`;

  if (REGENERATOR_RE.test(name)) {
    return { dir: "_runtime/babel/regenerator", filename: fname };
  }
  if (BABEL_HELPER_RE.test(name)) {
    return { dir: "_runtime/babel", filename: fname };
  }
  if (JSX_RE.test(name)) {
    return { dir: "_runtime/react", filename: fname };
  }
  if (RUNTIME_DOUBLE_UNDERSCORE_RE.test(name) || RUNTIME_SINGLE_UNDERSCORE_RE.test(name)) {
    return { dir: "_runtime/metro", filename: fname };
  }
  if (QUERY_RE.test(name)) {
    return { dir: "_runtime/metro", filename: fname };
  }

  return { dir: "_runtime", filename: fname };
}
