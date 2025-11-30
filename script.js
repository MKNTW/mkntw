const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

// Динамический размер призмы
function updatePrismSize() {
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.5;
    return size / 100;
}

let prism = new THREE.Mesh(
    new THREE.TetrahedronGeometry(updatePrismSize(), 0),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 1.0,
        thickness: 3.5,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.52,
        envMapIntensity: 25
    })
);
scene.add(prism);

// Цветные лучи
const light1 = new THREE.PointLight(0x00ffaa, 9, 50);
light1.position.set(-14, 0, 12);
scene.add(light1);

const light2 = new THREE.PointLight(0xff3388, 9, 50);
light2.position.set(14, 0, 12);
scene.add(light2);

const light3 = new THREE.PointLight(0x4488ff, 6, 50);
light3.position.set(0, 12, 10);
scene.add(light3);

// Камера подстраивается
camera.position.z = window.innerWidth < 768 ? 11 : 9;

function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.003;
    prism.rotation.x += 0.0012;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    // Пересоздаём призму при сильном изменении размера
    scene.remove(prism);
    prism = new THREE.Mesh(
        new THREE.TetrahedronGeometry(updatePrismSize(), 0),
        prism.material
    );
    scene.add(prism);
});
