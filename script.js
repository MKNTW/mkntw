const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = window.innerWidth < 768 ? 13 : 11;

// === ЭТО ГЛАВНОЕ: HDR окружение с fallback ===
let envMap;
new THREE.RGBELoader()
    .setPath('https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/equirectangular/')
    .load('royal_esplanade_1k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        envMap = texture;
        scene.environment = envMap;
        scene.background = new THREE.Color(0x000000);
        updatePrism(); // перерисовываем призму с настоящим отражением
    }, undefined, () => {
        // Fallback если HDR не загрузился
        const fallback = new THREE.CubeTextureLoader()
            .setPath('https://threejs.org/examples/textures/cube/pisa/')
            .load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);
        fallback.mapping = THREE.CubeReflectionMapping;
        envMap = fallback;
        scene.environment = envMap;
        updatePrism();
    });

// === Жидкая стеклянная призма ===
let prism;
function updatePrism() {
    if (prism) scene.remove(prism);

    const scale = Math.min(window.innerWidth, window.innerHeight) * 0.48;
    const geometry = new THREE.TetrahedronGeometry(scale / 100, 0);

    prism = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.02,
        roughness: 0.0,
        transmission: 0.99,
        thickness: 3.8,
        ior: 1.49,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        reflectivity: 1.0,
        envMapIntensity: 12,
        attenuationDistance: 0,
        specularIntensity: 2.0,
        specularColor: 0xffffff,
    }));

    scene.add(prism);
}
updatePrism(); // создаём сразу, даже если HDR ещё грузится

// Мягкие цветные лучи
const lights = [
    new THREE.PointLight(0x00ffff, 15, 70),
    new THREE.PointLight(0xff00aa, 15, 70),
    new THREE.PointLight(0xaaff88, 10, 70),
];
lights[0].position.set(-18, -3, 15);
lights[1].position.set(18, 2, 15);
lights[2].position.set(0, 16, 13);
lights.forEach(l => scene.add(l));

// Пасхалка — 3 клика
let clicks = 0;
document.addEventListener('click', () => {
    if (++clicks === 3) {
        document.getElementById('easter').classList.toggle('show');
        clicks = 0;
    }
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.004;
    prism.rotation.x += 0.0018;
    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    camera.position.z = w < 768 ? 13 : 11;
    updatePrism();
});
