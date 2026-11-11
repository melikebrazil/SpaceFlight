import * as THREE from 'three';

const mount = document.querySelector('#game');
const speedLabel = document.querySelector('#speed');
const distanceLabel = document.querySelector('#distance');
const startScreen = document.querySelector('#start-screen');
const gameOverScreen = document.querySelector('#game-over');
const finalDistance = document.querySelector('#final-distance');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050816);
scene.fog = new THREE.FogExp2(0x050816, 0.0032);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 700);
camera.position.set(0, 3.2, 10);
camera.lookAt(0, 0, -25);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9bdcff, 0x11152d, 1.5));
const keyLight = new THREE.DirectionalLight(0x9beaff, 2.2);
keyLight.position.set(-5, 8, 5);
scene.add(keyLight);

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
ship.position.set(0, 0, 0);
scene.add(ship);

const starPositions = new Float32Array(1800 * 3);
for (let i = 0; i < 1800; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 240;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 150;
  starPositions[i * 3 + 2] = -Math.random() * 260 + 25;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x9edfff, size: 0.48, sizeAttenuation: true }));
scene.add(stars);

const asteroidGeometry = new THREE.IcosahedronGeometry(1, 1);
const asteroidMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x596879, roughness: 1, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x34465b, roughness: 1, flatShading: true })
];
const asteroids = [];
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const target = new THREE.Vector2();
let running = false;
let elapsed = 0;
let distance = 0;
let spawnTimer = 0;
let speed = 62;

function spawnAsteroid() {
  const size = 1.1 + Math.random() * 2.1;
  const rock = new THREE.Mesh(asteroidGeometry, asteroidMaterials[Math.floor(Math.random() * asteroidMaterials.length)]);
  rock.scale.set(size * (0.8 + Math.random() * 0.5), size * (0.8 + Math.random() * 0.5), size);
  rock.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 20, -145);
  rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  rock.userData.spin = new THREE.Vector3(Math.random() * 0.8, Math.random() * 0.8, Math.random() * 0.8);
  scene.add(rock);
  asteroids.push(rock);
}

function clearAsteroids() {
  for (const rock of asteroids) scene.remove(rock);
  asteroids.length = 0;
}

function resetGame() {
  clearAsteroids();
  elapsed = 0;
  distance = 0;
  spawnTimer = 0;
  speed = 62;
  ship.position.set(0, 0, 0);
  ship.rotation.set(0, 0, 0);
  target.set(0, 0);
  distanceLabel.textContent = '0';
  speedLabel.textContent = String(speed);
  gameOverScreen.classList.add('hidden');
  startScreen.classList.add('hidden');
  running = true;
}

function endGame() {
  running = false;
  finalDistance.textContent = Math.floor(distance).toLocaleString();
  gameOverScreen.classList.remove('hidden');
}

function onPointerMove(event) {
  target.x = (event.clientX / innerWidth - 0.5) * 2;
  target.y = (event.clientY / innerHeight - 0.5) * 2;
  target.x = THREE.MathUtils.clamp(target.x, -1, 1);
  target.y = THREE.MathUtils.clamp(target.y, -1, 1);
}
window.addEventListener('pointermove', onPointerMove);

document.querySelector('#start-button').addEventListener('click', resetGame);
document.querySelector('#restart-button').addEventListener('click', resetGame);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (running) {
    elapsed += dt;
    speed = Math.min(62 + elapsed * 1.3, 115);
    distance += speed * dt * 0.12;
    speedLabel.textContent = String(Math.round(speed));
    distanceLabel.textContent = Math.floor(distance).toLocaleString();

    ship.position.x += (target.x * 17 - ship.position.x) * Math.min(1, dt * 3.8);
    ship.position.y += (-target.y * 9 - ship.position.y) * Math.min(1, dt * 3.8);
    ship.rotation.z += (-target.x * 0.48 - ship.rotation.z) * Math.min(1, dt * 3);
    ship.rotation.x += (target.y * 0.2 - ship.rotation.x) * Math.min(1, dt * 3);

    camera.position.x += (ship.position.x * 0.22 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (3.2 + ship.position.y * 0.12 - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(ship.position.x * 0.25, ship.position.y * 0.2, -25);

    spawnTimer += dt;
    if (spawnTimer > Math.max(0.42, 1.05 - elapsed * 0.008)) {
      spawnAsteroid();
      spawnTimer = 0;
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const rock = asteroids[i];
      rock.position.z += speed * dt * 0.72;
      rock.rotation.x += rock.userData.spin.x * dt;
      rock.rotation.y += rock.userData.spin.y * dt;
      rock.rotation.z += rock.userData.spin.z * dt;

      const dx = rock.position.x - ship.position.x;
      const dy = rock.position.y - ship.position.y;
      const dz = rock.position.z - ship.position.z;
      const hitRadius = Math.max(1.5, rock.scale.x * 0.65);
      if (dx * dx + dy * dy + dz * dz < hitRadius * hitRadius) {
        endGame();
        break;
      }
      if (rock.position.z > 18) {
        scene.remove(rock);
        asteroids.splice(i, 1);
      }
    }
  }

  const positions = starGeometry.attributes.position.array;
  const starSpeed = running ? speed * 0.9 : 5;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] += starSpeed * dt;
    if (positions[i + 2] > 25) positions[i + 2] = -260;
  }
  starGeometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});