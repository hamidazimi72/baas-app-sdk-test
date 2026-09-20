import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

const TARGET = process.env.TARGET;

const configs = {
  core: {
    cdnInput: "src/core/core.cdn.ts",
    esmInput: "src/core/index.ts",
    globalName: "CoreSDK",
    outputDir: "dist/core",
    outputName: "core",
  },
  auth: {
    cdnInput: "src/authentication/auth.cdn.ts",
    esmInput: "src/authentication/index.ts",
    globalName: "AuthSDK",
    outputDir: "dist/auth",
    outputName: "auth",
  },
  push: {
    cdnInput: "src/push/push.cdn.ts",
    esmInput: "src/push/index.ts",
    globalName: "PushSDK",
    outputDir: "dist/push",
    outputName: "push",
  },
  analytics: {
    cdnInput: "src/analytics/analytics.cdn.ts",
    esmInput: "src/analytics/index.ts",
    globalName: "AnalyticsSDK",
    outputDir: "dist/analytics",
    outputName: "analytics",
  },
};

function createBundleConfigs({ cdnInput, esmInput, globalName, outputDir, outputName }) {
  return [
    // IIFE — for CDN / <script> tag  →  window.CoreSDK = CoreSdk class directly
    {
      input: cdnInput,
      output: {
        file: `${outputDir}/${outputName}.min.js`,
        format: "iife",
        name: globalName,
        exports: "default",
      },
      plugins: [typescript(), terser()],
    },
    // ESM — for bundlers (webpack, vite, ...)
    {
      input: esmInput,
      output: {
        file: `${outputDir}/${outputName}.esm.js`,
        format: "esm",
      },
      plugins: [typescript()],
    },
    // CommonJS — for older Node.js / bundler consumers
    {
      input: esmInput,
      output: {
        file: `${outputDir}/${outputName}.cjs`,
        format: "cjs",
        exports: "named",
      },
      plugins: [typescript()],
    },
    // Type declarations — bundled .d.ts for ESM consumers
    {
      input: esmInput,
      output: {
        file: `${outputDir}/${outputName}.d.ts`,
        format: "es",
      },
      plugins: [dts()],
    },
  ];
}

const rootBundleConfigs = [
  {
    esmInput: "src/index.ts",
    outputDir: "dist",
    outputName: "index",
  },
];

const targets = TARGET ? [configs[TARGET]] : Object.values(configs);
const rootBundles = TARGET
  ? []
  : rootBundleConfigs.flatMap(({ esmInput, outputDir, outputName }) =>
      createBundleConfigs({
        cdnInput: "src/core/core.cdn.ts",
        esmInput,
        globalName: "MbaasSDK",
        outputDir,
        outputName,
      }).filter((config) => config.output.format !== "iife"),
    );

const serviceWorkerConfig = {
  input: "src/sdk-sw.js",
  output: {
    file: "dist/sdk-sw.js",
    format: "iife",
  },
  plugins: [terser()],
};

export default [...rootBundles, ...targets.flatMap(createBundleConfigs), serviceWorkerConfig];
