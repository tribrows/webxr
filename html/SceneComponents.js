import * as THREE from 'three';
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
        vertexShader,
        fragmentShader,
        uniforms: {
            topColor: { value: new THREE.Color(config.skyTop) },
            bottomColor: { value: new THREE.Color(config.skyBottom) },
            offset: { value: 33 }
        },
        side: THREE.BackSide
    });

    return new THREE.Mesh(skyGeo, skyMat);
}

// --- CLOUD TEMPLATE ---
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
        vertexShader,
        fragmentShader,
        uniforms: {
            uColorHighlight: { value: new THREE.Color(config.cloudHighlight) },
            uColorMidtone: { value: new THREE.Color(config.cloudMidtone) },
            uColorShadow: { value: new THREE.Color(config.cloudShadow) },
            uLightDir: { value: lightDir }
        }
    });
}

export function generateClouds(count, material) {
    const group = new THREE.Group();
    for(let i = 0; i < count; i++) {
        const blobsCount = 10 + Math.floor(Math.random() * 15);
        const geometries = [];
        const stretchX = 1 + Math.random() * 2;

        for(let j = 0; j < blobsCount; j++) {
            const r = 2 + Math.random() * 6;
            const geo = new THREE.SphereGeometry(r, 12, 12);
            geo.translate((Math.random() - 0.5) * 35 * stretchX, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 20);
            geometries.push(geo);
        }

        const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 150;
        mesh.position.set(Math.cos(angle) * radius, 30 + Math.random() * 80, Math.sin(angle) * radius);
        mesh.scale.set(1, 0.6, 1);
        group.add(mesh);
    }
    return group;
}
