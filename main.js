// 1. IMPORT PALING ATAS (WAJIB)
import TubesCursor from "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";
import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";
import { GUI } from 'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js';
import { EffectComposer } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// Create a scene
const scene = new THREE.Scene();
const canvas = document.querySelector('canvas.webgl');

// --- SETUP GROUP ---
const group = new THREE.Group();
scene.add(group);

const groupStatic = new THREE.Group();
scene.add(groupStatic);

// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
);
floor.rotation.x = -Math.PI * 0.5;
// scene.add(floor);

// Torus
const geometry = new THREE.TorusGeometry(0.2, 0.04, 4, 20);
const material = new THREE.MeshStandardMaterial({
    color: 0x2555FD,
    emissive: 0x2555FD,
    emissiveIntensity: 5,
    wireframe: true
});
const torus = new THREE.Mesh(geometry, material);
torus.position.set(0, 1.8, 0);
group.add(torus);

const BLOOM_LAYER = 1;
torus.layers.enable(BLOOM_LAYER);

// Lighting
const torusLight = new THREE.PointLight(0xffffff, 0.01, 0.25, 0.0004);
torusLight.position.set(0, 1.8, -2);
scene.add(torusLight);

const torusLightHelper = new THREE.PointLightHelper(torusLight);

const spotLight = new THREE.SpotLight(0xffffff, 17, 100, 10, 10);
spotLight.position.set(0, 3, 0.5);
spotLight.castShadow = true;
scene.add(spotLight);

const spotLightHelper = new THREE.SpotLightHelper(spotLight);

const fillLight = new THREE.PointLight(0x5599FF, 30, 5, 2);
fillLight.position.set(-2, 2, 2);

const rimLight = new THREE.PointLight(0xffffff, 20, 1, 1.5);
rimLight.position.set(1, 1, 1);
scene.add(rimLight);

const fillLightHelper = new THREE.PointLightHelper(fillLight);
const rimLightHelper = new THREE.PointLightHelper(rimLight);

// --- GLTF LOADER FUNCTION (SUDAH DIPERBAIKI) ---
const gltfLoader = new GLTFLoader();
const loadModel = (path, position, rotation = { x: 0, y: 0, z: 0 }, scale = 1, targetGroup = group) => {
    gltfLoader.load(path, (gltf) => {
        const mesh = gltf.scene;
        mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if(child.material) {
                    child.material.roughness = 0.8; 
                    child.material.metalness = 0.1;
                }
            }
        });
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        
        mesh.scale.set(scale, scale, scale); 
        
        targetGroup.add(mesh); 
        
        console.log("Model loaded");

        const loaderEl = document.getElementById('preloader');
        if (loaderEl) {
            gsap.to(loaderEl, {
                scale: 1.5, opacity: 0, duration: 0.5, ease: "linear",
                onComplete: () => loaderEl.remove()
            });
        }
    },
    (xhr) => {
        // Progress
    },
    (error) => {
        console.error('Error loading model', error);
    });
};

// --- LOAD MODELS ---
// 1. Pit (Depan)
loadModel(
    'https://rifqy06.github.io/RIFQY06-web-pameran-3d/source/scene.gltf', 
    { x: 0, y: 0, z: 0 }, 
    { x: 0, y: 0, z: 0 }, 
    1,      
    group
);

// 2. Malaikat (Belakang)
loadModel(
    'https://rifqy06.github.io/RIFQY06-web-pameran-3d/angel/scene.gltf', 
    { x: 0, y: 2, z: -3 },   
    { x: 0, y: 0, z: 0 }, 
    2,
    groupStatic
);

// Sizes & Camera
const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(0, 2, 2);
scene.add(camera);

// --- RENDERER (FIX TRANSPARAN) ---
const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    alpha: true,       // Transparan
    antialias: true    // Halus
});
renderer.shadowMap.enabled = true;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Scroll Animation
if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(group.rotation, {
        y: "+=6.28",
        scrollTrigger: {
            trigger: "body", start: "top top", end: "bottom bottom", scrub: 1
        }
    });
    gsap.to(camera.position, {
        y: 1, z: 1.7,
        scrollTrigger: {
            trigger: "body", start: "top top", end: "bottom bottom", scrub: 1
        }
    });
}

// Post Processing
const composer = new EffectComposer(renderer);
composer.setSize(sizes.width, sizes.height);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(sizes.width, sizes.height), 1, 1.0, 0);
composer.addPass(bloomPass);

// --- MENU GUI LENGKAP (Dikembalikan) ---
const gui = new GUI({ width: 350 });

