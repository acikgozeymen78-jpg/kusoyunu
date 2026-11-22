import type { SparrowDeedId } from '../ui/SparrowJournalHUD.ts';

export type LocaleCode = 'tr' | 'en';
export type AtmospherePresetId = 'dawn' | 'twilight' | 'emerald' | 'aurora';
export type PlumagePresetId =
  | 'eymen_starlight'
  | 'emerald_saka'
  | 'phoenix_finch'
  | 'winter_pearl'
  | 'sparrow';
export type WingTrailStyle = 'stardust' | 'emerald' | 'petals' | 'none';

let currentLocale: LocaleCode = 'tr';
const listeners = new Set<(locale: LocaleCode) => void>();

export function getLocale(): LocaleCode {
  return currentLocale;
}

export function setLocale(next: LocaleCode): void {
  if (currentLocale === next) return;
  currentLocale = next;
  listeners.forEach((fn) => fn(next));
}

export function toggleLocale(): LocaleCode {
  const next: LocaleCode = currentLocale === 'tr' ? 'en' : 'tr';
  setLocale(next);
  return next;
}

export function onLocaleChange(fn: (locale: LocaleCode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface LocaleStrings {
  appTitle: string;
  loadingDedication: string;
  loadingStatus: string;
  startButton: string;
  journalAriaLabelDesktop: string;
  journalAriaLabelMobile: string;
  coronationToast: string;
  relicFoundToast: (found: number, total: number) => string;
  relicLegendToast: string;
  postcardSavedToast: string;
  deeds: Record<SparrowDeedId, string>;
  tutorial: {
    click: string;
    space: string;
    drag: string;
    move: string;
    tap: string;
    hop: string;
    toCageDoor: string;
    doubleTap: string;
    fly: string;
    steer: string;
    toWindow: string;
  };
  dock: {
    showControls: string;
    hideControls: string;
    atmosphereLabel: string;
    plumageLabel: string;
    trailLabel: string;
    dashBtn: string;
    photoBtn: string;
    muteBtn: string;
    unmuteBtn: string;
    langBtn: string;
    atmospheres: Record<AtmospherePresetId, string>;
    plumages: Record<PlumagePresetId, string>;
    trails: Record<WingTrailStyle, string>;
  };
}

export const LOCALE_STRINGS: Record<LocaleCode, LocaleStrings> = {
  tr: {
    appTitle: "Eymen'in Yıldız Serçesi",
    loadingDedication: 'Eymen için özel tasarım · Yıldız Atölyesi',
    loadingStatus: 'HAZIRLANIYOR',
    startButton: 'UÇUŞA BAŞLA',
    journalAriaLabelDesktop: 'Görev Defterini Aç/Kapat (J Tuşu)',
    journalAriaLabelMobile: 'Görev Defterini Aç/Kapat',
    coronationToast: 'Mahallenin Taçlı Yıldızı!',
    relicFoundToast: (found, total) => `Yıldız Tüyü Bulundu (${found}/${total})`,
    relicLegendToast: 'Gökyüzü Efsanesi Açıldı!',
    postcardSavedToast: 'Hatıra Kartpostalı Kaydedildi',
    deeds: {
      croissant_heist: 'Fırından sıcacık bir kruvasan aşır',
      coffee_bowling: 'Kafe masasındaki dev kahve bardağını devir',
      sleepy_sugar: 'Uykulu yolcunun kupasına bir küp şeker bırak',
      pigeon_scatter: 'Süzül veya ötüş yapıp çeşme güvercinlerini dağıt',
      picnic_raid: 'Çardaktaki hasır piknik sepetini gagalayıp aç',
      busker_coins: 'Sokak müzisyeninin gitar kutusuna 3 parlak para at',
      canal_prank: 'Klasik bisiklet zilini çal veya dondurma külahını devir',
      painter_muse: 'Balkon ressamına gözlüğünü ve 2 çiçek getir',
      apple_avalanche: 'Manav tezgahındaki elma piramidini yık',
      music_box: 'Kitapçı terasındaki müzik kutusunu pirinç anahtarla kur',
      belfry_bell: 'Saat kulesinin tepesindeki büyük bronz çanı çal',
      sky_sanctuary: 'Saat kulesi gökyüzü yuvasına 4 hazine ör',
    },
    tutorial: {
      click: 'TIKLA',
      space: 'BOŞLUK',
      drag: 'SÜRÜKLE',
      move: 'Yürü',
      tap: 'DOKUN',
      hop: 'Zıpla',
      toCageDoor: 'Kafes Kapısına',
      doubleTap: 'ÇİFT DOKUN',
      fly: 'Uç',
      steer: 'Yönlendir',
      toWindow: 'Pencereye Uç',
    },
    dock: {
      showControls: 'Atölye',
      hideControls: 'Gizle (H)',
      atmosphereLabel: 'Gökyüzü',
      plumageLabel: 'Tüy',
      trailLabel: 'Kanat İzi',
      dashBtn: 'Takviye',
      photoBtn: 'Kartpostal',
      muteBtn: 'Sessiz',
      unmuteBtn: 'Ses Aç',
      langBtn: 'TR / EN',
      atmospheres: {
        dawn: 'Boğaz Şafağı',
        twilight: 'Alacakaranlık',
        emerald: 'Zümrüt Bahar',
        aurora: 'Gece Aurora',
      },
      plumages: {
        eymen_starlight: 'Yıldız · Eymen',
        emerald_saka: 'Zümrüt Saka',
        phoenix_finch: 'Ateş Kuşu',
        winter_pearl: 'Kar Tanesi',
        sparrow: 'Klasik Serçe',
      },
      trails: {
        stardust: 'Yıldız Tozu',
        emerald: 'Zümrüt',
        petals: 'Yaprak',
        none: 'Kapalı',
      },
    },
  },
  en: {
    appTitle: "Eymen's Starlight Sparrow",
    loadingDedication: 'Crafted Exclusively for Eymen · Starlight Atelier',
    loadingStatus: 'PREPARING FLIGHT',
    startButton: 'TAKE FLIGHT',
    journalAriaLabelDesktop: 'Toggle Deeds List (Key J)',
    journalAriaLabelMobile: 'Toggle Deeds List',
    coronationToast: 'Crown of the Neighborhood!',
    relicFoundToast: (found, total) => `Starlight Feather Found (${found}/${total})`,
    relicLegendToast: 'Sky Legend Unlocked!',
    postcardSavedToast: 'Postcard Snapshot Saved',
    deeds: {
      croissant_heist: 'Snatch a warm croissant from the boulangerie',
      coffee_bowling: 'Bowl a giant to-go coffee cup off a bistro table',
      sleepy_sugar: "Drop a sugar cube into the drowsy commuter's mug",
      pigeon_scatter: 'Swoop or chirp to scatter the fountain pigeon flock',
      picnic_raid: 'Peck open the wicker picnic basket in the gazebo',
      busker_coins: "Toss 3 shiny coins into the busker's guitar case",
      canal_prank: 'Ring a vintage bicycle bell or topple a gelato cone',
      painter_muse: 'Bring glasses & 2 blossoms to the balcony painter',
      apple_avalanche: "Topple the fruit vendor's stacked apple pyramid",
      music_box: 'Wind the bookshop music box with the brass key',
      belfry_bell: 'Peck the great bronze bell atop the clocktower',
      sky_sanctuary: 'Weave 4 treasures into the Clocktower Sky Nest',
    },
    tutorial: {
      click: 'CLICK',
      space: 'SPACE',
      drag: 'DRAG',
      move: 'Move',
      tap: 'TAP',
      hop: 'Hop',
      toCageDoor: 'To Cage Door',
      doubleTap: 'DOUBLE-TAP',
      fly: 'Fly',
      steer: 'Steer',
      toWindow: 'To Window',
    },
    dock: {
      showControls: 'Atelier',
      hideControls: 'Hide (H)',
      atmosphereLabel: 'Sky',
      plumageLabel: 'Plumage',
      trailLabel: 'Wing Trail',
      dashBtn: 'Star Dash',
      photoBtn: 'Postcard',
      muteBtn: 'Mute',
      unmuteBtn: 'Unmute',
      langBtn: 'TR / EN',
      atmospheres: {
        dawn: 'Golden Dawn',
        twilight: 'Amber Twilight',
        emerald: 'Emerald Breeze',
        aurora: 'Midnight Aurora',
      },
      plumages: {
        eymen_starlight: 'Starlight · Eymen',
        emerald_saka: 'Emerald Finch',
        phoenix_finch: 'Phoenix Crest',
        winter_pearl: 'Winter Pearl',
        sparrow: 'Classic Sparrow',
      },
      trails: {
        stardust: 'Stardust',
        emerald: 'Emerald',
        petals: 'Blossom',
        none: 'Off',
      },
    },
  },
};

export function strings(): LocaleStrings {
  return LOCALE_STRINGS[currentLocale];
}
