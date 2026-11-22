import * as THREE from 'three/webgpu';
import { PALETTE } from '../rendering/Palette.ts';
import { createPastelMaterial, createUnlitPastelFXMaterial } from '../rendering/StorybookMaterial.ts';
import { extrudeShape, mergeParts, smoothSphere, transformGeo } from '../geometry/Sculptor.ts';
import type { WorldFX } from '../rendering/WorldFX.ts';
import type { AcousticSoundtrack } from '../audio/AcousticSoundtrack.ts';

const RELIC_COORDINATES: ReadonlyArray<readonly [number, number, number]> = [
  [-29.0, 23.5, 52.0], // 1. Outside Atelier East Window
  [48.0, 26.5, 48.0],  // 2. Above NE Fountain Plume
  [88.0, 29.8, 86.0],  // 3. Above NE Copper Gazebo Cupola
  [-44.0, 3.2, -54.0], // 4. Under SW Canal Stone Arch Bridge
  [-68.0, 44.0, -28.0], // 5. Above SW Painter's Balcony
  [104.0, 56.0, -58.0], // 6. Above SE Roastery Chimney Thermal
  [96.0, 140.5, -96.0], // 7. Above SE Clocktower Spire Finial
];

const PICKUP_RADIUS_SQ = 2.55 * 2.55;

interface RelicNode {
  root: THREE.Group;
  ring: THREE.Mesh;
  basePos: THREE.Vector3;
  phase: number;
  collected: boolean;
}

/**
 * 7 Bespoke Collectible Starlight Feathers ("Yıldız Tüyleri") placed in verified
 * aerial landmarks across all 4 European blocks. Collecting all 7 unlocks the
 * golden-turquoise "Gökyüzü Efsanesi" (Sky Legend) wing aura.
 */
export class StarlightRelics {
  private readonly group = new THREE.Group();
  private readonly nodes: RelicNode[] = [];
  private collectedCount = 0;

  constructor(
    scene: THREE.Scene,
    private readonly fx: WorldFX,
    private readonly audio: AcousticSoundtrack
  ) {
    scene.add(this.group);

    // Build shared sculpted feather-star beacon geometry
    const featherShape = new THREE.Shape();
    featherShape.moveTo(0, 0.72);
    featherShape.bezierCurveTo(0.24, 0.42, 0.26, -0.24, 0, -0.72);
    featherShape.bezierCurveTo(-0.26, -0.24, -0.24, 0.42, 0, 0.72);

    const quillGeo = extrudeShape(featherShape, 0.06, 0.02, PALETTE.eymenSaffron, 8, {
      topLift: 0.14,
      bottomAO: 0.08,
    });
    const gemGeo = transformGeo(smoothSphere(0.18, PALETTE.eymenTurquoise, 12, 10), {
      pos: [0, 0.04, 0],
    });
    const relicGeo = mergeParts([quillGeo, gemGeo]);
    relicGeo.computeBoundingSphere();

    const relicMat = createPastelMaterial({
      vertexColors: true,
      rimStrength: 0.15,
      emissiveHex: PALETTE.eymenSaffron,
      emissiveIntensity: 0.42,
      side: THREE.DoubleSide,
    });

    const ringGeo = new THREE.TorusGeometry(0.95, 0.042, 8, 28);
    ringGeo.deleteAttribute('uv');
    const ringMat = createUnlitPastelFXMaterial(PALETTE.eymenTurquoise, 0.72, true);

    for (let i = 0; i < RELIC_COORDINATES.length; i++) {
      const [rx, ry, rz] = RELIC_COORDINATES[i];
      const root = new THREE.Group();
      root.position.set(rx, ry, rz);

      const coreMesh = new THREE.Mesh(relicGeo, relicMat);
      coreMesh.castShadow = false;
      coreMesh.receiveShadow = false;

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.38;

      root.add(coreMesh, ring);
      this.group.add(root);

      this.nodes.push({
        root,
        ring,
        basePos: new THREE.Vector3(rx, ry, rz),
        phase: i * 0.9,
        collected: false,
      });
    }
  }

  public getCollectedCount(): number {
    return this.collectedCount;
  }

  public getTotalCount(): number {
    return this.nodes.length;
  }

  public update(
    dt: number,
    elapsed: number,
    birdPos: THREE.Vector3,
    onCollected?: (found: number, total: number, isLegendComplete: boolean) => void
  ): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.collected) continue;

      const bob = Math.sin(elapsed * 2.4 + node.phase) * 0.32;
      node.root.position.y = node.basePos.y + bob;
      node.root.rotation.y += dt * 1.45;
      node.ring.rotation.z += dt * 2.1;

      if (birdPos.distanceToSquared(node.root.position) <= PICKUP_RADIUS_SQ) {
        node.collected = true;
        node.root.visible = false;
        this.collectedCount += 1;

        this.fx.spawnChirpRing(node.root.position, PALETTE.eymenTurquoise, 8.5);
        this.fx.spawnChirpRing(node.root.position, PALETTE.eymenSaffron, 5.8);
        this.fx.spawnBurst(node.root.position, 14, true, 5.0);
        this.audio.playRelicCollect(this.collectedCount);

        const isComplete = this.collectedCount >= this.nodes.length;
        if (isComplete) {
          this.audio.playVignetteBloom();
        }
        onCollected?.(this.collectedCount, this.nodes.length, isComplete);
      }
    }
  }
}
