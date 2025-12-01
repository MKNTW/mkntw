const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = window.innerWidth < 768 ? 14 : 11.5;

// ГАРАНТИРОВАННОЕ HDR ОКРУЖЕНИЕ (даже если интернет упал)
let envMap = new THREE.Texture();
new THREE.RGBELoader()
    .load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/files/textures/equirectangular/royal_esplanade_1k.hdr',
        (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            envMap = texture;
            scene.environment = envMap;
            scene.background = new THREE.Color(0x000000);
            createPrism(); // перерисовываем с настоящим HDR
        },
        undefined,
        () => {
            // Fallback — яркое внутреннее свечение, если HDR не загрузился
            scene.environment = null;
            createPrism();
        }
    );

// ЖИДКАЯ СТЕКЛЯННАЯ ПРИЗМА — ВИДНА ВСЕГДА
let prism;
function createPrism() {
    if (prism) scene.remove(prism);

    const s = Math.min(innerWidth, innerHeight) * 0.5;
    const geo = new THREE.TetrahedronGeometry(s / 100, 0);

    prism = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 0.98,
        thickness: 4.5,
        ior: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0,
        envMapIntensity: envMap ? 15 : 30, // если нет HDR — делаем ярче
        reflectivity: 1,
        specularIntensity: 2.5,
        attenuationColor: new THREE.Color(1, 1, 1),
    }));

    // ДОПОЛНИТЕЛЬНЫЙ ВНУТРЕННИЙ СВЕТ — ПРИЗМА СВЕТИТСЯ САМА ПО СЕБЕ
    prism.material.emissive = new THREE.Color(0x2244ff);
    prism.material.emissiveIntensity = envMap ? 0.3 : 1.2;

    scene.add(prism);
}
createPrism();

// Яркие, но мягкие лучи
["#00ffff", "#ff0088", "#aaff00"].forEach((color, i) => {
    const light = new THREE.PointLight(color, 18, 80);
    light.position.set(
        Math.sin(i * 2.4) * 20,
        Math.cos(i * 2.4) * 10,
        15
    );
    scene.add(light);
});

// Пасхалка — 3 клика
let taps = 0;
document.addEventListener('click', () => {
    if (++taps === 3) {
        document.getElementById('easter').classList.toggle('show');
        taps = 0;
    }
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.0045;
    prism.rotation.x += 0.002;
    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    camera.position.z = w < 768 ? 14 : 11.5;
    createPrism();
});
