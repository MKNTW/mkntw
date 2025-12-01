import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 20;

const size = Math.min(window.innerWidth, window.innerHeight) * 0.008;
const prism = new THREE.Mesh(
    new THREE.TetrahedronGeometry(size, 0),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 0.98,
        thickness: 8,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.74,
        envMapIntensity: 15
    })
);
prism.position.y = -1.5;
scene.add(prism);

// Освещение — как в Vision Pro
scene.add(new THREE.AmbientLight(0x404060, 5));
const light = new THREE.DirectionalLight(0xffffff, 15);
light.position.set(-10, 15, 20);
scene.add(light);

// Радужные лучи
const colors = [0xff0000, 0xff6600, 0xffff00, 0x00ff00, 0x0088ff, 0x6600ff, 0xff00ff];
colors.forEach((c, i) => {
    const light = new THREE.SpotLight(c, 12, 80, Math.PI/6);
    light.position.copy(prism.position);
    const angle = (i / colors.length) * Math.PI * 2;
    light.position.x += Math.sin(angle) * 6;
    light.position.y += Math.cos(angle) * 4 - 4;
    light.target.position.y = -50;
    scene.add(light);
    scene.add(light.target);
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.006;
    prism.rotation.x += 0.002;
    renderer.render(scene, camera);
}
animate();

// Ресайз
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const newSize = Math.min(window.innerWidth, window.innerHeight) * 0.008;
    prism.geometry.dispose();
    prism.geometry = new THREE.TetrahedronGeometry(newSize, 0);
});

// Пасхалка — 5 кликов
let clicks = 0;
let timer = null;
canvas.addEventListener('click', () => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => clicks = 0, 3000);
    if (clicks >= 5) {
        clicks = 0;
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9999;display:grid;place-items:center;backdrop-filter:blur(30px)';
        div.innerHTML = `<h2 style="font-size:clamp(60px,15vw,180px);background:linear-gradient(45deg,#00ffaa,#ff3366,#00ffff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:pulse 2s infinite">САУБОЛ КОТАК</h2>`;
        div.onclick = () => div.remove();
        document.body.appendChild(div);
    }
});
