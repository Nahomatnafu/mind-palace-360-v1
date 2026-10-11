import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { directionFor, dragThresholdFor, floorLevelsOf, fovForZoom, isWalkable, pinchZoom, projectedMarkerSize } from './model-adapter';
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
describe('3D walkthrough helpers', () => {
  it('sizes 3D memories by perspective: half the size at twice the distance, clamped at the extremes', () => {
    const near = projectedMarkerSize(36, 2, 86, 844), far = projectedMarkerSize(36, 4, 86, 844);
    expect(near / far).toBeCloseTo(2, 5);
    expect(projectedMarkerSize(36, 2, 86, 844)).toBeCloseTo(0.36 * (844 / (2 * Math.tan(43 * Math.PI / 180))) / 2, 5);
    expect(projectedMarkerSize(36, 500, 86, 844)).toBe(8);
    expect(projectedMarkerSize(128, 0.1, 86, 844)).toBe(320);
    expect(projectedMarkerSize(36, 0, 86, 844)).toBe(320);
  });
  it('zooms a pinch by the finger-distance ratio so the gesture feels the same at any pixel density', () => {
    expect(pinchZoom(35, 100, 100)).toBe(35);
    expect(pinchZoom(35, 100, 200)).toBe(95);
    expect(pinchZoom(35, 200, 400)).toBe(pinchZoom(35, 100, 200));
    expect(pinchZoom(35, 300, 600)).toBe(pinchZoom(35, 100, 200));
    expect(close(pinchZoom(50, 200, 100), 20)).toBe(true);
    expect(pinchZoom(35, 100, 110, 100)).toBeCloseTo(45, 6);
  });
  it('clamps pinch zoom to 0..100 and ignores degenerate distances', () => {
    expect(pinchZoom(90, 100, 300)).toBe(100);
    expect(pinchZoom(10, 300, 100)).toBe(0);
    expect(pinchZoom(42, 0, 120)).toBe(42);
    expect(pinchZoom(42, 120, 0)).toBe(42);
    expect(pinchZoom(42, NaN, 120)).toBe(42);
    expect(pinchZoom(NaN, 100, 120)).toBe(0);
    expect(pinchZoom(140, 100, 100)).toBe(100);
  });
  it('needs a longer drag before touch turns into look-around than a mouse or pen', () => {
    expect(dragThresholdFor('touch')).toBe(8);
    expect(dragThresholdFor('mouse')).toBe(5);
    expect(dragThresholdFor('pen')).toBe(5);
    expect(dragThresholdFor('')).toBe(5);
  });
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
