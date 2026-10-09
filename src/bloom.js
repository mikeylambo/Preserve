import * as THREE from "../vendor/three.module.js";
// A small bloom for the world Medium and High tiers: render the scene into a
// half-float target, pull out the bright parts at half resolution, blur them
// twice, then add them back while tone mapping to the screen. Presentation only.
const VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

function pass(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
}

export class Bloom {
  constructor(renderer) {
    this.renderer = renderer;
    const opts = { type: THREE.HalfFloatType, depthBuffer: false };
    this.scene = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.a = new THREE.WebGLRenderTarget(1, 1, opts);
    this.b = new THREE.WebGLRenderTarget(1, 1, opts);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.bright = pass(
      `uniform sampler2D map;uniform float threshold;varying vec2 vUv;void main(){vec3 c=texture2D(map,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(threshold,threshold+.6,l),1.);}`,
      { map: { value: null }, threshold: { value: 0.75 } },
    );
    this.blur = pass(
      `uniform sampler2D map;uniform vec2 step;varying vec2 vUv;void main(){vec3 c=texture2D(map,vUv).rgb*.227;c+=(texture2D(map,vUv+step*1.384).rgb+texture2D(map,vUv-step*1.384).rgb)*.316;c+=(texture2D(map,vUv+step*3.230).rgb+texture2D(map,vUv-step*3.230).rgb)*.070;gl_FragColor=vec4(c,1.);}`,
      { map: { value: null }, step: { value: new THREE.Vector2() } },
    );
    this.mix = pass(
      `uniform sampler2D map;uniform sampler2D glow;uniform float strength;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(map,vUv).rgb+texture2D(glow,vUv).rgb*strength,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
      { map: { value: null }, glow: { value: null }, strength: { value: 0.8 } },
    );
    this.mix.toneMapped = true;
    this.quad.frustumCulled = false;
    this.post = new THREE.Scene();
    this.post.add(this.quad);
  }
  setSize(w, h) {
    this.scene.setSize(w, h);
    const hw = Math.max(1, w >> 1),
      hh = Math.max(1, h >> 1);
    this.a.setSize(hw, hh);
    this.b.setSize(hw, hh);
    this.texel = [1 / hw, 1 / hh];
  }
  draw(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.post, this.camera);
  }
  render(scene, camera, strength = 0.8) {
    const r = this.renderer;
    r.setRenderTarget(this.scene);
    r.render(scene, camera);
    this.bright.uniforms.map.value = this.scene.texture;
    this.draw(this.bright, this.a);
    for (const s of [1, 2]) {
      this.blur.uniforms.map.value = this.a.texture;
      this.blur.uniforms.step.value.set(this.texel[0] * s, 0);
      this.draw(this.blur, this.b);
      this.blur.uniforms.map.value = this.b.texture;
      this.blur.uniforms.step.value.set(0, this.texel[1] * s);
      this.draw(this.blur, this.a);
    }
    this.mix.uniforms.map.value = this.scene.texture;
    this.mix.uniforms.glow.value = this.a.texture;
    this.mix.uniforms.strength.value = strength;
    this.draw(this.mix, null);
  }
  dispose() {
    for (const t of [this.scene, this.a, this.b]) t.dispose();
  }
}
