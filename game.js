import * as THREE from 'three';

const mount = document.querySelector('#game');
const speedLabel = document.querySelector('#speed');
const distanceLabel = document.querySelector('#distance');
const startScreen = document.querySelector('#start-screen');
const gameOverScreen = document.querySelector('#game-over');
const finalDistance = document.querySelector('#final-distance');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07101f);
scene.fog = new THREE.FogExp2(0x07101f, 0.0028);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 5.5, 11);
camera.lookAt(0, -2, -35);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xa5dfff, 0x292039, 1.8));
const sun = new THREE.DirectionalLight(0xffd6a0, 2.4);
sun.position.set(-35, 65, -80);
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0x45aaff, 0.8);
fillLight.position.set(30, 12, 20);
scene.add(fillLight);

function makeShip() {
  const ship = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xb8d8e8, metalness: 0.82, roughness: 0.24 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14283b, metalness: 0.75, roughness: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x37dfff });

  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.9, 8), hullMat);
  hull.rotation.x = -Math.PI / 2;
  hull.position.z = -0.25;
  ship.add(hull);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: 0x20bce8, metalness: 0.45, roughness: 0.12, transparent: true, opacity: 0.88 })
  );
  cockpit.scale.set(0.8, 0.55, 1.35);
  cockpit.position.set(0, 0.25, -0.28);
  ship.add(cockpit);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 1.05), darkMat);
    wing.position.set(side * 0.83, -0.08, 0.22);
    wing.rotation.y = side * -0.12;
    ship.add(wing);

    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.55), glowMat);
    tip.position.set(side * 1.48, -0.02, 0.12);
    ship.add(tip);

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.65, 12), glowMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(side * 0.38, -0.08, 1.45);
    ship.add(engine);
  }

  const engineGlow = new THREE.PointLight(0x27cfff, 3, 9);
  engineGlow.position.set(0, 0, 1.7);
  ship.add(engineGlow);
  return ship;
}

const ship = makeShip();
scene.add(ship);

// Starfield
const starPositions = new Float32Array(1800 * 3);
for (let i = 0; i < 1800; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 300;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 180;
  starPositions[i * 3 + 2] = -Math.random() * 500 + 30;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
  color: 0xb5e5ff, size: 0.5, sizeAttenuation: true
}));
scene.add(stars);

// Continuous procedural alien terrain. The height function uses world coordinates,
// so adjacent terrain sections line up perfectly when they recycle.
const TERRAIN_WIDTH = 260;
const TERRAIN_LENGTH = 180;
const TERRAIN_SEGMENTS = 72;
const TERRAIN_BASE = -7.5;

function terrainHeight(x, z) {
  const broad = Math.sin(x * 0.025 + z * 0.009) * 3.1;
  const rolling = Math.sin(x * 0.061 - z * 0.018) * 1.15;
  const ridge = Math.pow(Math.max(0, Math.sin(x * 0.018 + z * 0.014)), 3) * 8;
  const detail = Math.sin(x * 0.13 + z * 0.07) * 0.28
    + Math.cos(x * 0.09 - z * 0.11) * 0.22;
  const valley = Math.sin(z * 0.012) * 1.2;
  return TERRAIN_BASE + broad + rolling + ridge + detail + valley;
}

function makeTerrainChunk(centerZ) {
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_WIDTH, TERRAIN_LENGTH, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS
  );
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const localZ = positions.getZ(i);
    const worldZ = centerZ + localZ;
    const height = terrainHeight(x, worldZ);
    positions.setY(i, height - TERRAIN_BASE);

    const shade = THREE.MathUtils.clamp((height + 13) / 20, 0, 1);
    color.setRGB(
      0.19 + shade * 0.18,
      0.22 + shade * 0.12,
      0.29 + shade * 0.08
    );
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.position.set(0, TERRAIN_BASE, centerZ);
  terrain.frustumCulled = false;
  scene.add(terrain);
  return terrain;
}

const terrainChunks = [
  makeTerrainChunk(-100),
  makeTerrainChunk(-280),
  makeTerrainChunk(-460)
];

