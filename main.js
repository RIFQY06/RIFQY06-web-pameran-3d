import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";
import { GUI } from 'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js';
import { EffectComposer } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import TubesCursor from "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";

// Create a scene
const scene = new THREE.Scene();
const canvas = document.querySelector('canvas.webgl');

// --- PERBAIKAN GROUP DI SINI (HANYA SATU KALI DEFINISI) ---
// Group untuk objek yang BERPUTAR (Pit & Cincin)
const group = new THREE.Group();
scene.add(group);

// Group untuk objek yang DIAM (Malaikat di belakang)
const groupStatic = new THREE.Group();
scene.add(groupStatic);
// ----------------------------------------------------------

// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
);
floor.rotation.x = -Math.PI * 0.5;
// scene.add(floor);

// Torus with emissive material
const geometry = new THREE.TorusGeometry(0.2, 0.04, 4, 20);
const material = new THREE.MeshStandardMaterial({
    color: 0x2555FD,
    emissive: 0x2555FD,
    emissiveIntensity: 5,
    wireframe: true
});
const torus = new THREE.Mesh(geometry, material);
torus.position.set(0, 1.8, 0);
group.add(torus); // Masuk ke group

const BLOOM_LAYER = 1;
torus.layers.enable(BLOOM_LAYER);

// Lighting
// Move the PointLight inside the Torus
const torusLight = new THREE.PointLight(0xffffff, 0.01, 0.25, 0.0004); 
torusLight.position.set(0, 1.8, -2); 
scene.add(torusLight);

const torusLightHelper = new THREE.PointLightHelper(torusLight);
// scene.add(torusLightHelper);

const spotLight = new THREE.SpotLight(0xffffff, 17, 100, 10, 10);
spotLight.position.set(0, 3, 0.5);
spotLight.castShadow = true;
scene.add(spotLight);

const spotLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(spotLightHelper);

// Soft fill light from the left
const fillLight = new THREE.PointLight(0x5599FF, 30, 5, 2);
fillLight.position.set(-2, 2, 2);
// scene.add(fillLight);

// Rim light from the back for depth
const rimLight = new THREE.PointLight(0xffffff, 20, 1, 1.5);
rimLight.position.set(1, 1, 1);
scene.add(rimLight);

const fillLightHelper = new THREE.PointLightHelper(fillLight);
const rimLightHelper = new THREE.PointLightHelper(rimLight);
// scene.add(fillLightHelper);
// scene.add(rimLightHelper);

// --- GLTF LOADER FUNCTION (SUDAH DIPERBAIKI) ---
const gltfLoader = new GLTFLoader();

// Fungsi ini sudah mendukung SCALE dan TARGET GROUP
const loadModel = (path, position, rotation = { x: 0, y: 0, z: 0 }, scale = 1, targetGroup = group) => {
    gltfLoader.load(path, (gltf) => {
        const mesh = gltf.scene;
        mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // Fix Silau Malaikat
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

        // Hide loader when model is ready
        const loaderEl = document.getElementById('preloader');
        if (loaderEl) {
            gsap.to(loaderEl, {
                scale: 1.5, opacity: 0, duration: 0.5, ease: "linear",
                onComplete: () => loaderEl.remove()
            });
        }
    },
    (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100;
        console.log(`Loading model: ${percent.toFixed(0)}%`);
    },
    (error) => {
        console.error('Error loading model', error);
    });
};

// --- LOAD MODELS ---

// 1. PATUNG PIT (Berputar di Depan)
loadModel(
    'https://rifqy06.github.io/RIFQY06-web-pameran-3d/source/scene.gltf', 
    { x: 0, y: 0, z: 0 }, 
    { x: 0, y: 0, z: 0 }, 
    1,      
    group   // Masuk Group Putar
);

// 2. PATUNG MALAIKAT (Diam di Belakang)
loadModel(
    'https://rifqy06.github.io/RIFQY06-web-pameran-3d/angel/scene.gltf', 
    { x: 0, y: 0, z: -2 },   
    { x: 0, y: 0, z: 0 }, 
    1.2,
    groupStatic // Masuk Group Diam
);

// Sizes
const sizes = { width: window.innerWidth, height: window.innerHeight };

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(0, 2, 2);
scene.add(camera);

// --- RENDERER (SUDAH FIX TRANSPARAN) ---
const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    alpha: true,       // Transparan agar video terlihat
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
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
        }
    });

    gsap.to(camera.position, {
        y: 1,
        z: 1.7,
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
        }
    });
}

// Post Processing
const composer = new EffectComposer(renderer);
composer.setSize(sizes.width, sizes.height);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(sizes.width, sizes.height),
    1, 1.0, 0
);
composer.addPass(bloomPass);

// --- DAT.GUI SETUP (MENU PENGATURAN LENGKAP DIKEMBALIKAN) ---
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

// Torus Light Controls
const torusLightFolder = gui.addFolder('Torus Light');
torusLightFolder.add(torusLight.position, 'x', -5, 5, 0.1).name('Position X');
torusLightFolder.add(torusLight.position, 'y', -5, 5, 0.1).name('Position Y');
torusLightFolder.add(torusLight.position, 'z', -5, 5, 0.1).name('Position Z');
torusLightFolder.add(torusLight, 'intensity', 0, 200, 1).name('Base Intensity');
torusLightFolder.add(torusLight, 'distance', 0, 10, 0.1).name('Distance');
torusLightFolder.add(torusLight, 'decay', 0, 5, 0.1).name('Decay');
torusLightFolder.addColor({ color: '#ffffff' }, 'color').onChange((value) => {
    torusLight.color.set(value);
}).name('Color');

