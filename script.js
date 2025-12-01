import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.168.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.168.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.168.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'https://unpkg.com/three@0.168.0/examples/jsm/postprocessing/FilmPass.js';

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
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 25;

// Liquid Glass Prism - теперь икосаэдр для более гладкой поверхности
const size = Math.min(window.innerWidth, window.innerHeight) * 0.015; // Увеличен размер
const prism = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 3), // Более гладкая форма
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0,
        transmission: 0.97,
        thickness: 12,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.8,
        envMapIntensity: 20,
        specularIntensity: 1,
        sheen: 0.5,
        sheenRoughness: 0.3,
        sheenColor: 0xffaa88,
        iridescence: 1,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 400]
    })
);
prism.position.y = -1;
scene.add(prism);

// Создаем окружение для отражений
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([
    'https://threejs.org/examples/textures/cube/skybox/px.jpg',
    'https://threejs.org/examples/textures/cube/skybox/nx.jpg',
    'https://threejs.org/examples/textures/cube/skybox/py.jpg',
    'https://threejs.org/examples/textures/cube/skybox/ny.jpg',
    'https://threejs.org/examples/textures/cube/skybox/pz.jpg',
    'https://threejs.org/examples/textures/cube/skybox/nz.jpg'
]);
scene.environment = envMap;
scene.background = envMap;
prism.material.envMap = envMap;

// Освещение
scene.add(new THREE.AmbientLight(0x404080, 4));
const mainLight = new THREE.DirectionalLight(0xffffff, 25);
mainLight.position.set(-15, 20, 25);
scene.add(mainLight);

const fillLight = new THREE.HemisphereLight(0x4488ff, 0x002244, 3);
scene.add(fillLight);

// Радужные лучи с улучшениями
const colors = [0xff0000, 0xff6600, 0xffff00, 0x00ff00, 0x0088ff, 0x6600ff, 0xff00ff];
const rainbowLights = [];
colors.forEach((c, i) => {
    const light = new THREE.SpotLight(c, 15, 100, Math.PI/5, 0.3, 2);
    light.position.copy(prism.position);
    const angle = (i / colors.length) * Math.PI * 2;
    const radius = 8;
    light.position.x += Math.sin(angle) * radius;
    light.position.y += Math.cos(angle) * radius * 0.6;
    light.position.z += Math.cos(angle) * radius * 0.4;
    light.target.position.copy(prism.position);
    light.target.position.y -= 10;
    scene.add(light);
    scene.add(light.target);
    light.penumbra = 0.5;
    light.decay = 2;
    rainbowLights.push(light);
});

// Частицы вокруг призмы
const particleCount = 200;
const particles = new THREE.Group();
const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const particleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x88ffff,
    transparent: true,
    opacity: 0.6
});

for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    const radius = size + 1 + Math.random() * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
    particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
    particle.position.z = radius * Math.cos(phi);
    
    particle.userData = {
        radius: radius,
        speed: 0.001 + Math.random() * 0.003,
        angle: Math.random() * Math.PI * 2
    };
    
    particles.add(particle);
}
prism.add(particles);

// Постобработка
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, // strength
    0.4, // radius
    0.8  // threshold
);
composer.addPass(bloomPass);

const filmPass = new FilmPass(0.15, 0.5, 2048, false);
composer.addPass(filmPass);

// Анимация
const clock = new THREE.Clock();
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    time += delta;
    
    // Плавное вращение призмы
    prism.rotation.y += 0.004;
    prism.rotation.x += 0.0015;
    prism.rotation.z = Math.sin(time * 0.3) * 0.05;
    
    // Анимация иридесценции
    prism.material.iridescence = 0.8 + Math.sin(time * 0.5) * 0.2;
    
    // Анимация частиц
    particles.children.forEach(particle => {
        particle.userData.angle += particle.userData.speed;
        particle.position.x = particle.userData.radius * Math.sin(particle.userData.angle) * Math.cos(time);
        particle.position.y = particle.userData.radius * Math.sin(particle.userData.angle) * Math.sin(time);
        particle.position.z = particle.userData.radius * Math.cos(particle.userData.angle);
        
        // Пульсация частиц
        particle.scale.setScalar(0.8 + Math.sin(time * 2 + particle.userData.angle) * 0.3);
    });
    
    // Анимация радужных лучей
    rainbowLights.forEach((light, i) => {
        light.intensity = 12 + Math.sin(time * 2 + i) * 6;
        light.color.setHSL((time * 0.1 + i * 0.2) % 1, 1, 0.7);
    });
    
    composer.render();
}
animate();

// Интерактивность - вращение призмы при движении мыши
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Ресайз
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    const newSize = Math.min(window.innerWidth, window.innerHeight) * 0.015;
    prism.geometry.dispose();
    prism.geometry = new THREE.IcosahedronGeometry(newSize, 3);
});

// Пасхалка - улучшенная версия
let clicks = 0;
let timer = null;
const secretMessages = [
    "САУБОЛ КОТАК",
    "LIQUID GLASS",
    "ПРОСТРАНСТВО",
    "БЕСКОНЕЧНОСТЬ",
    "СВЕТ И ТЕНЬ"
];

canvas.addEventListener('click', (e) => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => clicks = 0, 3000);
    
    if (clicks >= 5) {
        clicks = 0;
        const messageIndex = Math.floor(Math.random() * secretMessages.length);
        
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            inset: 0;
            background: radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%);
            z-index: 9999;
            display: grid;
            place-items: center;
            backdrop-filter: blur(40px);
            animation: fadeIn 0.5s ease;
        `;
        
        div.innerHTML = `
            <div style="text-align: center;">
                <h2 style="
                    font-size: clamp(60px, 15vw, 180px);
                    background: linear-gradient(45deg, #00ffaa, #ff3366, #00ffff, #ffaa00);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: pulse 2s infinite;
                    margin-bottom: 30px;
                    filter: drop-shadow(0 0 30px currentColor);
                ">${secretMessages[messageIndex]}</h2>
                <p style="
                    color: rgba(255,255,255,0.7);
                    font-size: clamp(16px, 3vw, 24px);
                    animation: float 3s ease-in-out infinite;
                ">Нажмите чтобы закрыть</p>
            </div>
        `;
        
        div.onclick = () => {
            div.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => div.remove(), 500);
        };
        
        document.body.appendChild(div);
        
        // Добавляем звуковой эффект (опционально)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // Нота C
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {}
    }
});

// Партиклы при клике
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Создаем вспышку света
    const flash = new THREE.PointLight(0xffffff, 50, 10);
    flash.position.set(x * 15, y * 10, 5);
    scene.add(flash);
    
    setTimeout(() => {
        scene.remove(flash);
    }, 100);
});
