import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET = process.env.TARGET;
const SDK_ENV = process.env.SDK_ENV ?? "production";
const SUPPORTED_SDK_ENVIRONMENTS = new Set(["development", "production"]);
const REQUIRED_URLS = [
  "SDK_BASE_URL",
  "SDK_AUTHENTICATION_BASE_URL",
  "SDK_ANALYTICS_BASE_URL",
  "SDK_PUSH_BASE_URL",
];

function readEnvFile(environment) {
  if (!SUPPORTED_SDK_ENVIRONMENTS.has(environment)) {
    throw new Error(`Unsupported SDK_ENV "${environment}". Use development or production.`);
  }

  const envPath = resolve(`.env.${environment}`);
  const values = {};

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(`Invalid line in ${envPath}: ${rawLine}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    values[key] = value;
  }

  for (const key of REQUIRED_URLS) {
    if (!values[key]) throw new Error(`${key} is required in ${envPath}.`);
    try {
      new URL(values[key]);
    } catch {
      throw new Error(`${key} must be a valid absolute URL in ${envPath}.`);
    }
  }

  return values;
}

const endpointValues = readEnvFile(SDK_ENV);

function injectBuildUrls() {
  return {
    name: "inject-build-urls",
    transform(code, id) {
      const isEndpointConfig = id.endsWith("/src/config/endpoints.ts") || id.endsWith("\\src\\config\\endpoints.ts");
      const isServiceWorker = id.endsWith("/src/sdk-sw.js") || id.endsWith("\\src\\sdk-sw.js");

      if (!isEndpointConfig && !isServiceWorker) {
        return null;
      }

      let transformedCode = code;
      for (const key of REQUIRED_URLS) {
        transformedCode = transformedCode.replaceAll(`__${key}__`, () => endpointValues[key]);
      }

      return { code: transformedCode, map: null };
    },
  };
}

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
      plugins: [injectBuildUrls(), typescript(), terser()],
    },
    // ESM — for bundlers (webpack, vite, ...)
    {
      input: esmInput,
      output: {
        file: `${outputDir}/${outputName}.esm.js`,
        format: "esm",
      },
      plugins: [injectBuildUrls(), typescript()],
    },
    // CommonJS — for older Node.js / bundler consumers
    {
      input: esmInput,
      output: {
        file: `${outputDir}/${outputName}.cjs`,
        format: "cjs",
        exports: "named",
      },
      plugins: [injectBuildUrls(), typescript()],
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
  plugins: [injectBuildUrls(), terser()],
};

export default [...rootBundles, ...targets.flatMap(createBundleConfigs), serviceWorkerConfig];
