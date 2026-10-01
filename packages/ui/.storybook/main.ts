import type { StorybookConfig } from "@storybook-astro/framework";
import { react } from "@storybook-astro/framework/integrations";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook-astro/framework",
    options: {
      renderMode: "static",
      integrations: [react()],
      resolveFrom: new URL("../", import.meta.url).pathname,
    },
  },
};
export default config;
