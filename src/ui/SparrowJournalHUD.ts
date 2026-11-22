import { onLocaleChange, strings } from '../i18n/Locale.ts';

export type SparrowDeedId =
  | 'croissant_heist'
  | 'coffee_bowling'
  | 'sleepy_sugar'
  | 'pigeon_scatter'
  | 'picnic_raid'
  | 'busker_coins'
  | 'canal_prank'
  | 'painter_muse'
  | 'apple_avalanche'
  | 'music_box'
  | 'belfry_bell'
  | 'sky_sanctuary';

export interface SparrowDeedDef {
  id: SparrowDeedId;
}

export const SPARROW_DEEDS: readonly SparrowDeedDef[] = [
  { id: 'croissant_heist' },
  { id: 'coffee_bowling' },
  { id: 'sleepy_sugar' },
  { id: 'pigeon_scatter' },
  { id: 'picnic_raid' },
  { id: 'busker_coins' },
  { id: 'canal_prank' },
  { id: 'painter_muse' },
  { id: 'apple_avalanche' },
  { id: 'music_box' },
  { id: 'belfry_bell' },
  { id: 'sky_sanctuary' },
];

interface CachedDeedRow {
  li: HTMLLIElement;
  check: HTMLSpanElement;
  labelEl: HTMLSpanElement;
}

/**
 * Compact French-postcard Mischief, Deeds & Starlight Relics HUD with TR/EN live switching.
 * Hidden during the indoor tutorial so onboarding shows only key prompts.
 * Built with safe DOM APIs (createElement, textContent; no innerHTML).
 */
export class SparrowJournalHUD {
  private readonly root: HTMLDivElement;
  private readonly pillBtn: HTMLButtonElement;
  private readonly seedCountEl: HTMLSpanElement;
  private readonly relicCountEl: HTMLSpanElement;
  private readonly deedCountEl: HTMLSpanElement;
  private readonly keyCapEl: HTMLElement;
  private readonly cardEl: HTMLDivElement;
  private readonly toastHost: HTMLDivElement;

  private readonly rowElements = new Map<SparrowDeedId, CachedDeedRow>();
  private readonly completed = new Set<SparrowDeedId>();
  private expanded = false;
  private visible = false;
  private mobileMode = false;
  public onToggleMute?: () => boolean;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'journal-hud is-hidden';
    this.root.setAttribute('aria-hidden', 'true');

    const topBar = document.createElement('div');
    topBar.className = 'journal-top-bar';

    // Top-left compact interactive button pill
    this.pillBtn = document.createElement('button');
    this.pillBtn.type = 'button';
    this.pillBtn.className = 'journal-pill';
    this.pillBtn.setAttribute('aria-expanded', 'false');
    this.pillBtn.setAttribute('aria-label', strings().journalAriaLabelDesktop);

    const seedWrap = document.createElement('span');
    seedWrap.className = 'journal-stat';
    const seedDot = document.createElement('span');
    seedDot.className = 'journal-seed-dot';
    seedDot.setAttribute('aria-hidden', 'true');
    this.seedCountEl = document.createElement('span');
    this.seedCountEl.textContent = '0';
    seedWrap.appendChild(seedDot);
    seedWrap.appendChild(this.seedCountEl);

    const dividerA = document.createElement('span');
    dividerA.className = 'journal-sep';
    dividerA.setAttribute('aria-hidden', 'true');
    dividerA.textContent = '·';

    const relicWrap = document.createElement('span');
    relicWrap.className = 'journal-stat journal-relic-stat';
    const relicStar = document.createElement('span');
    relicStar.className = 'journal-relic-star';
    relicStar.setAttribute('aria-hidden', 'true');
    relicStar.textContent = '✦';
    this.relicCountEl = document.createElement('span');
    this.relicCountEl.textContent = '0 / 7';
    relicWrap.appendChild(relicStar);
    relicWrap.appendChild(this.relicCountEl);

    const dividerB = document.createElement('span');
    dividerB.className = 'journal-sep';
    dividerB.setAttribute('aria-hidden', 'true');
    dividerB.textContent = '·';

    this.deedCountEl = document.createElement('span');
    this.deedCountEl.className = 'journal-stat';
    this.deedCountEl.textContent = `0 / ${SPARROW_DEEDS.length}`;

    this.keyCapEl = document.createElement('kbd');
    this.keyCapEl.className = 'journal-tab-key';
    this.keyCapEl.textContent = 'J';

    this.pillBtn.appendChild(seedWrap);
    this.pillBtn.appendChild(dividerA);
    this.pillBtn.appendChild(relicWrap);
    this.pillBtn.appendChild(dividerB);
    this.pillBtn.appendChild(this.deedCountEl);
    this.pillBtn.appendChild(this.keyCapEl);

