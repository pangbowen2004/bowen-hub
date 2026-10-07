import type { AtlasPaper } from "./atlas";
import type { AtlasFocus, AtlasSpace, SceneInput, SceneOutput } from "./protocol";
import type { createScene } from "./scene";

/** DOM只负责输入和可见性；三维与后期发光在独立线程计算。 */
export async function createAtlas(
  el: HTMLElement,
  papers: AtlasPaper[],
  spaces: AtlasSpace[],
  selectPaper: (id: string) => void,
  selectSpace: (id: string) => void,
  fail: () => void,
) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", `${papers.length}篇论文的研究空间`);
  canvas.tabIndex = -1;
  el.append(canvas);
  let worker: Worker | undefined;
  let scene: ReturnType<typeof createScene> | undefined;
  let disposed = false;
  let ready = false;
  let visible = false;
  let lastMove = 0;
  const send = (message: Exclude<SceneInput, { type: "init" }>) => {
    if (disposed) return;
    if (worker) worker.postMessage(message);
    else if (scene) {
      switch (message.type) {
        case "focus":
          scene.setFocus(message.focus);
          break;
        case "resize":
          scene.resize(message.width, message.height);
          break;
        case "visibility":
          scene.setVisible(message.visible);
          break;
        case "move":
          scene.move(message.x, message.y);
          break;
        case "leave":
          scene.leave();
          break;
        case "click":
          scene.click(message.x, message.y);
          break;
      }
    }
  };
  const size = () => {
    const { width, height } = el.getBoundingClientRect();
    return { width, height };
  };
  const resize = new ResizeObserver(() => {
    const { width, height } = size();
    if (width && height) send({ type: "resize", width, height });
  });
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? false;
    send({ type: "visibility", visible: visible && !document.hidden });
  });
  const move = (event: PointerEvent) => {
    if (performance.now() - lastMove < 32) return;
    lastMove = performance.now();
    const r = el.getBoundingClientRect();
    if (r.width && r.height)
      send({
        type: "move",
        x: (event.clientX - r.left) / r.width - 0.5,
        y: (event.clientY - r.top) / r.height - 0.5,
      });
  };
  const leave = () => send({ type: "leave" });
  const click = (event: MouseEvent) => {
    const r = el.getBoundingClientRect();
    if (r.width && r.height)
      send({
        type: "click",
        x: ((event.clientX - r.left) / r.width) * 2 - 1,
        y: -((event.clientY - r.top) / r.height) * 2 + 1,
      });
  };
  const visibility = () => send({ type: "visibility", visible: visible && !document.hidden });
  function dispose() {
    disposed = true;
    resize.disconnect();
    intersection.disconnect();
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerleave", leave);
    el.removeEventListener("click", click);
    document.removeEventListener("visibilitychange", visibility);
    worker?.terminate();
    scene?.dispose();
    canvas.remove();
  }
  try {
    if (typeof Worker !== "undefined" && typeof canvas.transferControlToOffscreen === "function") {
      worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      const initialized = new Promise<void>((resolve, reject) => {
        worker!.onmessage = (event: MessageEvent<SceneOutput>) => {
          if (disposed) return;
          const message = event.data;
          if (message.type === "ready") {
            ready = true;
            resolve();
          } else if (message.type === "paper") selectPaper(message.id);
          else if (message.type === "space") selectSpace(message.id);
          else if (ready) {
            dispose();
            fail();
          } else reject(new Error("三维渲染初始化失败"));
        };
        worker!.onerror = () => {
          if (ready) {
            dispose();
            fail();
          } else reject(new Error("三维渲染线程不可用"));
        };
      });
      const offscreen = canvas.transferControlToOffscreen();
      const message: SceneInput = {
        type: "init",
        canvas: offscreen,
        papers,
        spaces,
        pixelRatio: Math.min(devicePixelRatio, 1.5),
        ...size(),
        visible: false,
      };
      worker.postMessage(message, [offscreen]);
      resize.observe(el);
      intersection.observe(el);
      await initialized;
    } else {
      // 不支持离屏画布的浏览器保留同一场景，列表与阅读始终可用。
      const { createScene } = await import("./scene");
      scene = createScene(
        canvas,
        papers,
        spaces,
        Math.min(devicePixelRatio, 1.5),
        selectPaper,
        selectSpace,
      );
      scene.resize(size().width, size().height);
      resize.observe(el);
      intersection.observe(el);
    }
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("click", click);
    document.addEventListener("visibilitychange", visibility);
    return { setFocus: (focus: AtlasFocus) => send({ type: "focus", focus }), dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
