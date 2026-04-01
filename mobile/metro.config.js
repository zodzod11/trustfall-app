// Allow importing shared app code from the repo root (e.g. `src/services/onboarding`).
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')
const metroResolver = require('metro-resolver')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '..')
const config = getDefaultConfig(projectRoot)

config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot]

const mobileNm = path.join(projectRoot, 'node_modules')

/**
 * Shared `../src/**` sits next to the Vite app; hierarchical lookup picks
 * `trustfall-app/node_modules/react` before `mobile/node_modules/react` → two Reacts → broken hooks.
 *
 * **Only** redirect core React packages to `mobile/node_modules` (do not use
 * `disableHierarchicalLookup` — it breaks unrelated resolutions and can yield a blank web bundle).
 */
function resolveFromMobile(moduleName) {
  try {
    return require.resolve(moduleName, { paths: [mobileNm] })
  } catch {
    return null
  }
}

function shouldForceMobileReact(moduleName) {
  return (
    moduleName === 'react' ||
    moduleName.startsWith('react/') ||
    moduleName === 'react-dom' ||
    moduleName.startsWith('react-dom/') ||
    moduleName === 'scheduler' ||
    moduleName.startsWith('scheduler/')
  )
}

const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // tsconfig `"@/*": ["./*"]` — Metro does not read paths; resolve here so web/native agree.
  if (moduleName.startsWith('@/')) {
    const fromProjectRoot = path.join(projectRoot, moduleName.slice(2))
    return metroResolver.resolve(
      { ...context, resolveRequest: metroResolver.resolve },
      fromProjectRoot,
      platform,
    )
  }
  if (shouldForceMobileReact(moduleName)) {
    const filePath = resolveFromMobile(moduleName)
    if (filePath) {
      return { type: 'sourceFile', filePath }
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return metroResolver.resolve(
    { ...context, resolveRequest: metroResolver.resolve },
    moduleName,
    platform,
  )
}

config.resolver.extraNodeModules = {
  ...config.resolver?.extraNodeModules,
  react: path.join(mobileNm, 'react'),
  'react-dom': path.join(mobileNm, 'react-dom'),
  'react-native': path.join(mobileNm, 'react-native'),
  scheduler: path.join(mobileNm, 'scheduler'),
}

module.exports = config
