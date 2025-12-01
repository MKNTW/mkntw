// script.js — ГАРАНТИРОВАННО работает на iPhone 15 Pro Max + всех остальных
const canvas = document.getElementById('canvas');

// КЛЮЧЕВЫЕ строки именно для iOS 17/18 Safari
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",   // ← обязательно для iPhone
    failIfMajorPerformanceCaveat: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);  // прозрачный фон

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 18;  // теперь точно видно на всех iPhone

// Размер призмы — адаптивный и гарантированно в кадре
function getPrismRadius() {
    const min = Math.min(window.innerWidth, window.innerHeight);
    if (min < 500) return 2.8;
    if (min < 900) return 3.8;
    return 5;
}

const prism = new THREE.Mesh(
    new THREE.TetrahedronGeometry(getPrismRadius(), 0),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 1.0,
        thickness: 5,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.6,
        envMapIntensity: 15
    })
);
prism.position.set(0, -1, 0);  // чуть ниже центра — идеально под текст
prism.rotation.x = 0.5;
prism.rotation.y = 0.8;
scene.add(prism);

// Белый свет спереди-сверху
const whiteLight = new THREE.DirectionalLight(0xffffff, 10);
whiteLight.position.set(-8, 12, 15);
scene.add(whiteLight);
scene.add(new THREE.AmbientLight(0x404040, 3));

// Радужные лучи из призмы (7 штук)
const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x6600ff, 0xff00ff];
colors.forEach((col, i) => {
    const light = new THREE.SpotLight(col, 8, 50, Math.PI/6, 0.6);
    light.position.copy(prism.position);
    const angle = (i / colors.length) * Math.PI * 1.8 - Math.PI * 0.9;
    light.position.x += Math.cos(angle) * 4;
    light.position.y += Math.sin(angle) * 3 - 3;
    light.target.position.x = light.position.x + Math.cos(angle) * 30;
    light.target.position.y = light.position.y - 20;
    scene.add(light);
    scene.add(light.target);
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    prism.rotation.y += 0.005;
    prism.rotation.x += 0.002;
    renderer.render(scene, camera);
}
animate();

// Ресайз без глюков
window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    
    const newRadius = getPrismRadius();
    prism.geometry.dispose();
    prism.geometry = new THREE.TetrahedronGeometry(newRadius, 0);
});

// Пасхалка 5 кликов (остаётся)
let clicks = 0, t;
renderer.domElement.addEventListener('click', () => {
    clicks++; clearTimeout(t);
    t = setTimeout(() => clicks = 0, 3000);
    if (clicks >= 5) {
        clicks = 0;
        const div = document.createElement('div');
        div.innerHTML = `<div style="position:fixed;inset:0;background:#000c;z-index:9999;display:grid;place-items:center;backdrop-filter:blur(20px)">
            <h2 style="font-size:clamp(50px,15vw,140px);background:linear-gradient(45deg,#00ffaa,#ff3366);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                САУБОЛ КОТАК БРАТИШКА
            </h2>
        </div>`;
        div.onclick = () => div.remove();
        document.body.appendChild(div);
    }
});
