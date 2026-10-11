import { describe, expect, it } from 'vitest';
import { floorTransform } from './floor-transform';
const radians=(n:number)=>n*Math.PI/180;
const matrix=(yaw:number,pitch:number,viewYaw=yaw,viewPitch=0)=>floorTransform(radians(yaw),radians(pitch),radians(viewYaw),radians(viewPitch)).slice(7,-1).split(',').map(Number);
describe('horizontal floor projection',()=>{
 it('flattens a floor circle at an oblique angle',()=>{const [a,b,c,d]=matrix(0,-30);expect(a).toBe(1);expect(b).toBe(0);expect(c).toBe(0);expect(Math.abs(d)).toBeCloseTo(Math.tan(radians(30)),5);});
 it('looks circular straight down rather than staying a flat screen ellipse',()=>{const [a,b,c,d]=matrix(0,-90,0,-90);expect(Math.abs(a)).toBe(1);expect(Math.abs(d)).toBe(1);expect(b).toBe(0);expect(c).toBe(0);});
 it('changes skew when looking to the side and preserves the yaw seam',()=>{expect(matrix(30,-30,0,-20)[1]).not.toBe(0);expect(matrix(179,-30,-179,-20)).toEqual(matrix(-181,-30,-179,-20));});
 it('never returns a nonfinite transform at the horizon or behind the camera',()=>{for(const pitch of [-90,-1,0,90])for(const yaw of [-180,0,90])expect(floorTransform(radians(yaw),radians(pitch),0,0)).not.toMatch(/NaN|Infinity/);});
});
