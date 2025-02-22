import { LoaderConfig, LocaleLoader } from '.'
import getConfig from './getConfig'
import getPageNamespaces from './getPageNamespaces'

const colorEnabled =
  process.env.NODE_DISABLE_COLORS == null &&
  process.env.NO_COLOR == null &&
  process.env.TERM !== 'dumb' &&
  process.env.FORCE_COLOR !== '0'

export default async function loadNamespaces(
  config: LoaderConfig = {}
): Promise<{
  __lang: string
  __namespaces?: Record<string, object>
}> {
  const conf = { ...getConfig(), ...config }
  const localesToIgnore = conf.localesToIgnore || ['default']
  const __lang: string =
    conf.req?.locale ||
    conf.locale ||
    conf.router?.locale ||
    conf.defaultLocale ||
    ''

  if (!conf.pathname) {
    console.warn(
      '🚨 [next-translate] You forgot to pass the "pathname" inside "loadNamespaces" configuration'
    )
    return { __lang }
  }

  if (localesToIgnore.includes(__lang)) return { __lang }

  if (!conf.loaderName && conf.loader !== false) {
    console.warn(
      '🚨 [next-translate] You can remove the "loadNamespaces" helper, unless you set "loader: false" in your i18n config file.'
    )
  }

  const page = removeTrailingSlash(conf.pathname.replace(/\/index$/, '')) || '/'
  const namespaces = await getPageNamespaces(conf, page, conf)
  const defaultLoader: LocaleLoader = () => Promise.resolve({})
  const pageNamespaces =
    (await Promise.all(
      namespaces.map((ns) =>
        typeof conf.loadLocaleFrom === 'function'
          ? conf.loadLocaleFrom(__lang, ns)
          : defaultLoader(__lang, ns)
      )
    ).catch(() => {})) || []

  if (conf.logBuild !== false && typeof window === 'undefined') {
    const color = (c: string) => (colorEnabled ? `\x1b[36m${c}\x1b[0m` : c)
    console.log(
      color('next-translate'),
      `- compiled page:`,
      color(page),
      '- locale:',
      color(__lang),
      '- namespaces:',
      color(namespaces.join(', ')),
      '- used loader:',
      color(conf.loaderName || '-')
    )
  }

  return {
    __lang,
    __namespaces: namespaces.reduce((obj: Record<string, object>, ns, i) => {
      obj[ns] = pageNamespaces[i] || null
      return obj
    }, {}),
  }
}

function removeTrailingSlash(path = '') {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}