// Torus Controls
const torusFolder = gui.addFolder('Torus');
torusFolder.add(torus.position, 'x', -5, 5, 0.1).name('Position X');
torusFolder.add(torus.position, 'y', -5, 5, 0.1).name('Position Y');
torusFolder.add(torus.position, 'z', -5, 5, 0.1).name('Position Z');
torusFolder.add(torus.rotation, 'x', 0, Math.PI * 2, 0.1).name('Rotation X');
torusFolder.add(torus.rotation, 'y', 0, Math.PI * 2, 0.1).name('Rotation Y');
torusFolder.add(torus.rotation, 'z', 0, Math.PI * 2, 0.1).name('Rotation Z');
torusFolder.add(material, 'emissiveIntensity', 0, 10, 0.1).name('Emissive Intensity');
torusFolder.addColor({ color: '#2555FD' }, 'color').onChange((value) => {
    material.color.set(value);
    material.emissive.set(value);
}).name('Color');

// Camera Controls
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'x', -10, 10, 0.1).name('Position X');
cameraFolder.add(camera.position, 'y', -10, 10, 0.1).name('Position Y');
cameraFolder.add(camera.position, 'z', -10, 10, 0.1).name('Position Z');
cameraFolder.add(camera, 'fov', 10, 150, 1).onChange(() => {
    camera.updateProjectionMatrix();
}).name('Field of View');

// Light Controls
const lightFolder = gui.addFolder('Lights');
lightFolder.add(torusLight, 'intensity', 0, 200, 1).name('Torus Light');
lightFolder.add(spotLight, 'intensity', 0, 50, 1).name('Spot Light');
lightFolder.add(rimLight, 'intensity', 0, 50, 1).name('Rim Light');

// Bloom Controls
const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(bloomPass, 'strength', 0, 3, 0.01).name('Strength');
bloomFolder.add(bloomPass, 'radius', 0, 2, 0.01).name('Radius');
bloomFolder.add(bloomPass, 'threshold', 0, 1, 0.01).name('Threshold');

// Animation Controls
const animationParams = {
    flickerSpeed: 0.02, flickerIntensity: 10, autoRotation: true, rotationSpeed: 1
};
const animFolder = gui.addFolder('Animation');
animFolder.add(animationParams, 'flickerSpeed', 0, 0.1);
animFolder.add(animationParams, 'flickerIntensity', 0, 50);
animFolder.add(animationParams, 'autoRotation');
animFolder.add(animationParams, 'rotationSpeed', 0, 5);

gui.close();

// Resize
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    composer.setSize(sizes.width, sizes.height);
});

// Animation Loop
let time = 0;
const tick = () => {
    time += animationParams.flickerSpeed;
    torusLight.intensity = torusLight.intensity + Math.sin(time) * animationParams.flickerIntensity;
    if (animationParams.autoRotation) {
        torus.rotation.z += 0.01 * animationParams.rotationSpeed;
    }
    composer.render();
    window.requestAnimationFrame(tick);
};
tick();

// Website Animations
window.onload = function () {
    if(typeof gsap !== "undefined") {
        gsap.from(".banner-section", { opacity: 0, y: 50, duration: 1.5, ease: "power2.out" });
        gsap.from(".images-container .img", { opacity: 0, scale: 0.8, stagger: 0.2, duration: 1.2, ease: "power2.out" });
        
        const images = document.querySelectorAll('.images-container .img-main');
        images.forEach((img) => {
            gsap.to(img, {
                y: 0, opacity: 1, ease: "none",
                scrollTrigger: { trigger: img, start: "top bottom", end: "bottom bottom", scrub: 1 }
            });
        });

        if (typeof SplitText !== "undefined") {
            const split = new SplitText("#loading-text", { type: "chars" });
            gsap.to(split.chars, {
                y: -10, opacity: 0, duration: 0.6, yoyo: true, repeat: -1, stagger: 0.05, ease: "sine.inOut"
            });
        }
        
        // --- LOGIKA MUSIK AUTO-START (SMART) ---
        const music = document.getElementById('bg-music');
        const musicBtn = document.getElementById('music-btn');
        let isPlaying = false;

        function playMusic() {
            if (!isPlaying && music) {
                music.play().then(() => {
                    isPlaying = true;
                    if(musicBtn) musicBtn.innerHTML = "MUSIC: ON 🔊";
                    document.removeEventListener('click', playMusic);
                    document.removeEventListener('scroll', playMusic);
                }).catch(error => { console.log("Waiting for interaction..."); });
            }
        }
        document.addEventListener('click', playMusic);
        document.addEventListener('scroll', playMusic);

        if (musicBtn) {
            musicBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isPlaying) {
                    music.pause();
                    musicBtn.innerHTML = "MUSIC: OFF 🔇";
                    isPlaying = false;
                } else {
                    music.play();
                    musicBtn.innerHTML = "MUSIC: ON 🔊";
                    isPlaying = true;
                }
            });
        }
    }
};

// --- LOGIKA EFEK KURSOR (Fixed) ---
const cursorApp = TubesCursor(document.getElementById('cursor-canvas'), {
    tubes: {
        colors: ["#f967fb", "#53bc28", "#6958d5"], 
        lights: { intensity: 200, colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"] }
    }
});

document.body.addEventListener('click', () => {
    const colors = Array(3).fill(0).map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    const lights = Array(4).fill(0).map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    cursorApp.tubes.setColors(colors);
    cursorApp.tubes.setLightsColors(lights);
});
