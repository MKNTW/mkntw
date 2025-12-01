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
camera.position.y = 5;

// Адаптивный размер призмы
const getPrismSize = () => {
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    if (screenSize < 768) return screenSize * 0.03; // iPhone
    if (screenSize < 1024) return screenSize * 0.025; // iPad
    return screenSize * 0.02; // Desktop
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
        thickness: 25,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 2.4,
        envMapIntensity: 35,
        specularIntensity: 3,
        sheen: 1.2,
        sheenRoughness: 0.05,
        sheenColor: 0xffcc88,
        iridescence: 1.8,
        iridescenceIOR: 2.0,
        iridescenceThicknessRange: [300, 1000]
    })
);
prism.position.y = 0;
prism.position.z = 15;
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
scene.add(new THREE.AmbientLight(0x4040c0, 2));

const mainLight = new THREE.DirectionalLight(0xffaa88, 30);
mainLight.position.set(-30, 50, 40);
scene.add(mainLight);

const backLight = new THREE.DirectionalLight(0x4488ff, 20);
backLight.position.set(25, 15, -40);
scene.add(backLight);

// Система частиц для солнечных вспышек и выбросов
class SolarSystem {
    constructor() {
        this.particles = [];
        this.flares = [];
        this.cmeParticles = [];
        this.solarWind = [];
        this.explosions = [];
        this.sunGroup = new THREE.Group();
        
        this.initSun();
        this.initParticleSystems();
    }
    
