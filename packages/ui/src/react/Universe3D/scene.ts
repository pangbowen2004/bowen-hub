import * as T from "three";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { AtlasPaper } from "./atlas";

type Focus = { id: string; space: string; concept: string | null; reduced: boolean };
export async function createAtlas(
  el: HTMLElement,
  papers: AtlasPaper[],
  spaces: { id: string; label: string }[],
  select: (id: string) => void,
  selectConcept: (id: string) => void,
) {
  const scene = new T.Scene();
  scene.background = new T.Color("#15131b");
  scene.fog = new T.FogExp2("#191720", 0.017);
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(0, 4.7, 11.6);
  const look = new T.Vector3(0, 0.15, 0),
    targetPos = camera.position.clone(),
    targetLook = look.clone();
  camera.lookAt(look);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  el.prepend(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", `${papers.length}篇论文的三维研究空间`);
  renderer.domElement.tabIndex = 0;
  scene.add(new T.HemisphereLight("#dccbd9", "#262032", 0.65));
  const key = new T.DirectionalLight("#fff2dc", 0.9);
  key.position.set(-5, 9, 7);
  scene.add(key);
  const fill = new T.PointLight("#afa0d2", 14, 22, 2);
  fill.position.set(-4, 3, -2);
  scene.add(fill);
  const gold = new T.PointLight("#e0bd97", 18, 18, 2);
  gold.position.set(5, 1, 4);
  scene.add(gold);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 15, aperture: 0.00004, maxblur: 0.002 });
  composer.addPass(bokeh);
  composer.addPass(new UnrealBloomPass(new T.Vector2(1000, 570), 0.95, 0.45, 0.85));
  composer.addPass(new OutputPass());
  const root = new T.Group(),
    connections = new T.Group();
  scene.add(root, connections);
  const pages: {
    paper: AtlasPaper;
    mesh: T.Mesh<T.BoxGeometry, T.MeshPhysicalMaterial>;
    baseY: number;
  }[] = [];
  const labels = document.createElement("div");
  labels.className = "atlas-labels";
  el.append(labels);
  let labelNodes: { node: HTMLElement; position: T.Vector3 }[] = [];
  const colors = ["#a497b4", "#b7a28d", "#879aa6"];
  spaces.forEach((space, gi) => {
    const g = new T.Group();
    g.position.set(0, gi * 1.05 - 1.4, -gi * 0.95);
    root.add(g);
    const r = 5.8 - gi * 0.55,
      a = -1.1,
      b = 1.1,
      shape = new T.Shape();
    shape.moveTo(Math.sin(a) * (r - 0.33), Math.cos(a) * (r - 0.33));
    for (let i = 0; i <= 120; i++) {
      const t = a + ((b - a) * i) / 120;
      shape.lineTo(Math.sin(t) * (r - 0.33), Math.cos(t) * (r - 0.33));
    }
    for (let i = 120; i >= 0; i--) {
      const t = a + ((b - a) * i) / 120;
      shape.lineTo(Math.sin(t) * (r + 0.33), Math.cos(t) * (r + 0.33));
    }
    const geo = new T.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.04,
      bevelSegments: 2,
      steps: 1,
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, -r + 1);
    const shelf = new T.Mesh(
      geo,
      new T.MeshPhysicalMaterial({
        color: colors[gi % colors.length],
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.2,
        side: T.DoubleSide,
        emissive: colors[gi % colors.length],
        emissiveIntensity: 0.08,
      }),
    );
    g.add(shelf);
    for (const rr of [r - 0.32, r + 0.32]) {
      const pts = [];
      for (let j = 0; j <= 100; j++) {
        const t = a + ((b - a) * j) / 100;
        pts.push(new T.Vector3(Math.sin(t) * rr, 0.06, Math.cos(t) * rr - r + 1));
      }
      g.add(
        new T.Line(
          new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({
            color: colors[gi % colors.length],
            transparent: true,
            opacity: 0.55,
          }),
        ),
      );
    }
    const pp = papers.filter((p) => (p.spaces[0] ?? spaces[0]?.id) === space.id);
    pp.forEach((p, i) => {
      const t = a + ((b - a) * (i + 0.5)) / pp.length,
        h = 0.74 + Math.min(p.concepts.length, 8) * 0.1;
      const m = new T.MeshPhysicalMaterial({
        color: colors[gi % colors.length],
        metalness: 0.13,
        roughness: 0.3,
        transparent: true,
        opacity: 0.4,
        emissive: colors[gi % colors.length],
        emissiveIntensity: 0.04,
        side: T.DoubleSide,
        clearcoat: 0.5,
      });
      const mesh = new T.Mesh(new T.BoxGeometry(papers.length > 40 ? 0.3 : 0.62, h, 0.018), m);
      mesh.position.set(Math.sin(t) * r, h / 2 + 0.12, Math.cos(t) * r - r + 1);
      mesh.rotation.y = t;
      mesh.rotation.z = -0.1;
      g.add(mesh);
      pages.push({ paper: p, mesh, baseY: mesh.position.y });
      mesh.add(
        new T.LineSegments(
          new T.EdgesGeometry(mesh.geometry),
          new T.LineBasicMaterial({ color: "#bdaabf", transparent: true, opacity: 0.18 }),
        ),
      );
    });
  });
  let focus: Focus = { id: papers[0]?.id ?? "", space: "all", concept: null, reduced: true };
  let pointerX = 0,
    pointerY = 0,
    frame = 0;
  let inView = true;
  const started = performance.now();
  const ray = new T.Raycaster(),
    mouse = new T.Vector2();
  function rebuild() {
    connections.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          m.dispose();
        });
      }
    });
    connections.clear();
    labels.replaceChildren();
    labelNodes = [];
    const active = pages.find((p) => p.paper.id === focus.id);
    if (!active) return;
    root.updateWorldMatrix(true, true);
    const origin = active.mesh.getWorldPosition(new T.Vector3());
    const orientation = active.mesh.getWorldQuaternion(new T.Quaternion());
    const right = new T.Vector3(1, 0, 0).applyQuaternion(orientation);
    right.y = 0;
    right.normalize();
    const front = new T.Vector3(0, 0, 1).applyQuaternion(orientation);
    front.y = 0;
    front.normalize();
    const concepts = focus.concept
      ? active.paper.concepts.filter((c) => c.id === focus.concept)
      : active.paper.concepts;
    concepts.forEach((c, i) => {
      const cols = Math.ceil(Math.sqrt(concepts.length) * 1.8),
        position = origin
          .clone()
          .addScaledVector(front, 0.7)
          .addScaledVector(right, -2.1 + ((i % cols) * 4.2) / Math.max(1, cols - 1));
      position.y = origin.y + 2.1 + Math.floor(i / cols) * 0.6;
      const curve = new T.QuadraticBezierCurve3(
        origin,
        origin
          .clone()
          .lerp(position, 0.5)
          .add(new T.Vector3(0, 0.65, 0)),
        position,
      );
      connections.add(
        new T.Mesh(
          new T.TubeGeometry(curve, 48, 0.008, 5, false),
          new T.MeshBasicMaterial({ color: "#d6b38c", transparent: true, opacity: 0.48 }),
        ),
      );
      const node = document.createElement("button");
      node.type = "button";
      node.className = "atlas-concept-label";
      node.textContent = c.label;
      node.onclick = () => selectConcept(c.id);
      labels.append(node);
      labelNodes.push({ node, position });
    });
  }
  function setFocus(value: Focus) {
    focus = value;
    const active = pages.find((p) => p.paper.id === value.id);
    if (active) {
      root.updateWorldMatrix(true, true);
      const pos = active.mesh.getWorldPosition(new T.Vector3());
      // 沿选中书页的正面法线移动镜头，而不是从远处只看见侧边。
      const normal = new T.Vector3(0, 0, 1).applyQuaternion(
        active.mesh.getWorldQuaternion(new T.Quaternion()),
      );
      normal.y = 0;
      normal.normalize();
      const distance = el.clientWidth < 600 ? 15 : 9;
      targetPos.copy(pos).addScaledVector(normal, distance);
      targetPos.y = pos.y + 3.2;
      targetLook.copy(pos);
      targetLook.y += 0.8;
    }
    rebuild();
    if (value.reduced) {
      camera.position.copy(targetPos);
      look.copy(targetLook);
    }
    render();
    if (!value.reduced && inView && !document.hidden && !frame) frame = requestAnimationFrame(loop);
    if (value.reduced) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  function render(now = performance.now()) {
    const active = pages.find((p) => p.paper.id === focus.id),
      cs = focus.concept ? [focus.concept] : (active?.paper.concepts.map((c) => c.id) ?? []);
    pages.forEach(({ paper, mesh, baseY }, i) => {
      const visible = focus.space === "all" || paper.spaces.includes(focus.space),
        selected = paper.id === focus.id,
        related = paper.concepts.some((c) => cs.includes(c.id));
      mesh.material.opacity = visible ? (selected ? 0.94 : related ? 0.65 : 0.24) : 0.03;
      mesh.material.emissive.set(
        selected
          ? "#fff0d5"
          : (colors[
              spaces.findIndex((s) => s.id === (paper.spaces[0] ?? spaces[0]?.id)) % colors.length
            ] ?? "#a497b4"),
      );
      mesh.material.emissiveIntensity = visible ? (selected ? 3.4 : related ? 1.35 : 0.08) : 0.01;
      const progress = focus.reduced
        ? 1
        : Math.min(1, Math.max(0, (now - started - 260 - i * 4) / 600));
      mesh.scale.y = 0.02 + 0.98 * (1 - (1 - progress) ** 3);
      mesh.position.y =
        baseY +
        (selected ? 0.22 : 0) +
        (focus.reduced ? 0 : Math.sin(now * 0.0004 + i * 0.12) * 0.018);
      mesh.children.forEach((c) => {
        if (c instanceof T.LineSegments) c.material.opacity = selected ? 1 : related ? 0.65 : 0.18;
      });
    });
    if (!focus.reduced) {
      camera.position.lerp(targetPos, 0.045);
      look.lerp(targetLook, 0.045);
    }
    root.rotation.y = focus.reduced ? 0 : pointerX;
    root.rotation.x = focus.reduced ? 0 : pointerY;
    camera.lookAt(look);
    const focusUniform = (bokeh.uniforms as Record<string, { value: number }>).focus;
    if (focusUniform) focusUniform.value = camera.position.distanceTo(look);
    composer.render();
    labelNodes.forEach(({ node, position }) => {
      const v = position.clone().project(camera);
      node.style.left = `${Math.max(70, Math.min(el.clientWidth - 70, (v.x * 0.5 + 0.5) * el.clientWidth))}px`;
      node.style.top = `${(-v.y * 0.5 + 0.5) * el.clientHeight}px`;
      node.hidden = v.z > 1 || v.z < 0;
    });
  }
  function loop(now: number) {
    frame = 0;
    render(now);
    if (!focus.reduced && inView && !document.hidden) frame = requestAnimationFrame(loop);
  }
  function resize() {
    const w = el.clientWidth,
      h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(el);
  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (inView && !document.hidden) {
      resize();
      if (!focus.reduced) frame = requestAnimationFrame(loop);
    }
  }
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false;
    syncAnimation();
  });
  intersection.observe(el);
  document.addEventListener("visibilitychange", syncAnimation);
  function click(event: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(mouse, camera);
    const hit = ray
      .intersectObjects(
        pages.map((p) => p.mesh),
        false,
      )
      .find((h) => {
        const p = pages.find((p) => p.mesh === h.object);
        return p && (focus.space === "all" || p.paper.spaces.includes(focus.space));
      });
    const paper = pages.find((p) => p.mesh === hit?.object)?.paper;
    if (paper) select(paper.id);
  }
  function move(event: PointerEvent) {
    if (focus.reduced) return;
    const rect = el.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.1;
  }
  function leave() {
    pointerX = pointerY = 0;
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const pool = papers.filter((p) => focus.space === "all" || p.spaces.includes(focus.space));
      const index = pool.findIndex((p) => p.id === focus.id);
      const p = pool[(index + (event.key === "ArrowRight" ? 1 : -1) + pool.length) % pool.length];
      if (p) select(p.id);
    }
  }
  renderer.domElement.addEventListener("click", click);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerleave", leave);
  renderer.domElement.addEventListener("keydown", keydown);
  await renderer.compileAsync(scene, camera);
  resize();
  return {
    setFocus,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      renderer.domElement.removeEventListener("click", click);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("keydown", keydown);
      scene.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Line) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.dispose();
          });
        }
      });
      composer.passes.forEach((p) => {
        p.dispose();
      });
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.remove();
    },
  };
}
