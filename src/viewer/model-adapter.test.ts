import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { directionFor, floorLevelsOf, fovForZoom, isWalkable } from './model-adapter';
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
describe('3D walkthrough helpers', () => {
  it('maps zoom to the same field of view range as the panorama viewer', () => {
    expect(fovForZoom(0)).toBe(110); expect(fovForZoom(100)).toBe(30); expect(fovForZoom(50)).toBe(70);
    expect(fovForZoom(-20)).toBe(110); expect(fovForZoom(500)).toBe(30);
  });
  it('turns yaw and pitch degrees into a y-up look direction with yaw 0 facing -z and yaw 90 facing +x', () => {
    const ahead = directionFor(0, 0); expect(close(ahead.x, 0) && close(ahead.y, 0) && close(ahead.z, -1)).toBe(true);
    const right = directionFor(90, 0); expect(close(right.x, 1) && close(right.z, 0)).toBe(true);
    const up = directionFor(0, 90); expect(close(up.y, 1)).toBe(true);
    const down = directionFor(-90, -45); expect(down.x < 0 && down.y < 0 && close(down.z, 0)).toBe(true);
  });
  it('treats upward surfaces near a floor level as walkable, including rugs and the yard, but not walls or tables', () => {
    const levels = [0.02];
    expect(isWalkable(1, 0.02, levels)).toBe(true);
    expect(isWalkable(1, 0.05, levels)).toBe(true);
    expect(isWalkable(1, -0.3, levels)).toBe(true);
    expect(isWalkable(1, 0.76, levels)).toBe(false);
    expect(isWalkable(0, 0.02, levels)).toBe(false);
    expect(isWalkable(1, -1, levels)).toBe(false);
    expect(isWalkable(1, 3.02, [0.02, 3])).toBe(true);
  });
  it('derives floor levels from wide thin floor_* nodes and ignores floor lamps', () => {
    const root = new THREE.Group();
    const slab = (name: string, w: number, h: number, d: number, y: number) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d)); mesh.name = name; mesh.position.y = y; root.add(mesh); };
    slab('floor_foyer', 3, 0.02, 4, 0.01);
    slab('floor_living', 5, 0.02, 4, 0.01);
    slab('floor_lamp_shade', 0.4, 0.3, 0.4, 1.55);
    slab('floor_lamp_pole', 0.05, 1.4, 0.05, 0.8);
    expect(floorLevelsOf(root, -5)).toEqual([0.02]);
    expect(floorLevelsOf(new THREE.Group(), -5)).toEqual([-5]);
  });
});
