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
renderer.toneMappingExposure = 1.5;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 40;
camera.position.y = 8;

// Адаптивный размер призмы
const getPrismSize = () => {
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    if (screenSize < 768) return screenSize * 0.025; // iPhone
    if (screenSize < 1024) return screenSize * 0.02; // iPad
    return screenSize * 0.015; // Desktop
};

// Liquid Glass Prism
const prismSize = getPrismSize();
const prism = new THREE.Mesh(
    new THREE.IcosahedronGeometry(prismSize, 3),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 0.99,
        thickness: 20,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 2.2,
        envMapIntensity: 30,
        specularIntensity: 2,
        sheen: 1,
        sheenRoughness: 0.1,
        sheenColor: 0xffdd88,
        iridescence: 1.5,
        iridescenceIOR: 1.8,
        iridescenceThicknessRange: [200, 800]
    })
);
prism.position.y = 0;
prism.position.z = 10;
scene.add(prism);

// Окружение для отражений
const cubeTextureLoader = new THREE.CubeTextureLoader();
cubeTextureLoader.setPath('https://threejs.org/examples/textures/cube/skybox/');
const envMap = cubeTextureLoader.load([
    'px.jpg', 'nx.jpg',
    'py.jpg', 'ny.jpg',
    'pz.jpg', 'nz.jpg'
]);
scene.environment = envMap;
scene.background = new THREE.Color(0x000011);
prism.material.envMap = envMap;

// Освещение
scene.add(new THREE.AmbientLight(0x4040c0, 3));

const mainLight = new THREE.DirectionalLight(0xffaa88, 25);
mainLight.position.set(-25, 40, 30);
scene.add(mainLight);

const backLight = new THREE.DirectionalLight(0x4488ff, 15);
backLight.position.set(20, 10, -30);
scene.add(backLight);