    let lastPillTouchToggleMs = 0;
    this.pillBtn.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        lastPillTouchToggleMs = performance.now();
        this.setExpanded(!this.expanded);
      },
      { passive: false }
    );
    this.pillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (performance.now() - lastPillTouchToggleMs < 450) return;
      this.setExpanded(!this.expanded);
    });

    topBar.appendChild(this.pillBtn);

    // Expandable Postcard Checklist (one row per deed)
    this.cardEl = document.createElement('div');
    this.cardEl.className = 'journal-card';
    this.cardEl.setAttribute('aria-hidden', 'true');
    this.cardEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    this.cardEl.addEventListener('click', (e) => e.stopPropagation());

    const list = document.createElement('ul');
    list.className = 'journal-list';
    const initialDeeds = strings().deeds;

    for (const deed of SPARROW_DEEDS) {
      const li = document.createElement('li');
      li.className = 'journal-item';

      const check = document.createElement('span');
      check.className = 'journal-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '';

      const text = document.createElement('span');
      text.className = 'journal-label';
      text.textContent = initialDeeds[deed.id];

      li.appendChild(check);
      li.appendChild(text);
      list.appendChild(li);
      this.rowElements.set(deed.id, { li, check, labelEl: text });
    }

    this.cardEl.appendChild(list);
    this.root.appendChild(topBar);
    this.root.appendChild(this.cardEl);
    parent.appendChild(this.root);

    // Celebratory completion toast container (top-right, screen-reader polite live region)
    this.toastHost = document.createElement('div');
    this.toastHost.className = 'journal-toast-host';
    this.toastHost.setAttribute('role', 'status');
    this.toastHost.setAttribute('aria-live', 'polite');
    parent.appendChild(this.toastHost);

    onLocaleChange(() => {
      this.syncLocaleLabels();
    });

    window.addEventListener('pointerdown', (e) => {
      if (!this.expanded) return;
      if (e.target instanceof Element && e.target.closest('.journal-hud')) return;
      this.setExpanded(false);
    });

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'KeyJ' && this.visible) {
        e.preventDefault();
        this.setExpanded(!this.expanded);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.onToggleMute?.();
      }
    });
  }

  private syncLocaleLabels(): void {
    const s = strings();
    this.pillBtn.setAttribute(
      'aria-label',
      this.mobileMode ? s.journalAriaLabelMobile : s.journalAriaLabelDesktop
    );
    this.rowElements.forEach((row, id) => {
      row.labelEl.textContent = s.deeds[id];
    });
  }

  public setMobileMode(isMobile: boolean): void {
    this.mobileMode = isMobile;
    this.root.classList.toggle('is-mobile', isMobile);
    this.keyCapEl.style.display = isMobile ? 'none' : '';
    const s = strings();
    this.pillBtn.setAttribute(
      'aria-label',
      isMobile ? s.journalAriaLabelMobile : s.journalAriaLabelDesktop
    );
  }

  public isMobileMode(): boolean {
    return this.mobileMode;
  }

  public setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    this.root.classList.toggle('is-hidden', !visible);
    this.root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (!visible && this.expanded) {
      this.setExpanded(false);
    }
  }

  public setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.root.classList.toggle('is-expanded', expanded);
    this.pillBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    this.cardEl.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  }

  public setSeedsCount(count: number): void {
    this.seedCountEl.textContent = String(count);
  }

  public setRelicsCount(found: number, total: number): void {
    this.relicCountEl.textContent = `${found} / ${total}`;
  }

  public getCompletedCount(): number {
    return this.completed.size;
  }

  public getTotalCount(): number {
    return SPARROW_DEEDS.length;
  }

  public isDeedCompleted(id: SparrowDeedId): boolean {
    return this.completed.has(id);
  }

  public completeDeed(id: SparrowDeedId): boolean {
    if (this.completed.has(id)) return false;
    this.completed.add(id);

    const row = this.rowElements.get(id);
    if (row) {
      row.li.classList.add('is-done');
      row.check.textContent = '✓';
    }

    this.deedCountEl.textContent = `${this.completed.size} / ${SPARROW_DEEDS.length}`;

    if (this.visible) {
      this.spawnToast('✓', strings().deeds[id], '');
    }
    return true;
  }

  public spawnCoronationToast(): void {
    if (!this.visible) return;
    this.spawnToast('♛', strings().coronationToast, 'is-royal', 3800);
  }

  public spawnRelicToast(found: number, total: number, isLegendComplete: boolean): void {
    const s = strings();
    const label = isLegendComplete ? s.relicLegendToast : s.relicFoundToast(found, total);
    this.spawnToast('✦', label, isLegendComplete ? 'is-royal' : 'is-star', 3400);
  }

  public spawnPostcardToast(): void {
    this.spawnToast('◈', strings().postcardSavedToast, 'is-star', 2800);
  }

  private spawnToast(
    glyph: string,
    label: string,
    extraClass = '',
    durationMs = 3100
  ): void {
    const toast = document.createElement('div');
    toast.className = extraClass ? `journal-toast ${extraClass}` : 'journal-toast';

    const stamp = document.createElement('span');
    stamp.className = 'journal-toast-stamp';
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = glyph;

    const title = document.createElement('span');
    title.className = 'journal-toast-label';
    title.textContent = label;

    toast.appendChild(stamp);
    toast.appendChild(title);
    this.toastHost.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => {
        toast.remove();
      }, 420);
    }, durationMs);
  }
}
