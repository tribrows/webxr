import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Custom Shaders for the 2D Toon Look
 */
const CLOUD_SHADERS = {
  vertex: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform vec3 uColorHighlight;
    uniform vec3 uColorMidtone;
    uniform vec3 uColorShadow;
    uniform vec3 uLightDir;
    varying vec3 vNormal;
    void main() {
      float intensity = dot(vNormal, normalize(uLightDir));
      vec3 finalColor;
      float step1 = smoothstep(0.5, 0.52, intensity);
      float step2 = smoothstep(-0.2, -0.18, intensity);
      vec3 shadowMid = mix(uColorShadow, uColorMidtone, step2);
      finalColor = mix(shadowMid, uColorHighlight, step1);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const App = ({ 
  initialTheme = {
    skyTop: '#5e8bff',
    skyBottom: '#ff98a6',
    cloudHighlight: '#ffffff',
    cloudMidtone: '#c5d1e8',
    cloudShadow: '#7a869e',
    terrainColor: '#2a2a35'
  } 
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const uniformsRef = useRef(null);
  const skyUniformsRef = useRef(null);
  const terrainMatRef = useRef(null);
  
  const [colors, setColors] = useState(initialTheme);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync React State to Three.js Uniforms and Materials
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.uColorHighlight.value.set(colors.cloudHighlight);
      uniformsRef.current.uColorMidtone.value.set(colors.cloudMidtone);
      uniformsRef.current.uColorShadow.value.set(colors.cloudShadow);
    }
    if (skyUniformsRef.current) {
      skyUniformsRef.current.topColor.value.set(colors.skyTop);
      skyUniformsRef.current.bottomColor.value.set(colors.skyBottom);
    }
    if (terrainMatRef.current) {
      terrainMatRef.current.color.set(colors.terrainColor);
    }
  }, [colors]);

  useEffect(() => {
    // 1. Scene Initialization
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 30, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // 2. Setup Sky
    const skyUniforms = {
      topColor: { value: new THREE.Color(colors.skyTop) },
      bottomColor: { value: new THREE.Color(colors.skyBottom) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };
    skyUniformsRef.current = skyUniforms;

    const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPos = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPos.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; varying vec3 vWorldPosition; void main() { float h = normalize(vWorldPosition + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0); }`,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // 3. Setup Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(50, 200, 50);
    scene.add(sun);

    // 4. Setup Clouds (Wispy Style)
    const cloudUniforms = {
      uColorHighlight: { value: new THREE.Color(colors.cloudHighlight) },
      uColorMidtone: { value: new THREE.Color(colors.cloudMidtone) },
      uColorShadow: { value: new THREE.Color(colors.cloudShadow) },
      uLightDir: { value: sun.position.clone().normalize() }
    };
    uniformsRef.current = cloudUniforms;

    const cloudMat = new THREE.ShaderMaterial({
      uniforms: cloudUniforms,
      vertexShader: CLOUD_SHADERS.vertex,
      fragmentShader: CLOUD_SHADERS.fragment
    });

    const cloudsGroup = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const geometries = [];
      const blobs = 10 + Math.floor(Math.random() * 15);
      const stretchX = 1 + Math.random() * 2;
      const stretchZ = 1 + Math.random() * 1.5;

      for (let j = 0; j < blobs; j++) {
        const r = 2 + Math.random() * 6;
        const g = new THREE.SphereGeometry(r, 12, 12);
        g.translate(
          (Math.random() - 0.5) * 35 * stretchX,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 20 * stretchZ
        );
        geometries.push(g);
      }
      
      const mergedGeo = mergeGeometries(geometries);
      const cloud = new THREE.Mesh(mergedGeo, cloudMat);
      
      const angle = Math.random() * Math.PI * 2;
      const radius = 100 + Math.random() * 150;
      cloud.position.set(Math.cos(angle) * radius, 30 + Math.random() * 80, Math.sin(angle) * radius);
      cloud.scale.set(1, 0.6, 1);
      cloud.lookAt(0, cloud.position.y, 0);
      cloudsGroup.add(cloud);
    }
    scene.add(cloudsGroup);

    // 5. Setup Terrain
    const terrainGeo = new THREE.PlaneGeometry(800, 800, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) * 0.02;
      const pz = pos.getZ(i) * 0.02;
      const h = (Math.sin(px) + Math.cos(pz)) * 5 + (Math.sin(px * 3) + Math.cos(pz * 3)) * 2;
      pos.setY(i, h - 30);
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ 
      color: colors.terrainColor, 
      flatShading: true,
      roughness: 0.9 
    });
    terrainMatRef.current = terrainMat;
    scene.add(new THREE.Mesh(terrainGeo, terrainMat));

    // 6. Central Object
    const torusKnot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(10, 3, 128, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 })
    );
    torusKnot.position.y = 20;
    scene.add(torusKnot);

    // 7. Controls & Animation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      const requestID = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      torusKnot.rotation.x = Math.sin(time * 0.5) * 0.1;
      torusKnot.rotation.y = time * 0.2;
      torusKnot.position.y = 20 + Math.sin(time) * 3;
      
      controls.update();
      renderer.render(scene, camera);
      return requestID;
    };
    const requestID = animate();

    setIsLoaded(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestID);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* React UI Overlay */}
      <div className="absolute top-4 left-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white w-72 space-y-4">
        <h2 className="text-lg font-bold">Atmosphere Template</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold opacity-70">Sky Top</label>
            <input 
              type="color" className="w-full h-8 rounded bg-transparent cursor-pointer border-none" 
              value={colors.skyTop} 
              onChange={(e) => setColors({...colors, skyTop: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold opacity-70">Sky Bottom</label>
            <input 
              type="color" className="w-full h-8 rounded bg-transparent cursor-pointer border-none" 
              value={colors.skyBottom} 
              onChange={(e) => setColors({...colors, skyBottom: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold opacity-70">Cloud Palette (Hi/Mid/Shad)</label>
          <div className="flex gap-2">
            <input type="color" className="flex-1 h-8 rounded bg-transparent cursor-pointer border-none" value={colors.cloudHighlight} onChange={(e) => setColors({...colors, cloudHighlight: e.target.value})} />
            <input type="color" className="flex-1 h-8 rounded bg-transparent cursor-pointer border-none" value={colors.cloudMidtone} onChange={(e) => setColors({...colors, cloudMidtone: e.target.value})} />
            <input type="color" className="flex-1 h-8 rounded bg-transparent cursor-pointer border-none" value={colors.cloudShadow} onChange={(e) => setColors({...colors, cloudShadow: e.target.value})} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold opacity-70">Terrain</label>
          <input 
            type="color" className="w-full h-8 rounded bg-transparent cursor-pointer border-none" 
            value={colors.terrainColor} 
            onChange={(e) => setColors({...colors, terrainColor: e.target.value})}
          />
        </div>

        <button 
          onClick={() => setColors(initialTheme)}
          className="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition border border-white/10"
        >
          RESET TO DEFAULTS
        </button>
      </div>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-medium tracking-widest uppercase">Initializing Canvas</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