// Spot Light Controls
const spotLightFolder = gui.addFolder('Spot Light');
spotLightFolder.add(spotLight.position, 'x', -10, 10, 0.1).name('Position X');
spotLightFolder.add(spotLight.position, 'y', -10, 10, 0.1).name('Position Y');
spotLightFolder.add(spotLight.position, 'z', -10, 10, 0.1).name('Position Z');
spotLightFolder.add(spotLight, 'intensity', 0, 50, 1).name('Intensity');
spotLightFolder.add(spotLight, 'distance', 0, 200, 1).name('Distance');
spotLightFolder.add(spotLight, 'angle', 0, Math.PI / 2, 0.01).name('Angle');
spotLightFolder.add(spotLight, 'penumbra', 0, 1, 0.01).name('Penumbra');
spotLightFolder.addColor({ color: '#ffffff' }, 'color').onChange((value) => {
    spotLight.color.set(value);
}).name('Color');

// Rim Light Controls
const rimLightFolder = gui.addFolder('Rim Light');
rimLightFolder.add(rimLight.position, 'x', -10, 10, 0.1).name('Position X');
rimLightFolder.add(rimLight.position, 'y', -10, 10, 0.1).name('Position Y');
rimLightFolder.add(rimLight.position, 'z', -10, 10, 0.1).name('Position Z');
rimLightFolder.add(rimLight, 'intensity', 0, 50, 1).name('Intensity');
rimLightFolder.add(rimLight, 'distance', 0, 10, 0.1).name('Distance');
rimLightFolder.add(rimLight, 'decay', 0, 5, 0.1).name('Decay');
rimLightFolder.addColor({ color: '#ffffff' }, 'color').onChange((value) => {
    rimLight.color.set(value);
}).name('Color');

// Bloom Effect Controls
const bloomFolder = gui.addFolder('Bloom Effect');
bloomFolder.add(bloomPass, 'strength', 0, 3, 0.01).name('Strength');
bloomFolder.add(bloomPass, 'radius', 0, 2, 0.01).name('Radius');
bloomFolder.add(bloomPass, 'threshold', 0, 1, 0.01).name('Threshold');

// Animation Controls
const animationParams = {
    flickerSpeed: 0.02,
    flickerIntensity: 10,
    autoRotation: true,
    rotationSpeed: 1
};

const animationFolder = gui.addFolder('Animation');
animationFolder.add(animationParams, 'flickerSpeed', 0, 0.1, 0.001).name('Flicker Speed');
animationFolder.add(animationParams, 'flickerIntensity', 0, 50, 1).name('Flicker Intensity');
animationFolder.add(animationParams, 'autoRotation').name('Auto Rotation');
animationFolder.add(animationParams, 'rotationSpeed', 0, 5, 0.1).name('Rotation Speed');

// Group Controls
const groupFolder = gui.addFolder('Group Transform');
groupFolder.add(group.position, 'x', -10, 10, 0.1).name('Position X');
groupFolder.add(group.position, 'y', -10, 10, 0.1).name('Position Y');
groupFolder.add(group.position, 'z', -10, 10, 0.1).name('Position Z');
groupFolder.add(group.rotation, 'x', 0, Math.PI * 2, 0.1).name('Rotation X');
groupFolder.add(group.rotation, 'y', 0, Math.PI * 2, 0.1).name('Rotation Y');
groupFolder.add(group.rotation, 'z', 0, Math.PI * 2, 0.1).name('Rotation Z');

gui.close();

// Scene Controls (HAPUS BACKGROUND COLOR BIAR VIDEO KELIHATAN)
/* const sceneFolder = gui.addFolder('Scene');
sceneFolder.addColor({ backgroundColor: '#000000' }, 'backgroundColor').onChange((value) => {
    scene.background = new THREE.Color(value);
}).name('Background Color'); 
*/

// Renderer Controls
const rendererFolder = gui.addFolder('Renderer');
rendererFolder.add(renderer, 'toneMappingExposure', 0, 3, 0.01).name('Exposure');

// Helper toggles
const helpersFolder = gui.addFolder('Helpers');
const helperControls = {
    showTorusLightHelper: false,
    showSpotLightHelper: false,
    showRimLightHelper: false,
    showFillLightHelper: false
};

helpersFolder.add(helperControls, 'showTorusLightHelper').onChange((value) => {
    value ? scene.add(torusLightHelper) : scene.remove(torusLightHelper);
}).name('Torus Light Helper');

helpersFolder.add(helperControls, 'showSpotLightHelper').onChange((value) => {
    value ? scene.add(spotLightHelper) : scene.remove(spotLightHelper);
}).name('Spot Light Helper');

helpersFolder.add(helperControls, 'showRimLightHelper').onChange((value) => {
    value ? scene.add(rimLightHelper) : scene.remove(rimLightHelper);
}).name('Rim Light Helper');

helpersFolder.add(helperControls, 'showFillLightHelper').onChange((value) => {
    value ? scene.add(fillLightHelper) : scene.remove(fillLightHelper);
}).name('Fill Light Helper');

// Resize Handling
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(sizes.width, sizes.height);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
