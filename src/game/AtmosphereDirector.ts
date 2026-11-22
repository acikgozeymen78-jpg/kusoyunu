import * as THREE from 'three/webgpu';
import { PALETTE } from '../rendering/Palette.ts';
import { storybookUniforms } from '../rendering/StorybookMaterial.ts';
import type { AtmospherePresetId } from '../i18n/Locale.ts';

interface AtmosphereSpec {
  skyZenith: number;
  skyMid: number;
  skyHorizon: number;
  fogDawn: number;
  fogGolden: number;
  sunColor: number;
  sunIntensity: number;
  sunHalo: number;
  sunCore: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  starIntensity: number;
  auroraIntensity: number;
  nightFillWeight: number;
}

const ATMOSPHERE_PRESETS: Record<AtmospherePresetId, AtmosphereSpec> = {
  dawn: {
    skyZenith: PALETTE.skyZenithDawn,
    skyMid: PALETTE.skyMidDawn,
    skyHorizon: PALETTE.skyHorizonDawn,
    fogDawn: PALETTE.fogDawn,
    fogGolden: PALETTE.fogGolden,
    sunColor: 0xfff2da,
    sunIntensity: 1.08,
    sunHalo: PALETTE.sunHalo,
    sunCore: PALETTE.sunCore,
    hemiSky: PALETTE.skyMidDawn,
    hemiGround: PALETTE.plazaWarmStone,
    hemiIntensity: 0.56,
    starIntensity: 0.0,
    auroraIntensity: 0.0,
    nightFillWeight: 0.0,
  },
  twilight: {
    skyZenith: PALETTE.twilightZenith,
    skyMid: PALETTE.twilightMid,
    skyHorizon: PALETTE.twilightHorizon,
    fogDawn: 0xd99e8a,
    fogGolden: 0xe3a77e,
    sunColor: 0xffc694,
    sunIntensity: 0.96,
    sunHalo: 0xffaa70,
    sunCore: 0xffe4b8,
    hemiSky: 0x8072a8,
    hemiGround: 0x8f6b64,
    hemiIntensity: 0.58,
    starIntensity: 0.55,
    auroraIntensity: 0.08,
    nightFillWeight: 0.45,
  },
  emerald: {
    skyZenith: 0x266b78,
    skyMid: 0x62b8a8,
    skyHorizon: 0xdef2dc,
    fogDawn: 0xd4ead8,
    fogGolden: 0xe2eed0,
    sunColor: 0xf7ffe6,
    sunIntensity: 1.06,
    sunHalo: 0xcff5cb,
    sunCore: 0xfffff0,
    hemiSky: 0x7bc2b2,
    hemiGround: 0x99a684,
    hemiIntensity: 0.60,
    starIntensity: 0.0,
    auroraIntensity: 0.16,
    nightFillWeight: 0.05,
  },
  aurora: {
    skyZenith: PALETTE.auroraZenith,
    skyMid: PALETTE.auroraMid,
    skyHorizon: PALETTE.auroraHorizon,
    fogDawn: 0x355c69,
    fogGolden: 0x416b73,
    sunColor: 0xd0efff,
    sunIntensity: 0.84,
    sunHalo: 0x7ef2d4,
    sunCore: 0xeffaff,
    hemiSky: 0x4c8ca6,
    hemiGround: 0x4d5a70,
    hemiIntensity: 0.64,
    starIntensity: 1.0,
    auroraIntensity: 1.0,
    nightFillWeight: 0.92,
  },
};

/**
 * Smoothly blends sky dome TSL uniforms, fog, and sun/hemisphere light colors across
 * bespoke atmospheric moods without recompiling WebGPU shaders or toggling `light.visible`.
 */
export class AtmosphereDirector {
  private activePreset: AtmospherePresetId = 'dawn';

  private readonly targetSkyZenith = new THREE.Color(PALETTE.skyZenithDawn);
  private readonly targetSkyMid = new THREE.Color(PALETTE.skyMidDawn);
  private readonly targetSkyHorizon = new THREE.Color(PALETTE.skyHorizonDawn);
  private readonly targetSunHalo = new THREE.Color(PALETTE.sunHalo);
  private readonly targetSunCore = new THREE.Color(PALETTE.sunCore);
  private readonly targetFogDawn = new THREE.Color(PALETTE.fogDawn);
  private readonly targetFogGolden = new THREE.Color(PALETTE.fogGolden);
  private readonly currentFogDawn = new THREE.Color(PALETTE.fogDawn);
  private readonly currentFogGolden = new THREE.Color(PALETTE.fogGolden);
  private readonly blendedFog = new THREE.Color(PALETTE.fogDawn);

