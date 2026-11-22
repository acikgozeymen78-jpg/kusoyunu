import {
  onLocaleChange,
  strings,
  toggleLocale,
  type AtmospherePresetId,
  type PlumagePresetId,
  type WingTrailStyle,
} from '../i18n/Locale.ts';

const ATMOSPHERE_IDS: readonly AtmospherePresetId[] = ['dawn', 'twilight', 'emerald', 'aurora'];
const PLUMAGE_IDS: readonly PlumagePresetId[] = [
  'eymen_starlight',
  'emerald_saka',
  'phoenix_finch',
  'winter_pearl',
  'sparrow',
];
const TRAIL_IDS: readonly WingTrailStyle[] = ['stardust', 'emerald', 'petals', 'none'];

export interface BespokeDockCallbacks {
  onSelectAtmosphere: (id: AtmospherePresetId) => void;
  onSelectPlumage: (id: PlumagePresetId) => void;
  onSelectTrail: (id: WingTrailStyle) => void;
  onTriggerDash: () => void;
  onCapturePostcard: () => void;
  onToggleMute: () => boolean;
}

/**
 * Collapsible Storybook Atelier Dock ("Eymen'in Yıldız Atölyesi"):
 * - Hidden during indoor tutorial so onboarding stays focused
 * - Toggleable with `H` or the compact toggle button (auto-collapsed on mobile)
 * - Controls Sky Atmosphere, Bird Plumage, Wing Trail Aura, Starlight Dash (G), Postcard (P), Mute (M), and TR/EN
 * - Zero backdrop-filter blur over the WebGPU canvas, single-line buttons, safe DOM APIs only
 */
export class BespokeDock {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly toggleBtn: HTMLButtonElement;

  private readonly groupLabels: {
    sky: HTMLSpanElement;
    plumage: HTMLSpanElement;
    trail: HTMLSpanElement;
  };
  private readonly atmoBtns = new Map<AtmospherePresetId, HTMLButtonElement>();
  private readonly plumageBtns = new Map<PlumagePresetId, HTMLButtonElement>();
  private readonly trailBtns = new Map<WingTrailStyle, HTMLButtonElement>();

  private readonly dashBtn: HTMLButtonElement;
  private readonly photoBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly langBtn: HTMLButtonElement;

  private visible = false;
  private collapsed = false;
  private mobileMode = false;
  private muted = false;

  private activeAtmo: AtmospherePresetId = 'dawn';
  private activePlumage: PlumagePresetId = 'eymen_starlight';
  private activeTrail: WingTrailStyle = 'stardust';

