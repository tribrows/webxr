import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// --- SKY TEMPLATE ---
export function createSky(config) {
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `;
    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize( vWorldPosition + offset ).y;
            gl_FragColor = vec4( mix( bottomColor, topColor, max( h, 0.0 ) ), 1.0 );
        }
    `;

    const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
        vertexShader, fragmentShader,
        uniforms: {
            topColor: { value: new THREE.Color(config.skyTop) },
            bottomColor: { value: new THREE.Color(config.skyBottom) },
            offset: { value: 33 }
        },
        side: THREE.BackSide
    });
    return new THREE.Mesh(skyGeo, skyMat);
}

// --- CLOUD MATERIAL & GENERATOR ---
export function createCloudMaterial(config, lightDir) {
    const vertexShader = `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fragmentShader = `
        uniform vec3 uColorHighlight;
        uniform vec3 uColorMidtone;
        uniform vec3 uColorShadow;
        uniform vec3 uLightDir;
        varying vec3 vNormal;
        void main() {
            float intensity = dot(vNormal, normalize(uLightDir));
            float step1 = smoothstep(0.5, 0.52, intensity);
            float step2 = smoothstep(-0.2, -0.18, intensity);
            vec3 shadowMid = mix(uColorShadow, uColorMidtone, step2);
            gl_FragColor = vec4(mix(shadowMid, uColorHighlight, step1), 1.0);
        }
    `;

    return new THREE.ShaderMaterial({
        vertexShader, fragmentShader,
        uniforms: {
            uColorHighlight: { value: new THREE.Color(config.cloudHighlight) },
            uColorMidtone: { value: new THREE.Color(config.cloudMidtone) },
            uColorShadow: { value: new THREE.Color(config.cloudShadow) },
            uLightDir: { value: lightDir }
        }
    });
}

// --- UNIVERSAL GUI COMPONENT ---
export function setupGUI(config, sceneObjects) {
    let gui;
    
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'g') {
            if (!gui) {
                gui = new GUI({ title: 'Palette Controls (G to Toggle)' });
                
                const { sky, cloudMat, lightTop, ambientLight } = sceneObjects;

                // Sky Folder
                const skyFolder = gui.addFolder('Sky & Sun');
                skyFolder.addColor(config, 'skyTop').onChange(v => {
                    sky.material.uniforms.topColor.value.set(v);
                    if(lightTop) lightTop.color.set(v);
                });
                skyFolder.addColor(config, 'skyBottom').onChange(v => {
                    sky.material.uniforms.bottomColor.value.set(v);
                });
                if(ambientLight) skyFolder.add(config, 'ambientIntensity', 0, 2).onChange(v => ambientLight.intensity = v);

                // Clouds Folder
                const cloudFolder = gui.addFolder('Cloud Tones');
                cloudFolder.addColor(config, 'cloudHighlight').onChange(v => cloudMat.uniforms.uColorHighlight.value.set(v));
                cloudFolder.addColor(config, 'cloudMidtone').onChange(v => cloudMat.uniforms.uColorMidtone.value.set(v));
                cloudFolder.addColor(config, 'cloudShadow').onChange(v => cloudMat.uniforms.uColorShadow.value.set(v));
                
                // Export Tool
                gui.add({ export: () => console.log(JSON.stringify(config, null, 2)) }, 'export').name('Log Config to Console');

            } else {
                const isHidden = gui._domElement.style.display === 'none';
                gui._domElement.style.display = isHidden ? 'block' : 'none';
            }
        }
    });
}
