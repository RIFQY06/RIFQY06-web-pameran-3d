// 1. IMPORT LIBRARY (Cursor lewat HTML, ThreeJS lewat sini)
import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";
import { GUI } from 'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js';
import { EffectComposer } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// Create a scene
const scene = new THREE.Scene();
// Hapus background color bawaan scene agar transparan
scene.background = null; 

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

const spotLight = new THREE.SpotLight(0xffffff, 17, 100, 10, 10);
spotLight.position.set(0, 3, 0.5);
spotLight.castShadow = true;
scene.add(spotLight);

const fillLight = new THREE.PointLight(0x5599FF, 30, 5, 2);
fillLight.position.set(-2, 2, 2);

const rimLight = new THREE.PointLight(0xffffff, 20, 1, 1.5);
rimLight.position.set(1, 1, 1);
scene.add(rimLight);

// --- GLTF LOADER ---
const gltfLoader = new GLTFLoader();
const loadModel = (path, position, rotation = { x: 0, y: 0, z: 0 }, scale = 1, targetGroup = group) => {
    gltfLoader.load(path, (gltf) => {
        const mesh = gltf.scene;
        mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // --- FIX SILAU & TEXTURE HILANG ---
                // Karena tekstur dihapus, kita gelapkan warnanya manual
                if(child.material) {
                    child.material.color.setHex(0x888888); // Warna Abu-abu
                    child.material.roughness = 0.7;        // Tidak mengkilap
                    child.material.metalness = 0.1;        // Sedikit metal
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
    (xhr) => {},
    (error) => { console.log('Texture error ignored (Normal)'); });
};

// --- LOAD MODELS ---
loadModel(
    'https://rifqy06.github.io/RIFQY06-web-pameran-3d/source/scene.gltf', 
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 4, group
);

loadModel(
    'https://rifqy06.github.io/RIFQY06-web-pameran-3d/angel/scene.gltf', 
    { x: 0, y: 6, z: -4 }, { x: 0, y: 0, z: 0 }, 5, groupStatic
);

// Sizes & Camera
const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(0, 2, 2);
scene.add(camera);

// --- RENDERER (SOLUSI BACKGROUND HITAM) ---
const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    alpha: true,        // 1. Aktifkan Alpha
    antialias: true 
});
renderer.setClearColor(0x000000, 0); // 2. PAKSA Background jadi Bening (0)
renderer.shadowMap.enabled = true;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(1); // Resolusi aman (Anti-Crash)

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
composer.setPixelRatio(1);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(sizes.width, sizes.height), 1, 1.0, 0);
composer.addPass(bloomPass);

// GUI Setup
const gui = new GUI({ width: 350 });
const torusFolder = gui.addFolder('Torus');
torusFolder.add(torus.position, 'x', -5, 5, 0.1);
gui.close();

// Resize
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(1);
    composer.setSize(sizes.width, sizes.height);
    composer.setPixelRatio(1);
});

// Animation Loop
const animationParams = {
    flickerSpeed: 0.02, flickerIntensity: 10, autoRotation: true, rotationSpeed: 1
};
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

// Website Animations & Music Logic
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
            gsap.to(split.chars, { y: -10, opacity: 0, duration: 0.6, yoyo: true, repeat: -1, stagger: 0.05, ease: "sine.inOut" });
        }
    }
    
    // Music Logic
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
            }).catch(error => {});
        }
    }
    document.addEventListener('click', playMusic);
    document.addEventListener('scroll', playMusic);
    if (musicBtn) {
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isPlaying) { music.pause(); musicBtn.innerHTML = "MUSIC: OFF 🔇"; isPlaying = false; }
            else { music.play(); musicBtn.innerHTML = "MUSIC: ON 🔊"; isPlaying = true; }
        });
    }
};

// --- LOGIKA EFEK KURSOR (VIA HTML) ---
if (window.TubesCursor) {
    const cursorApp = window.TubesCursor(document.getElementById('cursor-canvas'), {
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
}
