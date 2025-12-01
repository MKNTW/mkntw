// script.js — полный рабочий вариант 2025 года
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();

// Адаптивная камера
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 15; // теперь фиксированное, но идеальное расстояние

// Белый направленный свет (входящий в призму)
const whiteLight = new THREE.DirectionalLight(0xffffff, 8);
whiteLight.position.set(-10, 10, 10);
scene.add(whiteLight);
scene.add(new THREE.AmbientLight(0x404040, 2)); // мягкий фон

// Размеры призмы — теперь зависит от экрана красиво
function getPrismSize() {
    const base = Math.min(window.innerWidth, window.innerHeight);
    return base < 500 ? 2.5 : base < 900 ? 3.5 : 4.5;
}

// Основная призма (стекло с дисперсией)
const prism = new THREE.Mesh(
    new THREE.TetrahedronGeometry(getPrismSize(), 0),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.02,
        transmission: 0.98,
        thickness: 4,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.65,
        envMapIntensity: 10,
        reflectivity: 1
    })
);
prism.rotation.x = 0.4;
prism.rotation.y = 0.7;
scene.add(prism);

// 7 радужных лучей, вылетающих из призмы
const rainbowColors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x4400ff, 0xff00ff];
const beams = [];

rainbowColors.forEach((color, i) => {
    const intensity = 6 + Math.random() * 4;
    const beam = new THREE.SpotLight(color, intensity, 40, Math.PI / 8, 0.5);
    beam.position.copy(prism.position);
    
    // Каждый луч в свою сторону (имитация преломления)
    const angle = (i / rainbowColors.length) * Math.PI * 1.6 - Math.PI * 0.8;
    const distance = 3;
    beam.position.x += Math.cos(angle) * distance;
    beam.position.y += Math.sin(angle) * distance - 2;
    beam.position.z += Math.sin(angle * 0.7) * distance;

    beam.target.position.set(
        beam.position.x + Math.cos(angle) * 30,
        beam.position.y + Math.sin(angle) * 30 - 10,
        beam.position.z - 15
    );
    
    scene.add(beam);
    scene.add(beam.target);
    beams.push(beam);
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    
    prism.rotation.y += 0.004;
    prism.rotation.x += 0.0015;

    // Лёгкое дыхание лучей (как настоящая дисперсия)
    beams.forEach((beam, i) => {
        beam.intensity = 6 + Math.sin(Date.now() * 0.001 + i) * 3;
    });

    renderer.render(scene, camera);
}
animate();

// Адаптация под ресайз (без пересоздания призмы — теперь умнее)
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    // Просто масштабируем призму, а не пересоздаём
    const newSize = getPrismSize();
    prism.scale.setScalar(newSize / prism.geometry.parameters.radius);
});

// Пасхалка: 5 кликов по призме
let clickCount = 0;
let timeout;
renderer.domElement.addEventListener('click', () => {
    clickCount++;
    clearTimeout(timeout);
    timeout = setTimeout(() => clickCount = 0, 3000);

    if (clickCount >= 5) {
        clickCount = 0;
        const msg = document.createElement('div');
        msg.innerHTML = `<div style="position:fixed;inset:0;background:#000d;z-index:9999;display:grid;place-items:center;backdrop-filter:blur(20px);animation:fadeIn 1s">
            <div style="text-align:center">
                <h2 style="font-size:clamp(50px,15vw,140px);background:linear-gradient(45deg,#00ffaa,#ff3366,#00ffff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                    САУБОЛ КОТАК
                </h2>
                <p style="color:#fff;font-size:24px;margin-top:2rem">Ты — избранный</p>
            </div>
        </div>`;
        msg.onclick = () => msg.remove();
        document.body.appendChild(msg);
    }
});
