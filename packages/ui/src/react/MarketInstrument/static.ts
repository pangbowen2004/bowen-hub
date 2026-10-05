import { num, pct, pp } from "../../format";

// 公开静态站复用同一份服务端表盘和面板，交互无需下载 React 运行时。
export function mountMarketInstrument(root: HTMLElement) {
  const sectors = [...root.querySelectorAll<SVGGElement>("[data-direction-index]")];
  const needle = root.querySelector<SVGGElement>(".direction-needle");
  const temperatureNeedle = root.querySelector<SVGGElement>(".temperature-needle");
  const temperatureNumber = root.querySelector(".temperature-number");
  const segments = [...root.querySelectorAll<SVGPathElement>("[data-temperature-segment]")];
  const tip = [...root.querySelectorAll<SVGTextElement>(".dial-readout text")];
  const panels = [...root.querySelectorAll<HTMLTemplateElement>("template[data-direction-panel]")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let selected = sectors.findIndex((sector) => sector.getAttribute("aria-pressed") === "true");
  const frames = new Set<number>();
  const cancel = () => {
    frames.forEach(cancelAnimationFrame);
    frames.clear();
  };
  const animate = (duration: number, draw: (progress: number) => void) => {
    if (motion.matches) {
      draw(1);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      frames.delete(frame);
      const progress = Math.min(1, (now - start) / duration);
      draw(1 - (1 - progress) ** 3);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        frames.add(frame);
      }
    };
    let frame = requestAnimationFrame(tick);
    frames.add(frame);
  };
  const readout = (index: number) => {
    const values: string[] = JSON.parse(sectors[index]?.dataset.readout ?? "[]");
    [0, 2, 4, 6].forEach((position, i) => {
      const text = tip[position];
      if (text) text.textContent = values[i] ?? "";
    });
  };
  const animatePanel = () => {
    const metrics = root.querySelectorAll<HTMLElement>(".instrument-side [data-metric]");
    animate(750, (progress) => {
      for (const element of metrics) {
        const value = Number(element.dataset.value) * progress;
        element.textContent =
          element.dataset.metric === "relative"
            ? pp(value)
            : pct(value, { sign: false, digits: 1 });
      }
    });
  };
  const choose = (index: number) => {
    selected = index;
    cancel();
    drawTemperature(1);
    sectors.forEach((sector, i) => {
      sector.classList.toggle("selected", i === index);
      sector.setAttribute("aria-pressed", String(i === index));
    });
    if (needle) needle.style.transform = `rotate(${((index + 0.5) * 360) / sectors.length}deg)`;
    const panel = panels[index]?.content.firstElementChild?.cloneNode(true);
    if (panel) root.querySelector(".instrument-side")?.replaceWith(panel);
    readout(index);
    animatePanel();
  };
  const bindings: (() => void)[] = [];
  const on = (element: EventTarget, type: string, handler: EventListener) => {
    element.addEventListener(type, handler);
    bindings.push(() => element.removeEventListener(type, handler));
  };
  sectors.forEach((sector, index) => {
    on(sector, "click", () => choose(index));
    on(sector, "mouseenter", () => readout(index));
    on(sector, "mouseleave", () => readout(selected));
    on(sector, "focus", () => readout(index));
    on(sector, "blur", () => readout(selected));
    on(sector, "keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      if (!["Enter", " ", "ArrowLeft", "ArrowRight"].includes(key)) return;
      event.preventDefault();
      const next =
        key === "ArrowRight" || key === "ArrowLeft"
          ? (index + (key === "ArrowRight" ? 1 : -1) + sectors.length) % sectors.length
          : index;
      choose(next);
      sectors[next]?.focus();
    });
  });
  const drawTemperature = (progress: number) => {
    const value = Number(root.dataset.temperature) * progress;
    if (temperatureNumber) temperatureNumber.textContent = num(value, 1);
    temperatureNeedle?.setAttribute("transform", `rotate(${-130 + value * 2.6} 320 312)`);
    segments.forEach((segment, index) => {
      segment.setAttribute("opacity", index < value ? ".9" : ".28");
    });
  };
  const initial = () => {
    cancel();
    animate(1200, drawTemperature);
    animatePanel();
  };
  on(motion, "change", initial);
  initial();
  return () => {
    cancel();
    bindings.forEach((unbind) => {
      unbind();
    });
  };
}
