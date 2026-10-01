import { createRequire } from "node:module";
import type { StorybookConfig } from "../packages/ui/node_modules/@storybook-astro/framework/dist/index.js";

const require = createRequire(new URL("../packages/ui/package.json", import.meta.url));
const { react } = require("@storybook-astro/framework/integrations");
const config: StorybookConfig = {
  stories: ["../packages/ui/src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: require.resolve("@storybook-astro/framework"),
    options: {
      renderMode: "static",
      integrations: [react()],
      resolveFrom: new URL("../packages/ui/", import.meta.url).pathname,
    },
  },
};
export default config;
