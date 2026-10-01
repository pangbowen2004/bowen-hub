import Prose from "./Prose.astro";
export default { title: "静态组件/Prose", component: Prose };
export const Default = {
  args: {
    slots: {
      default:
        "<h2>阅读说明</h2><p>长文使用舒适行距，保留证据和原文链接。</p><blockquote>样例摘录</blockquote><ul><li>阅读导读</li><li>检查证据</li></ul>",
    },
  },
};
