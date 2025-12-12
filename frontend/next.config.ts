import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Webpack configuration for WASM support with fhenixjs
  webpack: (config, { isServer }) => {
    // Patch WASM module imports
    config.experiments = Object.assign(config.experiments || {}, {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    });

    config.optimization.moduleIds = 'named';

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Configure WASM output paths
    if (isServer) {
      config.output.webassemblyModuleFilename = './../static/wasm/tfhe_bg.wasm';
    } else {
      config.output.webassemblyModuleFilename = 'static/wasm/tfhe_bg.wasm';
      config.output.environment = { ...config.output.environment, asyncFunction: true };
    }

    // Ignore warnings about optional wallet modules
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /porto/ },
      { module: /@ledgerhq/ },
      { module: /@gemini-wallet/ },
      { module: /@coinbase\/wallet-sdk/ },
    ];

    // Make optional wallet connectors non-blocking via externals
    const isOptionalModule = (context, request) => {
      const optionalModules = [
        'porto',
        '@ledgerhq/connect-kit',
        '@gemini-wallet/core',
        '@coinbase/wallet-sdk',
      ];
      return optionalModules.some(mod => 
        request === mod || request?.startsWith(mod)
      );
    };

    config.externals = [
      ...(config.externals || []),
      function(context, request, callback) {
        if (isOptionalModule(context, request)) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      },
    ];

    return config;
  },
};

export default nextConfig;
