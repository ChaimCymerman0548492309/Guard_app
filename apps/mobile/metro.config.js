const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

const useSimulatorStub = process.env.EXPO_PUBLIC_DEV_SIMULATOR !== 'true';

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

if (useSimulatorStub) {
  const stubPath = path.resolve(projectRoot, 'src/stubs/simulator-stub.ts');
  const defaultResolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === '@guardian/simulator') {
      return { type: 'sourceFile', filePath: stubPath };
    }
    if (defaultResolve) {
      return defaultResolve(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