// Decorative distant mountain silhouettes
function makeMountainRange() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x202d46, roughness: 1, flatShading: true
  });
  for (let i = 0; i < 32; i++) {
    const height = 12 + Math.random() * 25;
    const width = 12 + Math.random() * 20;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(width, height, 5),
      material
    );
    mountain.position.set(
      -145 + i * 9.3,
      -3 + height * 0.45,
      -390 - Math.random() * 35
    );
    mountain.rotation.y = Math.random() * Math.PI;
    group.add(mountain);
  }
  scene.add(group);
}
makeMountainRange();

const clock = new THREE.Clock();
const target = new THREE.Vector2();
const pointer = new THREE.Vector2();
let running = false;
let elapsed = 0;
let distance = 0;
let speed = 62;

function updatePointer(clientX, clientY) {
  pointer.x = (clientX / innerWidth - 0.5) * 2;
  pointer.y = (clientY / innerHeight - 0.5) * 2;
  pointer.x = THREE.MathUtils.clamp(pointer.x, -1, 1);
  pointer.y = THREE.MathUtils.clamp(pointer.y, -1, 1);
}

window.addEventListener('pointermove', event => {
  updatePointer(event.clientX, event.clientY);
}, { passive: true });

function resetGame() {
  elapsed = 0;
  distance = 0;
  speed = 62;
  ship.position.set(0, 0, 0);
  ship.rotation.set(0, 0, 0);
  target.set(0, 0);
  pointer.set(0, 0);
  camera.position.set(0, 5.5, 11);
  distanceLabel.textContent = '0';
  speedLabel.textContent = String(speed);
  gameOverScreen.classList.add('hidden');
  startScreen.classList.add('hidden');
  running = true;
}

document.querySelector('#start-button').addEventListener('click', resetGame);
document.querySelector('#restart-button').addEventListener('click', resetGame);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (running) {
    elapsed += dt;
    speed = Math.min(62 + elapsed * 1.1, 112);
    distance += speed * dt * 0.12;
    speedLabel.textContent = String(Math.round(speed));
    distanceLabel.textContent = Math.floor(distance).toLocaleString();

    // The steering range adapts to the viewport's aspect ratio.
    const aspect = innerWidth / innerHeight;
    const horizontalLimit = THREE.MathUtils.clamp(8.5 * aspect, 5.5, 17);
    const verticalLimit = THREE.MathUtils.clamp(5.2 / Math.max(0.65, aspect), 3.5, 7);
    const desiredX = pointer.x * horizontalLimit;
    const desiredY = -pointer.y * verticalLimit;

    // Exponential smoothing behaves consistently at different frame rates.
    const steeringEase = 1 - Math.exp(-5.5 * dt);
    target.x += (desiredX - target.x) * steeringEase;
    target.y += (desiredY - target.y) * steeringEase;
    ship.position.x = target.x;
    ship.position.y = target.y;

    const tiltEase = 1 - Math.exp(-4 * dt);
    ship.rotation.z += (-pointer.x * 0.42 - ship.rotation.z) * tiltEase;
    ship.rotation.x += (pointer.y * 0.18 - ship.rotation.x) * tiltEase;

    camera.position.x += (ship.position.x * 0.2 - camera.position.x) * tiltEase;
    camera.position.y += (5.5 + ship.position.y * 0.12 - camera.position.y) * tiltEase;
    camera.lookAt(ship.position.x * 0.22, -2 + ship.position.y * 0.12, -35);

    // Move each terrain section toward the camera, then recycle it far ahead.
    const terrainSpeed = speed * dt * 0.72;
    for (const chunk of terrainChunks) {
      chunk.position.z += terrainSpeed;
      if (chunk.position.z > 80) {
        chunk.position.z -= TERRAIN_LENGTH * terrainChunks.length;
      }
    }
  }

  const positions = starGeometry.attributes.position.array;
  const starSpeed = running ? speed * 0.72 : 3;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] += starSpeed * dt;
    if (positions[i + 2] > 30) {
      positions[i + 2] = -500;
      positions[i] = (Math.random() - 0.5) * 300;
      positions[i + 1] = (Math.random() - 0.5) * 180;
    }
  }
  starGeometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}
animate();

function resizeGame() {
  const width = mount.clientWidth || innerWidth;
  const height = mount.clientHeight || innerHeight;
  camera.aspect = width / height;
  camera.fov = width < 600 ? 76 : 68;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(devicePixelRatio, width < 600 ? 1.35 : 1.75));
}
window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', () => setTimeout(resizeGame, 150));
resizeGame();
