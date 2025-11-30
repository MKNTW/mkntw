const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

// Призма всегда в центре и адаптируется под размер экрана
const prismSize = Math.min(window.innerWidth, window.innerHeight) * 0.45;

const prism = new THREE.Mesh(
    new THREE.TetrahedronGeometry(prismSize / 100, 0),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 1.0,
        thickness: prismSize / 30,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.5,
        envMapIntensity: 20
    })
);
scene.add(prism);

// Три цветных луча
const lightPower = window.innerWidth < 768 ? 6 : 8;
scene.add(new THREE.PointLight(0x00ffaa, lightPower, 50)).position.set(-15, 0, 10);
scene.add(new THREE.PointLight(0xff3388, lightPower, 50)).position.set(15, 0, 10);
scene.add(new THREE.PointLight(0x4488ff, lightPower * 0.8, 50)).position.set(0, 12, 8);

// Камера чуть дальше на маленьких экранах
camera.position.z = window.innerWidth < 768 ? 10 : 8.5;

// Анимация
function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.003;
    prism.rotation.x += 0.001;
    renderer.render(scene, camera);
}
animate();

// Полная адаптация при изменении размера и ориентации
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    // Пересчитываем размер призмы при повороте телефона
    const newSize = Math.min(width, height) * 0.45;
    prism.scale.setScalar(newSize / prismSize);
});
