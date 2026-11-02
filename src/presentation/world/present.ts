import { Geometry, Mesh, Shader, UniformGroup, type Texture } from 'pixi.js';
import type { Grade } from './grade';

const vertex = /* glsl */ `
  in vec2 aPosition;
  in vec2 aUV;
  out vec2 vUV;
  void main() {
    vUV = aUV;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// Sharp-bilinear keeps pixels square at fractional scales and lets the lens
// glide smoothly over the low-res frame. Grading happens here so the whole
// stage takes the same light, and the light texture "restores" lit areas.
const fragment = /* glsl */ `
  precision highp float;
  in vec2 vUV;
  out vec4 finalColor;
  uniform sampler2D uWorld;
  uniform sampler2D uLight;
  uniform vec2 uTexSize;
  uniform float uPixelScale;
  uniform vec3 uLens;
  uniform vec3 uMul;
  uniform vec3 uLift;
  uniform float uSat;
  uniform vec3 uFog;

  void main() {
    vec2 uv = uLens.xy + vUV * uLens.z;
    vec2 texel = uv * uTexSize;
    vec2 whole = floor(texel);
    // Hold each texel's centre across most of its area, and blend only in the
    // final screen pixel before its neighbour.
    float scale = uPixelScale / uLens.z;
    vec2 region = vec2(0.5 - 0.5 / scale);
    vec2 fr = fract(texel) - 0.5;
    vec2 f = (fr - clamp(fr, -region, region)) * scale + 0.5;
    vec2 suv = (whole + f) / uTexSize;

    vec3 c = texture(uWorld, suv).rgb;
    vec3 l = texture(uLight, uv).rgb;

    float luma = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 g = mix(vec3(luma), c, uSat) * uMul + uLift * (1.0 - luma);
    float lit = clamp(max(l.r, max(l.g, l.b)) * 1.5, 0.0, 1.0);
    vec3 warm = c * (1.0 + l * 0.25);
    vec3 col = mix(g, warm, lit) + l * 0.05;

    // Fog hangs low over the set.
    float fogAmount = uFog.x * (0.55 + 0.45 * sin(uv.y * 9.0 + uFog.y));
    col = mix(col, vec3(0.78, 0.82, 0.8) * (uMul * 0.5 + 0.5), clamp(fogAmount, 0.0, 0.7));

    // A soft stage vignette.
    vec2 d = (vUV - 0.5) * vec2(1.05, 1.0);
    col *= 1.0 - smoothstep(0.42, 0.95, length(d)) * 0.38;
    finalColor = vec4(col, 1.0);
  }
`;

export class Presenter {
  readonly mesh: Mesh<Geometry, Shader>;
  private uniforms: UniformGroup;
  private shader: Shader;

  constructor(world: Texture, light: Texture) {
    const geometry = new Geometry({
      attributes: {
        aPosition: [-1, -1, 1, -1, 1, 1, -1, 1],
        aUV: [0, 1, 1, 1, 1, 0, 0, 0],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    this.uniforms = new UniformGroup({
      uTexSize: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
      uPixelScale: { value: 1, type: 'f32' },
      uLens: { value: new Float32Array([0, 0, 1]), type: 'vec3<f32>' },
      uMul: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
      uLift: { value: new Float32Array([0, 0, 0]), type: 'vec3<f32>' },
      uSat: { value: 1, type: 'f32' },
      uFog: { value: new Float32Array([0, 0, 0]), type: 'vec3<f32>' },
    });
    this.shader = Shader.from({
      gl: { vertex, fragment },
      resources: {
        uWorld: world.source,
        uLight: light.source,
        frame: this.uniforms,
      },
    });
    this.mesh = new Mesh({ geometry, shader: this.shader });
  }

  setTextures(world: Texture, light: Texture) {
    this.shader.resources.uWorld = world.source;
    this.shader.resources.uLight = light.source;
  }

  update(size: [number, number], pixelScale: number, lens: [number, number, number], grade: Grade, fog: number, time: number) {
    const u = this.uniforms.uniforms;
    (u.uTexSize as Float32Array).set(size);
    u.uPixelScale = pixelScale;
    (u.uLens as Float32Array).set(lens);
    (u.uMul as Float32Array).set(grade.mul);
    (u.uLift as Float32Array).set(grade.lift);
    u.uSat = grade.sat;
    (u.uFog as Float32Array).set([fog, time * 0.1, 0]);
    this.uniforms.update();
  }
}
