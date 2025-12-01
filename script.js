const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = window.innerWidth < 768 ? 12 : 10;

// Создаём окружение для отражений (важно для стекла!)
const envTexture = new THREE.TextureLoader().load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/equirectangular/royal_esplanade_1k.hdr');
envTexture.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = envTexture;

// Стеклянная призма в стиле iOS 18 / macOS Sequoia
function createPrism() {
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.45;
    const geometry = new THREE.TetrahedronGeometry(size / 100, 0);

    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.0,
        transmission: 0.98,      // почти полностью прозрачная
        thickness: 2.8,           // толщина для преломления
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        ior: 1.5,
        envMapIntensity: 10,
        reflectivity: 1.0,
        attenuationDistance: 0,
        attenuationColor: new THREE.Color(0xffffff),
        specularIntensity: 1.5
    });

    const prism = new THREE.Mesh(geometry, material);
    scene.add(prism);
    return prism;
}

let prism = createPrism();

// Цветные лучи — стали мягче и атмосфернее
const light1 = new THREE.PointLight(0x00ffcc, 12, 60);
light1.position.set(-16, -2, 14);
scene.add(light1);

const light2 = new THREE.PointLight(0xff4499, 12, 60);
light2.position.set(16, 0, 14);
scene.add(light2);

const light3 = new THREE.PointLight(0x5588ff, 8, 60);
light3.position.set(0, 14, 12);
scene.add(light3);

// Пасхалка по тачу/клику
const easter = document.getElementById('easter');
let clicks = 0;
document.addEventListener('click', () => {
    clicks++;
    if (clicks === 3) {
        easter.classList.toggle('show');
        clicks = 0;
    }
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.0035;
    prism.rotation.x += 0.0015;
    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    scene.remove(prism);
    prism = createPrism();
    camera.position.z = w < 768 ? 12 : 10;
});
