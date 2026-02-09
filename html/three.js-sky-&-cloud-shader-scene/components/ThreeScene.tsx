import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { SkyColors, CloudColors } from '../types';

// Shaders
const skyVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  varying vec3 vWorldPosition;

  void main() {
    float h = normalize(vWorldPosition).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.8), 0.0)), 1.0);
  }
`;

const cloudVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  // 2D simplex noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Fractional Brownian Motion
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    for (int i = 0; i < 6; i++) {
      value += amplitude * snoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv * 5.0;
    float time = uTime * 0.01;

    // Use a second fbm call to distort the coordinates of the first.
    // This creates a more dynamic, "boiling" or evolving motion
    // instead of a simple linear translation.
    vec2 motion = vec2(time, 0.0); // Base horizontal movement
    float distortion = fbm(uv * 0.5 + time * 0.1) * 0.5;

    // Combine the base uv, the motion, and the distortion
    float noise = fbm(uv + motion + distortion);

    float cloudCoverage = 0.5;
    float cloudiness = smoothstep(cloudCoverage - 0.2, cloudCoverage + 0.2, noise);
    
    if (cloudiness < 0.1) {
      discard;
    }

    vec3 cloudColor = mix(uColor1, uColor2, smoothstep(0.0, 0.5, noise));
    cloudColor = mix(cloudColor, uColor3, smoothstep(0.5, 1.0, noise));
    
    gl_FragColor = vec4(cloudColor, cloudiness);
  }
`;

// Simplex Noise for terrain generation
class SimplexNoise {
  // FIX: Declare class properties to resolve TypeScript errors.
  grad3: number[][];
  p: number[];
  perm: number[];

  constructor(r = Math) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    this.p = [];
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(r.random() * 256);
    }
    this.perm = [];
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  dot(g: number[], x: number, y: number) { return g[0] * x + g[1] * y; }

  noise(xin: number, yin: number) {
    let n0, n1, n2;
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    return 70.0 * (n0 + n1 + n2);
  }
}

interface ThreeSceneProps {
  skyColors: SkyColors;
  cloudColors: CloudColors;
  lightsOn: boolean;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ skyColors, cloudColors, lightsOn }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // FIX: Initialize useRef with null to satisfy TypeScript's argument expectation.
  const skyMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const cloudMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const light1Ref = useRef<THREE.DirectionalLight | null>(null);
  const light2Ref = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 2000);
    camera.position.set(0, -50, 100);
    camera.lookAt(0,0,0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Sky
    const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
    const skyMaterial = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        topColor: { value: new THREE.Color(skyColors.top) },
        bottomColor: { value: new THREE.Color(skyColors.bottom) },
      },
      side: THREE.BackSide,
    });
    skyMaterialRef.current = skyMaterial;
    const sky = new THREE.Mesh(skyGeo, skyMaterial);
    scene.add(sky);
    
    // Clouds
    const cloudGeo = new THREE.SphereGeometry(950, 32, 15);
    const cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(cloudColors.color1) },
        uColor2: { value: new THREE.Color(cloudColors.color2) },
        uColor3: { value: new THREE.Color(cloudColors.color3) },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    cloudMaterialRef.current = cloudMaterial;
    const clouds = new THREE.Mesh(cloudGeo, cloudMaterial);
    scene.add(clouds);

    // Terrain
    const simplex = new SimplexNoise();
    const terrainGeo = new THREE.PlaneGeometry(2000, 2000, 256, 256);
    const positionAttribute = terrainGeo.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = simplex.noise(x / 500, y / 500) * 50;
        positionAttribute.setZ(i, z);
    }
    terrainGeo.computeVertexNormals();
    const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x446622, roughness: 1, metalness: 0 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -100;
    scene.add(terrain);


    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;
    
    const light1 = new THREE.DirectionalLight(skyColors.top, 1);
    light1.position.set(5, 5, 5);
    scene.add(light1);
    light1Ref.current = light1;
    
    const light2 = new THREE.DirectionalLight(skyColors.bottom, 0.5);
    light2.position.set(-5, -5, -5);
    scene.add(light2);
    light2Ref.current = light2;

    // Animation
    const clock = new THREE.Clock();
    let animationId: number;
    const animate = () => {
      cloudMaterial.uniforms.uTime.value = clock.getElapsedTime();
      // clouds.rotation.y += 0.0005; // Removed rotation
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      currentMount.removeChild(renderer.domElement);
      // FIX: Bypassing incorrect TypeScript errors on dispose calls, likely due to faulty type definitions.
      (renderer as any).dispose();
      (skyGeo as any).dispose();
      (skyMaterial as any).dispose();
      (cloudGeo as any).dispose();
      (cloudMaterial as any).dispose();
      (terrainGeo as any).dispose();
      (terrainMaterial as any).dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to update sky colors
  useEffect(() => {
    if (skyMaterialRef.current) {
      skyMaterialRef.current.uniforms.topColor.value.set(skyColors.top);
      skyMaterialRef.current.uniforms.bottomColor.value.set(skyColors.bottom);
    }
    if (light1Ref.current) {
      light1Ref.current.color.set(skyColors.top);
    }
    if (light2Ref.current) {
      light2Ref.current.color.set(skyColors.bottom);
    }
  }, [skyColors]);
  
  // Effect to update cloud colors
  useEffect(() => {
    if (cloudMaterialRef.current) {
      cloudMaterialRef.current.uniforms.uColor1.value.set(cloudColors.color1);
      cloudMaterialRef.current.uniforms.uColor2.value.set(cloudColors.color2);
      cloudMaterialRef.current.uniforms.uColor3.value.set(cloudColors.color3);
    }
  }, [cloudColors]);
  
  // Effect to toggle lights
  useEffect(() => {
    if (light1Ref.current) light1Ref.current.visible = lightsOn;
    if (light2Ref.current) light2Ref.current.visible = lightsOn;
    if (ambientLightRef.current) ambientLightRef.current.visible = lightsOn;
  }, [lightsOn]);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default ThreeScene;