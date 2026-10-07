import type { SceneInput, SceneOutput } from "./protocol";
import { createScene } from "./scene";

const send = (message: SceneOutput) => postMessage(message);
let scene: ReturnType<typeof createScene> | undefined;
addEventListener("message", (event: MessageEvent<SceneInput>) => {
  const message = event.data;
  try {
    if (message.type === "init") {
      scene = createScene(
        message.canvas,
        message.papers,
        message.spaces,
        message.pixelRatio,
        (id) => send({ type: "paper", id }),
        (id) => send({ type: "space", id }),
      );
      scene.resize(message.width, message.height);
      scene.setVisible(message.visible);
      send({ type: "ready" });
    } else if (scene) {
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
  } catch {
    scene?.dispose();
    scene = undefined;
    send({ type: "error" });
  }
});