// Создаём реалистичное солнце с пиксельным стилем
const createRealisticSun = () => {
    const sunGroup = new THREE.Group();
    
    // Ядро солнца - пиксельный стиль (низкополигональная сфера)
    const coreGeometry = new THREE.IcosahedronGeometry(12, 1); // Малое количество полигонов для пиксельного вида
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        emissive: 0xff5500,
        emissiveIntensity: 2
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    sunGroup.add(core);
    
    // Фотосфера - внешний слой солнца
    const photosphereGeometry = new THREE.SphereGeometry(13, 32, 32);
    const photosphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            noiseTexture: { 
                value: createNoiseTexture(512, 512) 
            }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform sampler2D noiseTexture;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
                vec2 uv = vUv;
                float noise = texture2D(noiseTexture, uv + vec2(time * 0.1, 0.0)).r;
                float noise2 = texture2D(noiseTexture, uv * 2.0 - vec2(time * 0.05, 0.0)).r;
                
                // Основной цвет солнца
                vec3 color1 = vec3(1.0, 0.4, 0.1); // Оранжевый
                vec3 color2 = vec3(1.0, 0.8, 0.2); // Жёлтый
                vec3 color3 = vec3(1.0, 0.1, 0.05); // Красный
                
                // Грануляция поверхности солнца
                float granulation = noise * 0.3 + noise2 * 0.2;
                
                // Пятна на солнце
                float spots = step(0.7, noise) * 0.3;
                
                // Смешиваем цвета
                vec3 finalColor = mix(color1, color2, granulation);
                finalColor = mix(finalColor, color3, spots);
                
                // Эффект пикселизации
                float pixelSize = 8.0;
                vec2 pixelUV = floor(uv * pixelSize) / pixelSize;
                float pixelNoise = texture2D(noiseTexture, pixelUV).r;
                finalColor *= 0.9 + pixelNoise * 0.2;
                
                // Яркость к центру
                float centerBright = 1.0 - length(uv - 0.5);
                finalColor *= 1.0 + centerBright * 2.0;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        transparent: false,
        side: THREE.BackSide
    });
    
    const photosphere = new THREE.Mesh(photosphereGeometry, photosphereMaterial);
    sunGroup.add(photosphere);
    
    // Корона солнца (внешняя атмосфера)
    const coronaGeometry = new THREE.SphereGeometry(20, 32, 32);
    const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sunGroup.add(corona);
    
    // Солнечные вспышки (протуберанцы)
    const createSolarFlare = () => {
        const flareGroup = new THREE.Group();
        
        // Основа вспышки
        const flareGeometry = new THREE.ConeGeometry(0.5, 8 + Math.random() * 12, 4);
        const flareMaterial = new THREE.MeshBasicMaterial({
            color: 0xff2200,
            transparent: true,
            opacity: 0.8
        });
        
        const flare = new THREE.Mesh(flareGeometry, flareMaterial);
        flare.rotation.x = Math.PI / 2;
        
        // Случайная позиция на поверхности солнца
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        flare.position.x = 14 * Math.sin(phi) * Math.cos(theta);
        flare.position.y = 14 * Math.sin(phi) * Math.sin(theta);
        flare.position.z = 14 * Math.cos(phi);
        
        // Направляем от солнца
        flare.lookAt(0, 0, 0);
        flare.rotateX(Math.PI / 2);
        
        flareGroup.add(flare);
        flareGroup.userData = {
            life: 1 + Math.random() * 2,
            maxLife: 1 + Math.random() * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02
        };
        
        return flareGroup;
    };
    
    // Массив вспышек
    const flares = [];
    for (let i = 0; i < 8; i++) {
        const flare = createSolarFlare();
        sunGroup.add(flare);
        flares.push(flare);
    }
    
    // Солнечные выбросы (корональные выбросы массы)
    const createCoronalMassEjection = () => {
        const cmeGroup = new THREE.Group();
        
        const cmeGeometry = new THREE.SphereGeometry(1, 8, 8);
        const cmeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.6
        });
        
        const cme = new THREE.Mesh(cmeGeometry, cmeMaterial);
        
        // Начальная позиция
        const angle = Math.random() * Math.PI * 2;
        cme.position.x = Math.cos(angle) * 15;
        cme.position.y = Math.sin(angle) * 15;
        
        cmeGroup.add(cme);
        cmeGroup.userData = {
            speed: 0.3 + Math.random() * 0.5,
            angle: angle,
            distance: 15,
            life: 0
        };
        
        return cmeGroup;
    };
    
    // Массив корональных выбросов
    const cmeArray = [];
    for (let i = 0; i < 4; i++) {
        const cme = createCoronalMassEjection();
        sunGroup.add(cme);
        cmeArray.push(cme);
    }
    
    // Кометы (быстрые частицы)
    const createComet = () => {
        const cometGroup = new THREE.Group();
        
        const cometGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const cometMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.8
        });
        
        const comet = new THREE.Mesh(cometGeometry, cometMaterial);
        
        // Хвост кометы
        const tailGeometry = new THREE.ConeGeometry(0.2, 3, 4);
        const tailMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4
        });
        
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.z = -1.5;
        tail.rotation.x = Math.PI;
        
        cometGroup.add(comet);
        cometGroup.add(tail);
        
        // Начальная позиция далеко от солнца
        cometGroup.position.set(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100 - 50
        );
        
        cometGroup.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                Math.random() * 3 + 1
            ),
            life: 0,
            maxLife: 5 + Math.random() * 5
        };
        
        return cometGroup;
    };
    
    // Массив комет
    const comets = [];
    for (let i = 0; i < 6; i++) {
        const comet = createComet();
        scene.add(comet);
        comets.push(comet);
    }
    
    sunGroup.position.set(0, 0, -80);
    sunGroup.userData = {
        flares: flares,
        cmeArray: cmeArray,
        comets: comets,
        photosphere: photosphere
    };
    
    return sunGroup;
};

// Создаём текстуру шума для поверхности солнца
function createNoiseTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random();
        data[i] = noise * 255;     // R
        data[i + 1] = noise * 255; // G
        data[i + 2] = noise * 255; // B
        data[i + 3] = 255;         // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

const sun = createRealisticSun();
scene.add(sun);

// Радужные лучи от призмы
const createRainbowLights = () => {
    const colors = [0xff0055, 0xff5500, 0xffff00, 0x00ff80, 0x00ffff, 0x0088ff, 0x8800ff, 0xff00ff];
    const lights = [];
    
    colors.forEach((c, i) => {
        const light = new THREE.SpotLight(c, 25, 150, Math.PI/3, 0.2, 1);
        const angle = (i / colors.length) * Math.PI * 2;
        const radius = 20;
        
        light.position.x = Math.sin(angle) * radius;
        light.position.y = Math.cos(angle) * radius * 0.7;
        light.position.z = 5;
        
        light.target.position.copy(prism.position);
        light.penumbra = 0.8;
        light.decay = 1.2;
        
        scene.add(light);
        scene.add(light.target);
        lights.push({ light, angle });
    });
    
    return lights;
};

