import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.168.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.168.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.168.0/examples/jsm/postprocessing/UnrealBloomPass.js';

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
camera.position.z = 30;
camera.position.y = 5;

// Размер призмы адаптивный для всех устройств
const getPrismSize = () => {
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    if (screenSize < 768) return screenSize * 0.02; // Мобильные
    if (screenSize < 1024) return screenSize * 0.015; // Планшеты
    return screenSize * 0.012; // Десктоп
};

// Liquid Glass Prism
const prismSize = getPrismSize();
const prism = new THREE.Mesh(
    new THREE.IcosahedronGeometry(prismSize, 3),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0,
        transmission: 0.98,
        thickness: 15,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 2.0,
        envMapIntensity: 25,
        specularIntensity: 1.5,
        sheen: 0.8,
        sheenRoughness: 0.2,
        sheenColor: 0xffccaa,
        iridescence: 1,
        iridescenceIOR: 1.5,
        iridescenceThicknessRange: [150, 500]
    })
);
prism.position.y = 0;
scene.add(prism);

// Создаем окружение для отражений
const cubeTextureLoader = new THREE.CubeTextureLoader();
cubeTextureLoader.setPath('https://threejs.org/examples/textures/cube/skybox/');
const envMap = cubeTextureLoader.load([
    'px.jpg', 'nx.jpg',
    'py.jpg', 'ny.jpg',
    'pz.jpg', 'nz.jpg'
]);
scene.environment = envMap;
scene.background = new THREE.Color(0x000000);
prism.material.envMap = envMap;

// Освещение - улучшенное
scene.add(new THREE.AmbientLight(0x4040a0, 5));
const mainLight = new THREE.DirectionalLight(0xffffff, 30);
mainLight.position.set(-20, 30, 30);
scene.add(mainLight);

const fillLight = new THREE.HemisphereLight(0x4488ff, 0x002244, 4);
scene.add(fillLight);

// Эффект звезды/солнца с лучами
const createSunEffect = () => {
    const sunGroup = new THREE.Group();
    
    // Центральное свечение
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);
    
    // Лучи солнца
    const rayCount = 16;
    const rayLength = 25;
    const rayGeometry = new THREE.ConeGeometry(0.5, rayLength, 4);
    const rayMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < rayCount; i++) {
        const ray = new THREE.Mesh(rayGeometry, rayMaterial);
        const angle = (i / rayCount) * Math.PI * 2;
        
        ray.rotation.z = angle;
        ray.rotation.x = Math.PI / 2;
        
        // Позиционируем лучи вокруг солнца
        ray.position.x = Math.sin(angle) * 6;
        ray.position.y = Math.cos(angle) * 6;
        
        sunGroup.add(ray);
    }
    
    sunGroup.position.set(0, 0, -50);
    return sunGroup;
};

const sun = createSunEffect();
scene.add(sun);

// Радужные лучи от призмы
const createRainbowLights = () => {
    const colors = [0xff0000, 0xff6600, 0xffff00, 0x00ff00, 0x0088ff, 0x6600ff, 0xff00ff];
    const lights = [];
    
    colors.forEach((c, i) => {
        const light = new THREE.SpotLight(c, 20, 120, Math.PI/4, 0.3, 1.5);
        const angle = (i / colors.length) * Math.PI * 2;
        const radius = 15;
        
        light.position.x = Math.sin(angle) * radius;
        light.position.y = Math.cos(angle) * radius * 0.8;
        light.position.z = 10;
        
        light.target.position.copy(prism.position);
        light.penumbra = 0.7;
        light.decay = 1.5;
        
        scene.add(light);
        scene.add(light.target);
        lights.push({ light, angle });
    });
    
    return lights;
};

const rainbowLights = createRainbowLights();

// Постобработка
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.6, // radius
    0.9  // threshold
);
composer.addPass(bloomPass);

// Анимация
const clock = new THREE.Clock();
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    time += delta;
    
    // Плавное вращение призмы
    prism.rotation.y += 0.003;
    prism.rotation.x += 0.001;
    prism.rotation.z = Math.sin(time * 0.2) * 0.03;
    
    // Пульсация призмы
    const pulse = 1 + Math.sin(time * 0.8) * 0.05;
    prism.scale.setScalar(pulse);
    
    // Анимация иридесценции
    prism.material.iridescence = 0.7 + Math.sin(time * 0.4) * 0.3;
    prism.material.sheenColor.setHSL((time * 0.1) % 1, 0.8, 0.7);
    
    // Анимация солнца
    sun.rotation.z += 0.001;
    const sunPulse = 1 + Math.sin(time * 0.5) * 0.1;
    sun.scale.setScalar(sunPulse);
    
    // Анимация лучей солнца
    sun.children.forEach((child, i) => {
        if (i > 0) { // Пропускаем центральную сферу
            child.scale.y = 1 + Math.sin(time * 2 + i) * 0.3;
            child.material.opacity = 0.4 + Math.sin(time * 1.5 + i) * 0.2;
        }
    });
    
    // Анимация радужных лучей
    rainbowLights.forEach((item, i) => {
        item.light.intensity = 15 + Math.sin(time * 2 + i) * 10;
        const hue = (time * 0.05 + i * 0.1) % 1;
        item.light.color.setHSL(hue, 1, 0.8);
    });
    
    composer.render();
}
animate();

