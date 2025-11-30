const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 8.5;

// Стеклянная призма с преломлением
const prism = new THREE.Mesh(
    new THREE.TetrahedronGeometry(3, 0),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 1.0,
        thickness: 3.2,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.5,
        envMapIntensity: 25
    })
);
scene.add(prism);

// Цветные лучи (точно как на оригинальном скриншоте)
scene.add(new THREE.PointLight(0x00ffaa, 8, 40)).position.set(-12, 0, 10);
scene.add(new THREE.PointLight(0xff3388, 8, 40)).position.set(12, 0, 10);
scene.add(new THREE.PointLight(0x4488ff, 5, 40)).position.set(0, 10, 8);

// Медленное вращение (убери, если нужна 100% статика)
function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.003;
    prism.rotation.x += 0.0012;
    renderer.render(scene, camera);
}
animate();

// Адаптация под изменение размера окна
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