const rainbowLights = createRainbowLights();

// Постобработка с сильным bloom эффектом для солнца
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.0, // strength - увеличен для солнца
    0.8, // radius
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
    
    // Вращение призмы
    prism.rotation.y += 0.002;
    prism.rotation.x += 0.001;
    
    // Пульсация призмы
    prism.scale.setScalar(1 + Math.sin(time * 0.5) * 0.03);
    
    // Анимация иридесценции
    prism.material.iridescence = 0.8 + Math.sin(time * 0.3) * 0.4;
    prism.material.sheenColor.setHSL((time * 0.08) % 1, 0.9, 0.6);
    
    // Анимация солнца
    if (sun.userData.photosphere.material.uniforms) {
        sun.userData.photosphere.material.uniforms.time.value = time;
    }
    
    sun.rotation.y += 0.001;
    sun.rotation.x += 0.0005;
    
    // Пульсация ядра солнца
    const pulse = 1 + Math.sin(time * 0.3) * 0.05;
    sun.scale.setScalar(pulse);
    
    // Анимация солнечных вспышек
    sun.userData.flares.forEach((flare, i) => {
        flare.userData.life -= delta;
        
        if (flare.userData.life <= 0) {
            // Пересоздаём вспышку
            sun.remove(flare);
            const newFlare = createSolarFlare();
            sun.add(newFlare);
            sun.userData.flares[i] = newFlare;
        } else {
            // Анимация существующей вспышки
            flare.rotation.z += flare.userData.rotationSpeed;
            const scale = flare.userData.life / flare.userData.maxLife;
            flare.scale.setScalar(scale);
            flare.children[0].material.opacity = scale * 0.8;
        }
    });
    
    // Анимация корональных выбросов
    sun.userData.cmeArray.forEach((cme, i) => {
        cme.userData.life += delta;
        cme.userData.distance += cme.userData.speed * delta;
        
        cme.position.x = Math.cos(cme.userData.angle + cme.userData.life * 0.1) * cme.userData.distance;
        cme.position.y = Math.sin(cme.userData.angle + cme.userData.life * 0.1) * cme.userData.distance;
        
        cme.scale.setScalar(1 + cme.userData.life * 0.1);
        cme.children[0].material.opacity = 0.6 - cme.userData.life * 0.05;
        
        if (cme.userData.distance > 60 || cme.children[0].material.opacity <= 0) {
            // Пересоздаём выброс
            sun.remove(cme);
            const newCME = createCoronalMassEjection();
            sun.add(newCME);
            sun.userData.cmeArray[i] = newCME;
        }
    });
    
    // Анимация комет
    sun.userData.comets.forEach((comet, i) => {
        comet.userData.life += delta;
        
        // Двигаем комету
        comet.position.x += comet.userData.velocity.x * delta;
        comet.position.y += comet.userData.velocity.y * delta;
        comet.position.z += comet.userData.velocity.z * delta;
        
        // Поворачиваем хвост против движения
        const tail = comet.children[1];
        tail.lookAt(
            comet.position.x - comet.userData.velocity.x,
            comet.position.y - comet.userData.velocity.y,
            comet.position.z - comet.userData.velocity.z
        );
        
        // Уменьшаем непрозрачность со временем
        const lifeRatio = 1 - (comet.userData.life / comet.userData.maxLife);
        comet.children[0].material.opacity = lifeRatio * 0.8;
        tail.material.opacity = lifeRatio * 0.4;
        
        if (comet.userData.life > comet.userData.maxLife) {
            // Пересоздаём комету
            scene.remove(comet);
            const newComet = createComet();
            scene.add(newComet);
            sun.userData.comets[i] = newComet;
        }
    });
    
    // Анимация радужных лучей
    rainbowLights.forEach((item, i) => {
        item.light.intensity = 20 + Math.sin(time * 1.5 + i) * 15;
        const hue = (time * 0.03 + i * 0.125) % 1;
        item.light.color.setHSL(hue, 1, 0.7);
    });
    
    composer.render();
}
animate();