// Адаптивный ресайз для всех устройств
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
    
    // Адаптивный размер призмы
    const newSize = getPrismSize();
    prism.geometry.dispose();
    prism.geometry = new THREE.IcosahedronGeometry(newSize, 3);
    
    // Адаптация позиции камеры для iPhone
    if (width < height && width < 768) {
        camera.position.z = 35;
        camera.position.y = 3;
    } else {
        camera.position.z = 30;
        camera.position.y = 5;
    }
});

// Улучшенная пасхалка
let clicks = 0;
let timer = null;
const secretMessages = [
    "СТАНЬ СВЕТОМ",
    "ВНУТРИ РАДУГИ",
    "БЕСКОНЕЧНОСТЬ",
    "ЗЕРКАЛО ДУШИ",
    "ПРОЗРАЧНОСТЬ"
];

// Создаем стили для пасхалки
const easterEggStyle = document.createElement('style');
easterEggStyle.textContent = `
    @keyframes easterFadeIn {
        0% { opacity: 0; transform: scale(0.8) translateY(20px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    @keyframes easterFadeOut {
        0% { opacity: 1; transform: scale(1) translateY(0); }
        100% { opacity: 0; transform: scale(0.8) translateY(20px); }
    }
    
    @keyframes textShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
    }
`;
document.head.appendChild(easterEggStyle);

canvas.addEventListener('click', (e) => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => clicks = 0, 3000);
    
    if (clicks >= 5) {
        clicks = 0;
        const messageIndex = Math.floor(Math.random() * secretMessages.length);
        
        // Создаем оверлей
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,10,30,0.98) 100%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(30px);
            animation: easterFadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        `;
        
        // Основной текст
        const message = document.createElement('div');
        message.style.cssText = `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: 900;
            text-align: center;
            line-height: 1;
            letter-spacing: -0.02em;
            max-width: 90vw;
            padding: 40px 20px;
            margin-bottom: 40px;
        `;
        
        // Адаптивный размер текста для всех устройств
        if (window.innerWidth < 768) {
            message.style.fontSize = 'clamp(48px, 15vw, 80px)';
        } else if (window.innerWidth < 1024) {
            message.style.fontSize = 'clamp(60px, 10vw, 100px)';
        } else {
            message.style.fontSize = 'clamp(80px, 8vw, 140px)';
        }
        
        // Градиент как на главной
        message.style.background = `
            linear-gradient(
                90deg,
                #ff3366,
                #ff6600,
                #ffff00,
                #00ff00,
                #00ffff,
                #0088ff,
                #6600ff,
                #ff00ff,
                #ff3366
            )
        `;
        message.style.backgroundSize = '400% 400%';
        message.style.webkitBackgroundClip = 'text';
        message.style.webkitTextFillColor = 'transparent';
        message.style.backgroundClip = 'text';
        message.style.animation = 'textShimmer 8s linear infinite';
        message.textContent = secretMessages[messageIndex];
        
        // Субтитры
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            color: rgba(255,255,255,0.6);
            font-size: clamp(14px, 2.5vw, 18px);
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: 500;
            margin-top: 30px;
            text-align: center;
            animation: fadeInOut 3s ease-in-out infinite;
        `;
        subtitle.textContent = 'Нажмите в любом месте чтобы закрыть';
        
        // Анимация для субтитров
        const subtitleStyle = document.createElement('style');
        subtitleStyle.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.8; }
            }
        `;
        document.head.appendChild(subtitleStyle);
        
        // Добавляем элементы
        overlay.appendChild(message);
        overlay.appendChild(subtitle);
        document.body.appendChild(overlay);
        
        // Закрытие по клику
        const closeEasterEgg = () => {
            overlay.style.animation = 'easterFadeOut 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards';
            setTimeout(() => {
                overlay.remove();
                subtitleStyle.remove();
            }, 600);
        };
        
        overlay.onclick = closeEasterEgg;
        
        // Автозакрытие через 8 секунд
        setTimeout(closeEasterEgg, 8000);
        
        // Звуковой эффект
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.7);
        } catch (e) {}
    }
});

// Инициализация для iPhone
if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream) {
    // Дополнительные оптимизации для iOS
    camera.position.z = 40;
    camera.position.y = 2;
    
    // Уменьшаем качество для повышения производительности
    renderer.setPixelRatio(1);
    prism.geometry = new THREE.IcosahedronGeometry(prismSize, 2);
}