  constructor(
    parent: HTMLElement,
    private readonly callbacks: BespokeDockCallbacks
  ) {
    this.root = document.createElement('div');
    this.root.className = 'bespoke-dock is-hidden';
    this.root.setAttribute('aria-hidden', 'true');

    // Guard pointer/touch events so interacting with the dock never triggers camera drag/pointer lock
    const stopEvent = (e: Event) => e.stopPropagation();
    this.root.addEventListener('mousedown', stopEvent);
    this.root.addEventListener('pointerdown', stopEvent);
    this.root.addEventListener('touchstart', stopEvent, { passive: true });
    this.root.addEventListener('click', stopEvent);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.type = 'button';
    this.toggleBtn.className = 'bespoke-toggle-btn';
    this.toggleBtn.addEventListener('click', () => {
      this.setCollapsed(!this.collapsed);
    });

    this.panel = document.createElement('div');
    this.panel.className = 'bespoke-panel';

    // 1. Sky Atmosphere selector group
    const skyLabel = document.createElement('span');
    skyLabel.className = 'bespoke-group-label';
    const skyGroup = this.buildChipGroup(skyLabel, ATMOSPHERE_IDS, (id) => {
      this.activeAtmo = id;
      this.syncActiveStates();
      this.callbacks.onSelectAtmosphere(id);
    }, this.atmoBtns);

    // 2. Bird Plumage selector group
    const plumageLabel = document.createElement('span');
    plumageLabel.className = 'bespoke-group-label';
    const plumageGroup = this.buildChipGroup(plumageLabel, PLUMAGE_IDS, (id) => {
      this.activePlumage = id;
      this.syncActiveStates();
      this.callbacks.onSelectPlumage(id);
    }, this.plumageBtns);

    // 3. Wing Trail selector group
    const trailLabel = document.createElement('span');
    trailLabel.className = 'bespoke-group-label';
    const trailGroup = this.buildChipGroup(trailLabel, TRAIL_IDS, (id) => {
      this.activeTrail = id;
      this.syncActiveStates();
      this.callbacks.onSelectTrail(id);
    }, this.trailBtns);

    this.groupLabels = { sky: skyLabel, plumage: plumageLabel, trail: trailLabel };

    // 4. Quick actions group
    const actionGroup = document.createElement('div');
    actionGroup.className = 'bespoke-actions';

    this.dashBtn = this.makeButton('bespoke-action-btn is-accent', () => {
      this.callbacks.onTriggerDash();
    });
    this.photoBtn = this.makeButton('bespoke-action-btn', () => {
      this.callbacks.onCapturePostcard();
    });
    this.muteBtn = this.makeButton('bespoke-action-btn', () => {
      this.setMuted(this.callbacks.onToggleMute());
    });
    this.langBtn = this.makeButton('bespoke-action-btn', () => {
      toggleLocale();
    });

    actionGroup.appendChild(this.dashBtn);
    actionGroup.appendChild(this.photoBtn);
    actionGroup.appendChild(this.muteBtn);
    actionGroup.appendChild(this.langBtn);

    this.panel.appendChild(skyGroup);
    this.panel.appendChild(plumageGroup);
    this.panel.appendChild(trailGroup);
    this.panel.appendChild(actionGroup);

    this.root.appendChild(this.panel);
    this.root.appendChild(this.toggleBtn);
    parent.appendChild(this.root);

    this.syncLabels();
    this.syncActiveStates();
    onLocaleChange(() => this.syncLabels());

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'KeyH' && this.visible) {
        e.preventDefault();
        this.setCollapsed(!this.collapsed);
      } else if (e.code === 'KeyP' && this.visible) {
        e.preventDefault();
        this.callbacks.onCapturePostcard();
      }
    });
  }

  private makeButton(className: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private buildChipGroup<T extends string>(
    labelEl: HTMLSpanElement,
    ids: readonly T[],
    onSelect: (id: T) => void,
    store: Map<T, HTMLButtonElement>
  ): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.className = 'bespoke-group';
    wrap.appendChild(labelEl);

    const row = document.createElement('div');
    row.className = 'bespoke-chip-row';
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const btn = this.makeButton('bespoke-chip', () => onSelect(id));
      store.set(id, btn);
      row.appendChild(btn);
    }
    wrap.appendChild(row);
    return wrap;
  }

  private syncLabels(): void {
    const d = strings().dock;
    this.toggleBtn.textContent = this.collapsed ? d.showControls : d.hideControls;
    this.groupLabels.sky.textContent = d.atmosphereLabel;
    this.groupLabels.plumage.textContent = d.plumageLabel;
    this.groupLabels.trail.textContent = d.trailLabel;

    this.atmoBtns.forEach((btn, id) => {
      btn.textContent = d.atmospheres[id];
    });
    this.plumageBtns.forEach((btn, id) => {
      btn.textContent = d.plumages[id];
    });
    this.trailBtns.forEach((btn, id) => {
      btn.textContent = d.trails[id];
    });

    this.dashBtn.textContent = this.mobileMode ? d.dashBtn : `${d.dashBtn} (G)`;
    this.photoBtn.textContent = this.mobileMode ? d.photoBtn : `${d.photoBtn} (P)`;
    this.muteBtn.textContent = this.muted ? d.unmuteBtn : d.muteBtn;
    this.langBtn.textContent = d.langBtn;
  }

  private syncActiveStates(): void {
    this.atmoBtns.forEach((btn, id) => {
      btn.classList.toggle('is-active', id === this.activeAtmo);
      btn.setAttribute('aria-pressed', id === this.activeAtmo ? 'true' : 'false');
    });
    this.plumageBtns.forEach((btn, id) => {
      btn.classList.toggle('is-active', id === this.activePlumage);
      btn.setAttribute('aria-pressed', id === this.activePlumage ? 'true' : 'false');
    });
    this.trailBtns.forEach((btn, id) => {
      btn.classList.toggle('is-active', id === this.activeTrail);
      btn.setAttribute('aria-pressed', id === this.activeTrail ? 'true' : 'false');
    });
  }

  public setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    this.root.classList.toggle('is-hidden', !visible);
    this.root.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  public setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.root.classList.toggle('is-collapsed', collapsed);
    this.toggleBtn.textContent = collapsed ? strings().dock.showControls : strings().dock.hideControls;
    this.toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  public setMobileMode(isMobile: boolean): void {
    this.mobileMode = isMobile;
    this.root.classList.toggle('is-mobile', isMobile);
    if (isMobile) {
      this.setCollapsed(true);
    }
    this.syncLabels();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.muteBtn.textContent = muted ? strings().dock.unmuteBtn : strings().dock.muteBtn;
  }
}