// Адаптивный ресайз
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
    
    // Оптимизация для iPhone
    if (width < 768 && height > width) {
        camera.position.z = 45;
        camera.position.y = 5;
        prism.position.z = 12;
    } else if (width < 768) {
        camera.position.z = 35;
        camera.position.y = 3;
        prism.position.z = 8;
    } else {
        camera.position.z = 40;
        camera.position.y = 8;
        prism.position.z = 10;
    }
});

// Улучшенная пасхалка с плавными анимациями
let clicks = 0;
let timer = null;
const secretMessages = [
    "ПРОЗРАЧНОСТЬ",
    "СВЕТ И ТЕНЬ",
    "БЕСКОНЕЧНОСТЬ",
    "ВНУТРИ РАДУГИ",
    "ЗЕРКАЛО ДУШИ"
];

canvas.addEventListener('click', (e) => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => clicks = 0, 3000);
    
    if (clips >= 5) {
        clicks = 0;
        const messageIndex = Math.floor(Math.random() * secretMessages.length);
        
        // Создаём оверлей
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: linear-gradient(135deg, 
                rgba(0, 0, 0, 0.95) 0%, 
                rgba(10, 5, 20, 0.98) 50%, 
                rgba(20, 10, 40, 0.95) 100%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(40px);
            opacity: 0;
            transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
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
            padding: 40px 30px;
            margin-bottom: 30px;
            text-transform: uppercase;
            opacity: 0;
            transform: translateY(30px) scale(0.95);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
        `;
        
        // Адаптивный размер текста
        if (window.innerWidth < 768) {
            message.style.fontSize = 'clamp(44px, 14vw, 75px)';
            message.style.padding = '30px 20px';
        } else if (window.innerWidth < 1024) {
            message.style.fontSize = 'clamp(55px, 11vw, 90px)';
        } else {
            message.style.fontSize = 'clamp(70px, 9vw, 130px)';
        }
        
        // Градиент как на главной
        message.style.background = `
            linear-gradient(
                90deg,
                #ff0055,
                #ff5500,
                #ffff00,
                #00ff80,
                #00ffff,
                #0088ff,
                #8800ff,
                #ff00ff,
                #ff0055
            )
        `;
        message.style.backgroundSize = '400% 400%';
        message.style.webkitBackgroundClip = 'text';
        message.style.webkitTextFillColor = 'transparent';
        message.style.backgroundClip = 'text';
        message.style.animation = 'waveGradient 6s ease infinite';
        message.textContent = secretMessages[messageIndex];
        
        // Субтитры
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            color: rgba(255, 255, 255, 0.6);
            font-size: clamp(13px, 2.5vw, 16px);
            letter-spacing: 3px;
            text-transform: uppercase;
            font-weight: 400;
            text-align: center;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s;
        `;
        subtitle.textContent = 'Нажмите в любом месте чтобы закрыть';
        
        // Добавляем элементы
        overlay.appendChild(message);
        overlay.appendChild(subtitle);
        document.body.appendChild(overlay);
        
        // Запускаем анимацию появления
        setTimeout(() => {
            overlay.style.opacity = '1';
            setTimeout(() => {
                message.style.opacity = '1';
                message.style.transform = 'translateY(0) scale(1)';
                subtitle.style.opacity = '1';
                subtitle.style.transform = 'translateY(0)';
            }, 100);
        }, 50);
        
        // Закрытие по клику
        const closeEasterEgg = () => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(20px) scale(0.95)';
            subtitle.style.opacity = '0';
            subtitle.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                }, 800);
            }, 300);
        };
        
        overlay.onclick = closeEasterEgg;
        
        // Автозакрытие через 7 секунд
        setTimeout(closeEasterEgg, 7000);
        
        // Звуковой эффект
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(330, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.6);
        } catch (e) {}
    }
});

// Оптимизация для iOS
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    renderer.setPixelRatio(1);
    
    // Упрощаем геометрию для лучшей производительности
    prism.geometry = new THREE.IcosahedronGeometry(prismSize, 2);
    
    // Уменьшаем количество лучей
    rainbowLights.forEach((item, i) => {
        if (i > 3) {
            item.light.visible = false;
        }
    });
}
