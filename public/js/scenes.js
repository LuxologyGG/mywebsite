/* scenes.js — WebGL overview background and the contact signal canvas. */

// ── Overview Perlin noise particle background ──
const ovVertex = `
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }
  float cnoise(vec2 P) {
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod289(Pi);
    vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
    vec4 i = permute(permute(ix) + iy);
    vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x,gy.x); vec2 g10 = vec2(gx.y,gy.y);
    vec2 g01 = vec2(gx.z,gy.z); vec2 g11 = vec2(gx.w,gy.w);
    vec4 norm = taylorInvSqrt(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));
    g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
    float n00 = dot(g00, vec2(fx.x, fy.x)); float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z)); float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
  }
  float map(float value, float oldMin, float oldMax, float newMin, float newMax) {
    return newMin + (newMax - newMin) * (value - oldMin) / (oldMax - oldMin);
  }
  varying float vZ;
  uniform float time;
  void main() {
    vec3 newPos = position;
    vec2 peak = vec2(1.0 - abs(.5 - uv.x), 1.0 - abs(.5 - uv.y));
    vec2 noise = vec2(
      map(cnoise(vec2(0.3 * time + uv.x * 5., uv.y * 5.)), 0., 1., -2., (peak.x * peak.y * 30.)),
      map(cnoise(vec2(-0.3 * time + uv.x * 5., uv.y * 5.)), 0., 1., -2., 25.)
    );
    newPos.z += noise.x * .06 * noise.y;
    vZ = newPos.z;
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    gl_PointSize = 5.0;
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const ovFragment = `
  varying float vZ;
  uniform sampler2D uTexture;
  float map(float value, float oldMin, float oldMax, float newMin, float newMax) {
    return newMin + (newMax - newMin) * (value - oldMin) / (oldMax - oldMin);
  }
  void main() {
    float alpha = map(vZ / 2., -1. / 2., 30. / 2., 0.12, 1.0);
    vec3 color = vec3(0.7, 0.7, 0.75);
    gl_FragColor = vec4(color, alpha);
    gl_FragColor = gl_FragColor * texture2D(uTexture, gl_PointCoord);
  }
`;

let overviewScene = null;
class OverviewScene {
  constructor(el) {
    this.el = el;
    this.time = 0;
    this.active = false;
    this.raf = null;
    this.render = this.render.bind(this);
    this.resize = this.resize.bind(this);
    this.init();
  }
  init() {
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 2000);
    this.camera.position.z = 300;
    this.camera.position.y = 180;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.el.appendChild(this.renderer.domElement);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = '';
    const plane = new THREE.PlaneBufferGeometry(700, 350, 300, 150);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uTexture: { value: textureLoader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/1081752/spark1.png') }
      },
      vertexShader: ovVertex,
      fragmentShader: ovFragment,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true
    });
    this.particles = new THREE.Points(plane, material);
    this.particles.rotation.x = -Math.PI / 2;
    this.scene.add(this.particles);
    window.addEventListener('resize', this.resize);
  }
  start() {
    if (this.active) return;
    this.active = true;
    this.render();
  }
  stop() {
    this.active = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
  }
  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
  render() {
    if (!this.active) return;
    this.raf = requestAnimationFrame(this.render);
    this.time += 0.01;
    this.particles.material.uniforms.time.value = this.time;
    this.renderer.render(this.scene, this.camera);
  }
}

const particleVertex = `
  attribute float scale;
  uniform float uTime;

  void main() {
    vec3 p = position;
    float s = scale;

    p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
    p.x += (sin(p.y + uTime) * 0.5);
    s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragment = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5);
  }
`;

class ContactCanvas {
  constructor() {
    this.config = {
      canvas: document.getElementById('contact-signals'),
      winWidth: window.innerWidth,
      winHeight: window.innerHeight,
      aspectRatio: window.innerWidth / window.innerHeight,
      mouse: new THREE.Vector2(-10, -10)
    };

    if (!this.config.canvas) return;

    this.onResize = this.onResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.animate = this.animate.bind(this);

    this.initCamera();
    this.initScene();
    this.initRenderer();

    this.initParticles();

    this.bindEvents();
    this.animate();
  }

  bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove, false);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(75, this.config.aspectRatio, 0.01, 1000);
    this.camera.position.set(0, 6, 5);
  }

  initScene() {
    this.scene = new THREE.Scene();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.config.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.config.winWidth, this.config.winHeight);
  }

  initParticles() {
    const gap = 0.3;
    const amountX = 200;
    const amountY = 200;
    const particleNum = amountX * amountY;
    const particlePositions = new Float32Array(particleNum * 3);
    const particleScales = new Float32Array(particleNum);
    let i = 0;
    let j = 0;

    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        particlePositions[i] = ix * gap - ((amountX * gap) / 2);
        particlePositions[i + 1] = 0;
        particlePositions[i + 2] = iy * gap - ((amountX * gap) / 2);
        particleScales[j] = 1;
        i += 3;
        j++;
      }
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    this.particleGeometry.setAttribute('scale', new THREE.BufferAttribute(particleScales, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uTime: { type: 'f', value: 0 }
      }
    });
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  render() {
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.particleMaterial.uniforms.uTime.value += 0.015;
    this.render();
  }

  onMouseMove(e) {
    if (!document.body.classList.contains('contact-mode')) return;
    this.config.mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
    this.config.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
  }

  onResize() {
    this.config.winWidth = window.innerWidth;
    this.config.winHeight = window.innerHeight;
    this.camera.aspect = this.config.winWidth / this.config.winHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.config.winWidth, this.config.winHeight);
  }
}

// Initialize contact waves. Both scenes need the three.js CDN bundle; if that
// request fails the page should still work, just without the animated canvas.
window.addEventListener('load', () => {
  if (typeof THREE === 'undefined') {
    console.warn('three.js unavailable — skipping the contact canvas.');
    return;
  }
  new ContactCanvas();
});
