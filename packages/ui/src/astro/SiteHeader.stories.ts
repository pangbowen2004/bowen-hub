import SiteHeader from "./SiteHeader.astro";
export default { title: "静态组件/SiteHeader", component: SiteHeader };
export const Default = { args: {"name": "A 股观测台", "links": [{"label": "驾驶舱", "href": "/"}, {"label": "方法与口径", "href": "/methods/"}]} };