  private readonly targetSunColor = new THREE.Color(0xfff2da);
  private readonly targetHemiSky = new THREE.Color(PALETTE.skyMidDawn);
  private readonly targetHemiGround = new THREE.Color(PALETTE.plazaWarmStone);

  private targetSunIntensity = 1.08;
  private currentSunIntensity = 1.08;
  private targetHemiIntensity = 0.56;
  private currentHemiIntensity = 0.56;
  private targetStars = 0.0;
  private targetAurora = 0.0;
  private targetNightFill = 0.0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly sunLight: THREE.DirectionalLight,
    private readonly hemiLight: THREE.HemisphereLight
  ) {}

  public getPreset(): AtmospherePresetId {
    return this.activePreset;
  }

  public setPreset(preset: AtmospherePresetId): void {
    this.activePreset = preset;
    const spec = ATMOSPHERE_PRESETS[preset];
    this.targetSkyZenith.setHex(spec.skyZenith);
    this.targetSkyMid.setHex(spec.skyMid);
    this.targetSkyHorizon.setHex(spec.skyHorizon);
    this.targetFogDawn.setHex(spec.fogDawn);
    this.targetFogGolden.setHex(spec.fogGolden);
    this.targetSunColor.setHex(spec.sunColor);
    this.targetSunIntensity = spec.sunIntensity;
    this.targetSunHalo.setHex(spec.sunHalo);
    this.targetSunCore.setHex(spec.sunCore);
    this.targetHemiSky.setHex(spec.hemiSky);
    this.targetHemiGround.setHex(spec.hemiGround);
    this.targetHemiIntensity = spec.hemiIntensity;
    this.targetStars = spec.starIntensity;
    this.targetAurora = spec.auroraIntensity;
    this.targetNightFill = spec.nightFillWeight;
  }

  public update(dt: number): void {
    const rate = Math.min(1, dt * 2.4);
    const awaken = Number(storybookUniforms.awakeningFactor.value) || 0;

    (storybookUniforms.skyZenithCol.value as THREE.Color).lerp(this.targetSkyZenith, rate);
    (storybookUniforms.skyMidCol.value as THREE.Color).lerp(this.targetSkyMid, rate);
    (storybookUniforms.skyHorizonCol.value as THREE.Color).lerp(this.targetSkyHorizon, rate);
    (storybookUniforms.sunHaloCol.value as THREE.Color).lerp(this.targetSunHalo, rate);
    (storybookUniforms.sunCoreCol.value as THREE.Color).lerp(this.targetSunCore, rate);

    const curStars = Number(storybookUniforms.starIntensity.value) || 0;
    const curAurora = Number(storybookUniforms.auroraIntensity.value) || 0;
    const curNight = Number(storybookUniforms.nightFillWeight.value) || 0;

    storybookUniforms.starIntensity.value = curStars + (this.targetStars - curStars) * rate;
    storybookUniforms.auroraIntensity.value = curAurora + (this.targetAurora - curAurora) * rate;
    storybookUniforms.nightFillWeight.value = curNight + (this.targetNightFill - curNight) * rate;

    this.currentFogDawn.lerp(this.targetFogDawn, rate);
    this.currentFogGolden.lerp(this.targetFogGolden, rate);
    this.blendedFog.copy(this.currentFogDawn).lerp(this.currentFogGolden, awaken * (1 - curNight * 0.7));

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.blendedFog);
    }
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(storybookUniforms.skyHorizonCol.value as THREE.Color);
    }

    this.sunLight.color.lerp(this.targetSunColor, rate);
    this.hemiLight.color.lerp(this.targetHemiSky, rate);
    this.hemiLight.groundColor.lerp(this.targetHemiGround, rate);

    this.currentSunIntensity += (this.targetSunIntensity - this.currentSunIntensity) * rate;
    this.currentHemiIntensity += (this.targetHemiIntensity - this.currentHemiIntensity) * rate;

    this.sunLight.intensity = this.currentSunIntensity + awaken * 0.14 * (1 - curNight * 0.65);
    this.hemiLight.intensity = this.currentHemiIntensity + awaken * 0.08 * (1 - curNight * 0.5);
  }
}
