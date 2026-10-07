import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { AtlasPaper } from "./atlas";
import type { AtlasFocus, AtlasSpace } from "./protocol";

type Dot = {
  object: T.Mesh<T.SphereGeometry, T.MeshBasicMaterial>;
  paper: AtlasPaper;
  space: string;
  color: T.Color;
  size: number;
};
const tones = [0xaea3dc, 0xd8bd8c, 0x91bcb1];
const hash = (id: string) =>
  [...id].reduce((n, c) => ((n << 5) - n + c.charCodeAt(0)) | 0, 0) >>> 0;
function onShell(index: number, count: number, radius: number, seed: number) {
  const y = 1 - (2 * (index + 0.5)) / Math.max(count, 1);
  const a = index * Math.PI * (3 - Math.sqrt(5)) + seed;
  const r = Math.sqrt(1 - y * y);
  return new T.Vector3(Math.cos(a) * r * radius, y * radius * 0.84, Math.sin(a) * r * radius);
}
function curve(points: T.Vector3[], color: number, opacity: number) {
  const geometry = new T.BufferGeometry().setFromPoints(
    new T.CatmullRomCurve3(points).getPoints(48),
  );
  return new T.Line(
    geometry,
    new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
}
/** 每个亮点是一篇论文或概念；连线仅来自其真实概念关系。 */
export function createScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  papers: AtlasPaper[],
  spaces: AtlasSpace[],
  pixelRatio: number,
  selectPaper: (id: string) => void,
  selectSpace: (id: string) => void,
) {
  const scene = new T.Scene();
  scene.background = new T.Color(0x101117);
  scene.fog = new T.FogExp2(0x101117, 0.028);
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0.6, 9.2);
  camera.lookAt(0, 0.25, 0);
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.8, 0.6, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const root = new T.Group();
  root.position.y = spaces.length <= 2 ? 0.12 : 0.82;
  scene.add(root);
  const sphere = new T.SphereGeometry(0.025, 12, 8);
  const centers =
    spaces.length === 1
      ? [new T.Vector3(0, 0, 0)]
      : spaces.length === 2
        ? [new T.Vector3(0, 1.35, -0.15), new T.Vector3(0.06, -1.35, 0.1)]
        : [
            new T.Vector3(-1.2, 1.07, -0.15),
            new T.Vector3(1.05, -0.08, 0.1),
            new T.Vector3(-0.86, -1.27, -0.4),
          ];
  const groups: T.Group[] = [],
    dots: Dot[] = [],
    lines: {
      line: T.Line<T.BufferGeometry, T.LineBasicMaterial>;
      papers: string[];
      space: string;
      concepts: string[];
    }[] = [];
  for (const [i, space] of spaces.entries()) {
    const members = papers.filter((p) => (p.categoryIds ?? p.spaces).includes(space.id));
    const color = tones[i % tones.length]!;
    const center = centers[i % centers.length]!.clone();
    const radius = 0.72 + Math.sqrt(members.length) * 0.034;
    const group = new T.Group();
    group.position.copy(center);
    root.add(group);
    groups.push(group);
    const conceptIds = [...new Set(members.flatMap((p) => p.concepts.map((c) => c.id)))];
    const conceptPositions = new Map(
      conceptIds.map((id, j) => [
        id,
        onShell(j, conceptIds.length, radius * 0.86, (hash(space.id) % 100) / 10),
      ]),
    );
    // 研究空间的外轮廓由真实论文与概念数量共同确定。
    const shellGeometry = new T.IcosahedronGeometry(radius, 3);
    const vertices = shellGeometry.attributes.position!;
    for (let j = 0; j < vertices.count; j++) {
      const v = new T.Vector3().fromBufferAttribute(vertices, j);
      const f = 1 + 0.085 * Math.sin(v.x * 3 + i) * Math.cos(v.y * 3 - i);
      vertices.setXYZ(j, v.x * f, v.y * f * 0.84, v.z * f);
    }
    shellGeometry.computeVertexNormals();
    const shell = new T.Mesh(
      shellGeometry,
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.012,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    group.add(shell);
    const contour = new T.LineSegments(
      new T.WireframeGeometry(shellGeometry),
      new T.LineBasicMaterial({ color, transparent: true, opacity: 0.022, depthWrite: false }),
    );
    group.add(contour);
    const pointGeometry = new T.BufferGeometry().setFromPoints([...conceptPositions.values()]);
    group.add(
      new T.Points(
        pointGeometry,
        new T.PointsMaterial({
          color,
          size: 0.025,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
          sizeAttenuation: true,
        }),
      ),
    );
    members.forEach((p, j) => {
      const position = onShell(j, members.length, radius, hash(space.id) % 10);
      const material = new T.MeshBasicMaterial({
        color: new T.Color(color).multiplyScalar(1.6),
        transparent: true,
        opacity: 0.75,
      });
      const dot = new T.Mesh(sphere, material);
      dot.position.copy(position);
      dot.userData.paper = p.id;
      group.add(dot);
      const size = 0.66 + Math.min(p.concepts.length, 12) * 0.07;
      dot.scale.setScalar(size);
      dots.push({ object: dot, paper: p, space: space.id, color: new T.Color(color), size });
      for (const concept of p.concepts) {
        const target = conceptPositions.get(concept.id);
        if (!target) continue;
        const mid = position.clone().add(target).multiplyScalar(0.52);
        mid.z += 0.12;
        const line = curve([position, mid, target], color, 0.1);
        group.add(line);
        lines.push({ line, papers: [p.id], space: space.id, concepts: [concept.id] });
      }
    });
    const ids = members.map((p) => p.id);
    // 相邻论文之间只连接实际共享概念的节点，不制造装饰性关系。
    for (let j = 0; j < members.length; j++) {
      const a = members[j]!;
      const b = members.find(
        (p, k) => k > j && p.concepts.some((c) => a.concepts.some((ac) => ac.id === c.id)),
      );
      if (!b) continue;
      const one = dots.find((d) => d.paper.id === a.id && d.space === space.id)!,
        two = dots.find((d) => d.paper.id === b.id && d.space === space.id)!;
      const mid = one.object.position.clone().add(two.object.position).multiplyScalar(0.4);
      const line = curve([one.object.position, mid, two.object.position], color, 0.16);
      group.add(line);
      lines.push({
        line,
        papers: [a.id, b.id],
        space: space.id,
        concepts: a.concepts
          .filter((c) => b.concepts.some((bc) => bc.id === c.id))
          .map((c) => c.id),
      });
    }
    shell.userData.space = space.id;
    group.userData = { space: space.id, ids };
  }
  // 跨研究空间的桥梁来自多空间论文，避免把所有类别任意连在一起。
  for (const p of papers.filter((p) => (p.categoryIds ?? p.spaces).length > 1)) {
    const linked = dots.filter((d) => d.paper.id === p.id);
    for (let j = 1; j < linked.length; j++) {
      const a = linked[0]!,
        b = linked[j]!;
      const pa = a.object.position.clone().add(a.object.parent!.position),
        pb = b.object.position.clone().add(b.object.parent!.position);
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      mid.z -= 0.65;
      const line = curve([pa, mid, pb], 0xb7b2c8, 0.07);
      root.add(line);
      lines.push({ line, papers: [p.id], space: "all", concepts: p.concepts.map((c) => c.id) });
    }
  }
  const selection = new T.Group();
  root.add(selection);
  const haloGeometry = new T.SphereGeometry(0.08, 16, 10);
  const halo = new T.Mesh(
    haloGeometry,
    new T.MeshBasicMaterial({
      color: 0xdfbb83,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  selection.add(halo);
  const orbit = new T.LineLoop(
    new T.BufferGeometry().setFromPoints(
      Array.from(
        { length: 80 },
        (_, i) =>
          new T.Vector3(
            Math.cos((i * Math.PI) / 40) * 0.12,
            Math.sin((i * Math.PI) / 40) * 0.12,
            0,
          ),
      ),
    ),
    new T.LineBasicMaterial({ color: 0xe2c7a0, transparent: true, opacity: 0.8 }),
  );
  selection.add(orbit);
  let focus: AtlasFocus = { id: "", space: "all", concept: null, reduced: true };
  let visible = false,
    running = false,
    frame = 0,
    disposed = false,
    ticks = 0;
  const pointer = new T.Vector2(),
    raycaster = new T.Raycaster(),
    targetRotation = new T.Vector2();
  const targetCamera = new T.Vector3(0, 0.6, 9.2),
    targetLook = new T.Vector3(0, 0.25, 0),
    look = targetLook.clone();
  let start = performance.now();
  function setFocus(next: AtlasFocus) {
    focus = next;
    const current = papers.find((p) => p.id === next.id);
    const concepts = new Set(current?.concepts.map((c) => c.id) ?? []);
    for (const d of dots) {
      const active = d.paper.id === next.id;
      const related = d.paper.concepts.some((c) =>
        next.concept ? c.id === next.concept : concepts.has(c.id),
      );
      const inSpace = next.space === "all" || d.space === next.space;
      d.object.material.color.copy(
        active ? new T.Color(0xe5bd82).multiplyScalar(2.1) : d.color.clone().multiplyScalar(1.5),
      );
      d.object.material.opacity = active
        ? 1
        : !inSpace
          ? 0.15
          : related
            ? 0.9
            : next.concept
              ? 0.2
              : 0.48;
      d.object.scale.setScalar(d.size * (active ? 2.1 : related ? 1.2 : 1));
    }
    for (const { line, papers: ids, space: id, concepts: labels } of lines) {
      const chosen = next.concept ? labels.includes(next.concept) : ids.includes(next.id);
      line.material.color.set(chosen ? 0xd8bb91 : 0x89819f);
      line.material.opacity = chosen
        ? 0.62
        : next.space !== "all" && id !== next.space
          ? 0.035
          : 0.1;
    }
    const selectedDot = dots.find(
      (d) => d.paper.id === next.id && (next.space === "all" || d.space === next.space),
    );
    if (selectedDot) {
      selection.position.copy(selectedDot.object.position).add(selectedDot.object.parent!.position);
      selection.visible = true;
    } else selection.visible = false;
    const index = spaces.findIndex((s) => s.id === next.space);
    const center =
      index >= 0 ? centers[index % centers.length]!.clone() : new T.Vector3(0, 0.25, 0);
    targetCamera.set(
      index >= 0 ? center.x * 0.28 : 0,
      0.6 + center.y * 0.16,
      index >= 0 ? 8.3 : 9.2,
    );
    targetLook.set(center.x * 0.3, 0.25 + center.y * 0.12, 0);
    if (next.reduced) {
      camera.position.copy(targetCamera);
      look.copy(targetLook);
      root.rotation.set(0, 0, 0);
    }
    requestRender();
  }
  function render(now: number) {
    running = false;
    if (disposed || !visible) return;
    const elapsed = (now - start) / 1000;
    if (!focus.reduced) {
      camera.position.lerp(targetCamera, 0.05);
      look.lerp(targetLook, 0.05);
      root.rotation.y +=
        (targetRotation.x * 0.11 + Math.sin(elapsed * 0.14) * 0.025 - root.rotation.y) * 0.025;
      root.rotation.x += (targetRotation.y * 0.055 - root.rotation.x) * 0.025;
      halo.scale.setScalar(1 + Math.sin(elapsed * 1.1) * 0.12);
      orbit.rotation.z = elapsed * 0.065;
    }
    camera.lookAt(look);
    orbit.quaternion.copy(camera.quaternion);
    const reveal = focus.reduced ? 1 : Math.min(1, Math.max(0, (elapsed - 0.1) / 1.2));
    root.scale.setScalar(0.975 + reveal * 0.025);
    bloom.strength = 0.68 * reveal;
    // 30fps 足够微动；不可见、后台或减少动态时完全停帧。
    composer.render();
    ticks++;
    if (!focus.reduced) {
      running = true;
      frame = requestAnimationFrame((t) => {
        if (ticks % 2 === 0) render(t);
        else {
          ticks++;
          frame = requestAnimationFrame(render);
        }
      });
    }
  }
  function requestRender() {
    if (!running && !disposed && visible) {
      running = true;
      frame = requestAnimationFrame(render);
    }
  }
  function resize(width: number, height: number) {
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }
  function setVisible(next: boolean) {
    visible = next;
    if (!visible) {
      cancelAnimationFrame(frame);
      running = false;
    } else requestRender();
  }
  const move = (x: number, y: number) => {
    if (focus.reduced) return;
    targetRotation.set(x, y);
  };
  const leave = () => targetRotation.set(0, 0);
  const click = (x: number, y: number) => {
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(root.children, true)[0];
    if (hit?.object.userData.paper) selectPaper(hit.object.userData.paper);
    else if (hit?.object.userData.space) selectSpace(hit.object.userData.space);
  };
  start = performance.now();
  requestRender();
  return {
    setFocus,
    resize,
    setVisible,
    move,
    leave,
    click,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      scene.traverse((object) => {
        const mesh = object as T.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) {
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
            m.dispose();
        }
      });
      composer.dispose();
      renderer.dispose();
    },
  };
}
