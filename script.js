import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
camera.position.z = 22;

// === КРИСТАЛЛ КАК В iOS 26 / Vision Pro ===
const prismSize = Math.min(innerWidth, innerHeight) * 0.009;
const prism = new THREE.Mesh(
    new THREE.TetrahedronGeometry(prismSize, 0),
    new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 0.99,
        thickness: 10,
        clearcoat: 1,
        clearcoatRoughness: 0,
        ior: 1.78,           // именно так выглядит стекло в iOS 26
        envMapIntensity: 30,
        reflectivity: 1
    })
);
prism.rotation.set(0.6, 0.8, 0.1);
scene.add(prism);

// === БЕЛЫЙ ЛУЧ СЛЕВА → ПРИЗМА → РАДУГА СПРАВА ===
const whiteBeam = new THREE.SpotLight(0xffffff, 30, 100, Math.PI/12, 0.7);
whiteBeam.position.set(-25, 8, 10);
whiteBeam.target = prism;
scene.add(whiteBeam);
scene.add(whiteBeam.target);

// 7 лучей радуги выходят строго справа и вниз
const rainbow = [
    0xff0000, 0xff6600, 0xffaa00, 0xffff00,
    0x00ff00, 0x0099ff, 0x9900ff
];

rainbow.forEach((color, i) => {
    const light = new THREE.SpotLight(color, 15, 120, Math.PI/8, 0.6);
    light.position.copy(prism.position);
    
    const angle = 0.3 + i * 0.09;           // физически правильное расхождение
    light.position.x += Math.cos(angle) * 8;
    light.position.y -= 3;
    
    light.target.position.x = light.position.x + 30;
    light.target.position.y = light.position.y - 40;
    
    scene.add(light);
    scene.add(light.target);
});

// мягкий объёмный свет
scene.add(new THREE.AmbientLight(0x404060, 6));

// анимация
function animate(){
    requestAnimationFrame(animate);
    prism.rotation.y += 0.006;
    prism.rotation.x += 0.002;
    renderer.render(scene, camera);
}
animate();

// ресайз
addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    
    const newSize = Math.min(innerWidth, innerHeight) * 0.009;
    prism.geometry.dispose();
    prism.geometry = new THREE.TetrahedronGeometry(newSize, 0);
});

// пасхалка — 5 кликов
let c=0,t=null;
canvas.onclick=()=>{c++;clearTimeout(t);t=setTimeout(()=>c=0,3000);
    if(c>=5){c=0;
        const el=document.createElement('div');
        el.innerHTML=`<div style="position:fixed;inset:0;background:#000d;z-index:9999;display:grid;place-items:center;backdrop-filter:blur(40px)">
            <h2 style="font-size:clamp(70px,18vw,200px);background:linear-gradient(45deg,#00ffff,#ff00aa,#ffff00);-webkit-background-clip:text;-webkit-text-fill-color:transparent">
                ӘЙДӘ БЕЗНЕҢ
            </h2></div>`;
        el.onclick=()=>el.remove();
        document.body.appendChild(el);
    }
};
