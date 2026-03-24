
import * as PIXI from 'pixi.js';

const fragment = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uIntensity;
uniform vec2 uMouse;

// Helper: HSB to RGB conversion
vec3 hsb2rgb(in vec3 c){
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    // Only apply effect to non-transparent pixels
    if (color.a > 0.0) {
        // Calculate coordinate relative to mouse to simulate light angle
        vec2 coord = vTextureCoord;
        coord.x += (uMouse.x * 0.2); 
        coord.y += (uMouse.y * 0.2);

        // Create diagonal bands
        float p = coord.x * 2.0 + coord.y * 1.0;
        
        // Add movement
        p -= uTime * 0.5;
        
        // Generate Rainbow
        // Hue cycles based on position, Saturation 0.4 (pastel), Brightness 1.0
        vec3 rainbow = hsb2rgb(vec3(p, 0.4, 1.0));
        
        // Specular highlight (thin bright line)
        float sheen = step(0.9, fract(p * 3.0)) * 0.5;
        
        // Combine: Original Color + (Rainbow * Intensity) + Sheen
        // We use screen blending logic for the foil
        vec3 foil = color.rgb + (rainbow * uIntensity * 0.5) + (sheen * uIntensity);
        
        gl_FragColor = vec4(foil, color.a);
    } else {
        gl_FragColor = color;
    }
}
`;

export class HoloFilter extends PIXI.Filter {
    constructor() {
        // Adapted for PIXI v8 signature which expects a single options object
        super({
            gl: { fragment },
            resources: {
                uTime: 0.0,
                uIntensity: 0.0,
                uMouse: new PIXI.Point(0, 0)
            }
        });
    }

    get time(): number {
        return (this as any).resources.uTime;
    }
    set time(value: number) {
        (this as any).resources.uTime = value;
    }

    get intensity(): number {
        return (this as any).resources.uIntensity;
    }
    set intensity(value: number) {
        (this as any).resources.uIntensity = value;
    }

    get mouse(): PIXI.Point {
        return (this as any).resources.uMouse;
    }
    set mouse(value: PIXI.Point) {
        (this as any).resources.uMouse = value;
    }
}