    initSun() {
        // Ядро солнца - сфера с шейдером для реалистичной поверхности
        const coreGeometry = new THREE.SphereGeometry(14, 64, 64);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            emissive: 0xff5500,
            emissiveIntensity: 3,
            transparent: true,
            opacity: 0.9
        });
        this.core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.sunGroup.add(this.core);
        
        // Фотосфера с турбулентным шейдером
        const photosphereGeometry = new THREE.SphereGeometry(15, 128, 128);
        const photosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                turbulence: { value: 1.0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                void main() {
                    vPosition = position;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float turbulence;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i + vec2(0.0,0.0)), 
                                   hash(i + vec2(1.0,0.0)), u.x),
                               mix(hash(i + vec2(0.0,1.0)), 
                                   hash(i + vec2(1.0,1.0)), u.x), u.y);
                }
                
                void main() {
                    vec2 uv = vec2(atan(vPosition.x, vPosition.z) / 3.1416, asin(vPosition.y / 15.0) / 1.5708);
                    
                    // Слои шума для грануляции
                    float n1 = noise(uv * 10.0 + time * 0.5);
                    float n2 = noise(uv * 20.0 - time * 0.3);
                    float n3 = noise(uv * 40.0 + time * 0.7);
                    
                    // Солнечные пятна
                    float spots = smoothstep(0.7, 0.9, n1) * 0.3;
                    
                    // Цвета солнечной поверхности
                    vec3 color1 = vec3(1.0, 0.3, 0.1); // Темно-красный
                    vec3 color2 = vec3(1.0, 0.5, 0.2); // Оранжевый
                    vec3 color3 = vec3(1.0, 0.8, 0.4); // Светло-оранжевый
                    vec3 color4 = vec3(1.0, 1.0, 0.6); // Желтый
                    
                    // Грануляция
                    float granulation = n1 * 0.3 + n2 * 0.2 + n3 * 0.1;
                    
                    // Создаем турбулентную поверхность
                    vec3 finalColor = mix(color1, color2, granulation * 0.5);
                    finalColor = mix(finalColor, color3, granulation * 0.3);
                    finalColor = mix(finalColor, color4, granulation * 0.1);
                    
                    // Добавляем пятна
                    finalColor *= 1.0 - spots;
                    
                    // Яркость к центру
                    float brightness = 1.0 - length(vPosition) / 15.0;
                    finalColor *= 1.0 + brightness * 2.0;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            transparent: false,
            side: THREE.FrontSide
        });
        
        this.photosphere = new THREE.Mesh(photosphereGeometry, photosphereMaterial);
        this.sunGroup.add(this.photosphere);
        
        // Корона солнца
        const coronaGeometry = new THREE.SphereGeometry(25, 64, 64);
        const coronaMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.sunGroup.add(this.corona);
        
        this.sunGroup.position.set(0, 0, -100);
    }
    
    initParticleSystems() {
        // Создаём геометрию и материал для солнечных частиц
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0xff8800,
            size: 2,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Создаём массив частиц
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const lifetimes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Начальная позиция на поверхности солнца
            const radius = 15 + Math.random() * 5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = Math.sin(phi) * Math.cos(theta) * radius;
            positions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
            positions[i3 + 2] = Math.cos(phi) * radius;
            
            // Случайная начальная скорость
            velocities[i3] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
            
            sizes[i] = Math.random() * 3 + 1;
            lifetimes[i] = Math.random() * 10;
        }
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        this.particleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        
        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.sunGroup.add(this.particleSystem);
    }
    
    createSolarFlare() {
        const flareGroup = new THREE.Group();
        
        // Основа вспышки - конус
        const flareLength = 20 + Math.random() * 30;
        const flareGeometry = new THREE.ConeGeometry(1, flareLength, 8);
        const flareMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 1, 0.7),
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        
        const flare = new THREE.Mesh(flareGeometry, flareMaterial);
        
        // Позиция на поверхности солнца
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        flare.position.x = 15 * Math.sin(phi) * Math.cos(theta);
        flare.position.y = 15 * Math.sin(phi) * Math.sin(theta);
        flare.position.z = 15 * Math.cos(phi);
        
        // Направляем от солнца
        flare.lookAt(0, 0, 0);
        flare.rotateX(Math.PI / 2);
        
        flareGroup.add(flare);
        
        // Анимационные свойства
        flareGroup.userData = {
            life: 0,
            maxLife: 2 + Math.random() * 3,
            growth: 1 + Math.random() * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            startPosition: flare.position.clone(),
            direction: new THREE.Vector3().copy(flare.position).normalize()
        };
        
        this.flares.push(flareGroup);
        this.sunGroup.add(flareGroup);
        
        // Создаём взрыв частиц
        this.createExplosion(flare.position, 5 + Math.random() * 10);
    }
    
    createExplosion(position, intensity = 10) {
        const explosionGroup = new THREE.Group();
        const particleCount = Math.floor(intensity * 20);
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.7, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.2, 1, 0.6),
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Случайное направление с небольшим смещением от центра
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();
            
            particle.userData = {
                velocity: direction.multiplyScalar(2 + Math.random() * 3),
                life: 0,
                maxLife: 1 + Math.random() * 2,
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1
                )
            };
            
            explosionGroup.add(particle);
        }
        
        this.explosions.push(explosionGroup);
        this.sunGroup.add(explosionGroup);
    }
    
    createCME() {
        const cmeGroup = new THREE.Group();
        const cmeCount = 10 + Math.floor(Math.random() * 20);
        
        // Позиция выброса
        const angle = Math.random() * Math.PI * 2;
        const basePos = new THREE.Vector3(
            Math.cos(angle) * 16,
            Math.sin(angle) * 16,
            (Math.random() - 0.5) * 10
        );
        
        for (let i = 0; i < cmeCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.5 + Math.random() * 1, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.15 + 0.05, 1, 0.7),
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(basePos);
            
            // Немного разбросаем частицы
            particle.position.x += (Math.random() - 0.5) * 3;
            particle.position.y += (Math.random() - 0.5) * 3;
            particle.position.z += (Math.random() - 0.5) * 3;
            
            // Направление от солнца
            const direction = new THREE.Vector3().copy(basePos).normalize();
            
            particle.userData = {
                velocity: direction.multiplyScalar(3 + Math.random() * 4),
                life: 0,
                maxLife: 5 + Math.random() * 5,
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05
                ),
                orbitRadius: 15 + Math.random() * 5,
                orbitAngle: Math.random() * Math.PI * 2
            };
            
            cmeGroup.add(particle);
        }
        
        this.cmeParticles.push(cmeGroup);
        this.sunGroup.add(cmeGroup);
    }
    
    createSolarWind() {
        const windGroup = new THREE.Group();
        const windCount = 30 + Math.floor(Math.random() * 50);
        
        for (let i = 0; i < windCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.3, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 1, 0.8),
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Позиция на поверхности солнца
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const radius = 15;
            
            particle.position.x = Math.sin(phi) * Math.cos(theta) * radius;
            particle.position.y = Math.sin(phi) * Math.sin(theta) * radius;
            particle.position.z = Math.cos(phi) * radius;
            
            // Направление от солнца с небольшим случайным отклонением
            const direction = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * 0.3,
                Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 0.3,
                Math.cos(phi) + (Math.random() - 0.5) * 0.3
            ).normalize();
            
            particle.userData = {
                velocity: direction.multiplyScalar(5 + Math.random() * 10),
                life: 0,
                maxLife: 3 + Math.random() * 4,
                startPosition: particle.position.clone()
            };
            
            windGroup.add(particle);
        }
        
        this.solarWind.push(windGroup);
        this.sunGroup.add(windGroup);
    }
    
    update(delta, time) {
        // Обновляем шейдер солнца
        if (this.photosphere.material.uniforms) {
            this.photosphere.material.uniforms.time.value = time;
            this.photosphere.material.uniforms.turbulence.value = 1.0 + Math.sin(time * 0.5) * 0.3;
        }
        
        // Вращение солнца
        this.sunGroup.rotation.y += 0.001;
        this.sunGroup.rotation.x += 0.0003;
        
        // Пульсация солнца
        const pulse = 1 + Math.sin(time * 0.2) * 0.02;
        this.core.scale.setScalar(pulse);
        this.photosphere.scale.setScalar(pulse);
        
        // Обновляем частицы солнечной короны
        const positions = this.particleGeometry.attributes.position.array;
        const velocities = this.particleGeometry.attributes.velocity.array;
        const sizes = this.particleGeometry.attributes.size.array;
        const lifetimes = this.particleGeometry.attributes.lifetime.array;
        
        for (let i = 0; i < positions.length / 3; i++) {
            const i3 = i * 3;
            
            // Обновляем позицию
            positions[i3] += velocities[i3] * delta * 10;
            positions[i3 + 1] += velocities[i3 + 1] * delta * 10;
            positions[i3 + 2] += velocities[i3 + 2] * delta * 10;
            
            // Обновляем время жизни
            lifetimes[i] += delta;
            
            // Если частица далеко от солнца, возвращаем её
            const distance = Math.sqrt(
                positions[i3] * positions[i3] + 
                positions[i3 + 1] * positions[i3 + 1] + 
                positions[i3 + 2] * positions[i3 + 2]
            );
            
            if (distance > 30 || lifetimes[i] > 10) {
                // Возвращаем частицу на поверхность солнца
                const radius = 15 + Math.random() * 5;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                positions[i3] = Math.sin(phi) * Math.cos(theta) * radius;
                positions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
                positions[i3 + 2] = Math.cos(phi) * radius;
                
                // Случайная новая скорость
                velocities[i3] = (Math.random() - 0.5) * 0.5;
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
                velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
                
                lifetimes[i] = 0;
                sizes[i] = Math.random() * 3 + 1;
            }
        }
        
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
        this.particleGeometry.attributes.lifetime.needsUpdate = true;
        
        // Обновляем вспышки
        for (let i = this.flares.length - 1; i >= 0; i--) {
            const flare = this.flares[i];
            flare.userData.life += delta;
            
            if (flare.userData.life > flare.userData.maxLife) {
                // Удаляем старую вспышку
                this.sunGroup.remove(flare);
                this.flares.splice(i, 1);
                
                // Создаём новую с вероятностью
                if (Math.random() < 0.3) {
                    setTimeout(() => this.createSolarFlare(), Math.random() * 1000);
                }
            } else {
                // Анимируем вспышку
                const lifeRatio = flare.userData.life / flare.userData.maxLife;
                const flareMesh = flare.children[0];
                
                // Рост вспышки
                flareMesh.scale.y = 1 + lifeRatio * flare.userData.growth;
                flareMesh.scale.x = 1 + lifeRatio * flare.userData.growth * 0.5;
                
                // Изменение прозрачности
                flareMesh.material.opacity = 0.9 * (1 - lifeRatio);
                
                // Вращение
                flare.rotation.z += flare.userData.rotationSpeed * delta;
                
                // Движение от солнца
                flare.position.add(flare.userData.direction.clone().multiplyScalar(delta * 5));
            }
        }
        
        // Обновляем взрывы
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            const particles = explosion.children;
            let allDead = true;
            
            for (let j = particles.length - 1; j >= 0; j--) {
                const particle = particles[j];
                particle.userData.life += delta;
                
                if (particle.userData.life > particle.userData.maxLife) {
                    explosion.remove(particle);
                } else {
                    allDead = false;
                    const lifeRatio = particle.userData.life / particle.userData.maxLife;
                    
                    // Движение
                    particle.position.x += particle.userData.velocity.x * delta;
                    particle.position.y += particle.userData.velocity.y * delta;
                    particle.position.z += particle.userData.velocity.z * delta;
                    
                    // Вращение
                    particle.rotation.x += particle.userData.rotationSpeed.x * delta;
                    particle.rotation.y += particle.userData.rotationSpeed.y * delta;
                    particle.rotation.z += particle.userData.rotationSpeed.z * delta;
                    
                    // Затухание
                    particle.material.opacity = 0.8 * (1 - lifeRatio);
                    particle.scale.setScalar(1 - lifeRatio * 0.5);
                }
            }
            
            if (allDead || particles.length === 0) {
                this.sunGroup.remove(explosion);
                this.explosions.splice(i, 1);
            }
        }
        
        // Обновляем корональные выбросы
        for (let i = this.cmeParticles.length - 1; i >= 0; i--) {
            const cmeGroup = this.cmeParticles[i];
            const particles = cmeGroup.children;
            let allDead = true;
            
            for (let j = particles.length - 1; j >= 0; j--) {
                const particle = particles[j];
                particle.userData.life += delta;
                
                if (particle.userData.life > particle.userData.maxLife) {
                    // Возвращаем частицу на орбиту солнца
                    particle.userData.life = 0;
                    particle.userData.orbitAngle += Math.PI * 0.1;
                    
                    const radius = particle.userData.orbitRadius;
                    const angle = particle.userData.orbitAngle;
                    particle.position.x = Math.cos(angle) * radius;
                    particle.position.y = Math.sin(angle) * radius;
                    particle.position.z = (Math.random() - 0.5) * 10;
                    
                    // Новая скорость
                    const direction = new THREE.Vector3().copy(particle.position).normalize();
                    particle.userData.velocity = direction.multiplyScalar(3 + Math.random() * 4);
                } else {
                    allDead = false;
                    const lifeRatio = particle.userData.life / particle.userData.maxLife;
                    
                    // Движение по спирали от солнца
                    particle.position.x += particle.userData.velocity.x * delta;
                    particle.position.y += particle.userData.velocity.y * delta;
                    particle.position.z += particle.userData.velocity.z * delta;
                    
                    // Добавляем вращение
                    particle.rotation.x += particle.userData.rotationSpeed.x * delta;
                    particle.rotation.y += particle.userData.rotationSpeed.y * delta;
                    particle.rotation.z += particle.userData.rotationSpeed.z * delta;
                    
                    // Изменение размера и прозрачности
                    particle.scale.setScalar(0.5 + lifeRatio * 1.5);
                    particle.material.opacity = 0.7 * (1 - lifeRatio * 0.3);
                }
            }
            
            if (!allDead) {
                allDead = false;
            }
        }
        
        // Обновляем солнечный ветер
        for (let i = this.solarWind.length - 1; i >= 0; i--) {
            const windGroup = this.solarWind[i];
            const particles = windGroup.children;
            let allDead = true;
            
            for (let j = particles.length - 1; j >= 0; j--) {
                const particle = particles[j];
                particle.userData.life += delta;
                
                if (particle.userData.life > particle.userData.maxLife) {
                    windGroup.remove(particle);
                } else {
                    allDead = false;
                    const lifeRatio = particle.userData.life / particle.userData.maxLife;
                    
                    // Движение от солнца
                    particle.position.x += particle.userData.velocity.x * delta;
                    particle.position.y += particle.userData.velocity.y * delta;
                    particle.position.z += particle.userData.velocity.z * delta;
                    
                    // Затухание
                    particle.material.opacity = 0.6 * (1 - lifeRatio);
                }
            }
            
            if (allDead || particles.length === 0) {
                this.sunGroup.remove(windGroup);
                this.solarWind.splice(i, 1);
                
                // Создаём новый солнечный ветер
                if (Math.random() < 0.5) {
                    setTimeout(() => this.createSolarWind(), Math.random() * 2000);
                }
            }
        }
    }
    
    getSunGroup() {
        return this.sunGroup;
    }
    
    // Случайные события
    triggerRandomEvent() {
        const events = [
            () => this.createSolarFlare(),
            () => this.createCME(),
            () => this.createSolarWind(),
            () => {
                // Большой взрыв
                const explosionPos = new THREE.Vector3(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20
                ).normalize().multiplyScalar(16);
                this.createExplosion(explosionPos, 20);
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        event();
    }
}

// Создаём систему солнца
const solarSystem = new SolarSystem();
scene.add(solarSystem.getSunGroup());

// Запускаем случайные события
setInterval(() => {
    if (Math.random() < 0.7) { // 70% вероятность события
        solarSystem.triggerRandomEvent();
    }
}, 1000 + Math.random() * 3000);

// Радужные лучи от призмы
const createRainbowLights = () => {
    const colors = [0xff0055, 0xff5500, 0xffff00, 0x00ff80, 0x00ffff, 0x0088ff, 0x8800ff, 0xff00ff];
    const lights = [];
    
    colors.forEach((c, i) => {
        const light = new THREE.SpotLight(c, 25, 150, Math.PI/3, 0.2, 1);
        const angle = (i / colors.length) * Math.PI * 2;
        const radius = 25;
        
        light.position.x = Math.sin(angle) * radius;
        light.position.y = Math.cos(angle) * radius * 0.6;
        light.position.z = 8;
        
        light.target.position.copy(prism.position);
        light.penumbra = 0.9;
        light.decay = 1.1;
        
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
    2.5, // Сильный bloom для солнца
    0.9, // Радиус
    0.8  // Порог
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
    const pulse = 1 + Math.sin(time * 0.4) * 0.04;
    prism.scale.setScalar(pulse);
    
    // Анимация иридесценции
    prism.material.iridescence = 0.8 + Math.sin(time * 0.25) * 0.5;
    prism.material.sheenColor.setHSL((time * 0.06) % 1, 0.9, 0.6);
    
    // Обновляем солнце
    solarSystem.update(delta, time);
    
    // Анимация радужных лучей
    rainbowLights.forEach((item, i) => {
        item.light.intensity = 20 + Math.sin(time * 1.2 + i) * 15;
        const hue = (time * 0.025 + i * 0.125) % 1;
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
        camera.position.y = 3;
        prism.position.z = 18;
    } else if (width < 768) {
        camera.position.z = 35;
        camera.position.y = 2;
        prism.position.z = 12;
    } else {
        camera.position.z = 40;
        camera.position.y = 5;
        prism.position.z = 15;
    }
});

// Улучшенная пасхалка
let clicks = 0;
let timer = null;
const secretMessages = [
    "СОЛНЕЧНЫЙ ВЗРЫВ",
    "ТЕРМОЯДЕРНЫЙ СИНТЕЗ",
    "ПЛАЗМЕННЫЙ ВИХРЬ",
    "ЗВЁЗДНАЯ ЭНЕРГИЯ",
    "КОСМИЧЕСКИЙ ОГОНЬ"
];

canvas.addEventListener('click', (e) => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => clicks = 0, 3000);
    
    if (clicks >= 5) {
        clicks = 0;
        const messageIndex = Math.floor(Math.random() * secretMessages.length);
        
        // Создаём оверлей
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: linear-gradient(135deg, 
                rgba(0, 0, 0, 0.98) 0%, 
                rgba(20, 5, 10, 0.99) 100%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(50px);
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
            message.style.fontSize = 'clamp(36px, 12vw, 65px)';
            message.style.padding = '30px 20px';
        } else if (window.innerWidth < 1024) {
            message.style.fontSize = 'clamp(48px, 10vw, 80px)';
        } else {
            message.style.fontSize = 'clamp(60px, 8vw, 110px)';
        }
        
        // Градиент
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
            font-size: clamp(12px, 2vw, 15px);
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
    }
});

// Отключаем все жесты масштабирования и скролла
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

// Оптимизация для iOS
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    renderer.setPixelRatio(1);
    prism.geometry = new THREE.IcosahedronGeometry(prismSize, 2);
}
