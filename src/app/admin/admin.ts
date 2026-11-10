import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DESIGN_IDS,
  DESIGN_LABELS,
  type DesignId,
  type Lead,
  type Product,
  type Track,
  type TrackInput,
  BUILTIN_TRACKS,
  type ProductInput,
  SCREEN_LAYOUT_LABELS,
  SCREEN_LAYOUTS,
} from '../core/catalog.model';
import { Icon } from '../shared/icon';
import { adminApi, ApiError } from './admin-api';
import { Seo } from '../core/seo';

type Tab = 'produits' | 'presentation' | 'musique' | 'demandes';

interface Draft extends ProductInput {
  id: number | null;
  featuresText: string;
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink, Icon, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  protected readonly designs = DESIGN_IDS;
  protected readonly designLabels = DESIGN_LABELS;
  protected readonly layouts = SCREEN_LAYOUTS;
  protected readonly layoutLabels = SCREEN_LAYOUT_LABELS;

  protected readonly state = signal<'checking' | 'login' | 'ready'>('checking');
  protected readonly tab = signal<Tab>('produits');
  protected readonly products = signal<Product[]>([]);
  protected readonly design = signal<DesignId>('etals');
  protected readonly savedDesign = signal<DesignId>('etals');
  protected readonly leads = signal<Lead[] | null>(null);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly confirmDelete = signal<number | null>(null);
  protected readonly builtinTracks = BUILTIN_TRACKS;
  protected readonly tracks = signal<Track[] | null>(null);
  protected readonly trackDraft = signal<(TrackInput & { id: number | null }) | null>(null);
  protected readonly confirmTrack = signal<number | null>(null);
  protected readonly published = computed(() => this.products().filter((p) => p.published).length);
  protected password = '';
  protected readonly loginError = signal('');
  private slugTouched = false;

  constructor() {
    inject(Seo).noindex('Administration du catalogue · Souk');
  }

  async ngOnInit() {
    try {
      await adminApi.session();
      await this.enter();
    } catch {
      this.state.set('login');
    }
  }

  protected async login() {
    this.loginError.set('');
    if (!this.password) {
      this.loginError.set('Saisissez le mot de passe d’administration.');
      return;
    }
    this.busy.set(true);
    try {
      await adminApi.login(this.password);
      this.password = '';
      await this.enter();
    } catch (e) {
      this.loginError.set(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async logout() {
    await adminApi.logout().catch(() => undefined);
    this.state.set('login');
  }

  private async enter() {
    await this.reload();
    this.state.set('ready');
  }

  private async reload() {
    const data = await adminApi.catalog();
    this.products.set(data.products);
    this.design.set(data.defaultDesign);
    this.savedDesign.set(data.defaultDesign);
  }

  private async run(action: () => Promise<unknown>, success: string) {
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      await action();
      this.notice.set(success);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        this.state.set('login');
        this.loginError.set(e.message);
      } else this.error.set(e instanceof Error ? e.message : 'Action impossible.');
      return false;
    } finally {
      this.busy.set(false);
    }
    return true;
  }

  protected async showTab(t: Tab) {
    this.tab.set(t);
    this.notice.set('');
    this.error.set('');
    if (t === 'demandes') await this.run(async () => this.leads.set(await adminApi.leads()), '');
    if (t === 'musique') await this.run(async () => this.tracks.set(await adminApi.tracks()), '');
  }

  protected newProduct() {
    this.slugTouched = false;
    this.draft.set({
      id: null,
      slug: '',
      name: '',
      metier: '',
      tagline: '',
      description: '',
      features: [],
      featuresText: '',
      price: null,
      accent: '#43E0D0',
      layout: 'dashboard',
      imageUrl: null,
      mobileImageUrl: null,
      demoUrl: null,
      position: this.products().length + 1,
      published: false,
    });
  }

  protected edit(p: Product) {
    this.slugTouched = true;
    this.draft.set({ ...p, featuresText: p.features.join('\n') });
  }

  protected patch(change: Partial<Draft>) {
    const d = this.draft();
    if (!d) return;
    const next = { ...d, ...change };
    if ('slug' in change) this.slugTouched = true;
    if ('name' in change && d.id === null && !this.slugTouched) next.slug = slugify(next.name);
    this.draft.set(next);
  }

  protected async save() {
    const d = this.draft();
    if (!d) return;
    const { id, featuresText, ...rest } = d;
    const input: ProductInput = { ...rest, features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean) };
    const ok = await this.run(async () => {
      if (id === null) await adminApi.create(input);
      else await adminApi.update(id, input);
      await this.reload();
    }, id === null ? `« ${d.name} » est ajouté au catalogue.` : `« ${d.name} » est enregistré.`);
    if (ok) this.draft.set(null);
  }

  protected async togglePublished(p: Product) {
    const { id, ...rest } = p;
    await this.run(async () => {
      await adminApi.update(id, { ...rest, published: !p.published });
      await this.reload();
    }, p.published ? `« ${p.name} » est masqué de la vitrine.` : `« ${p.name} » est visible sur la vitrine.`);
  }

  /** Saves a new order; the list is updated first so the row stays where it was dropped. */
  private async saveOrder(list: Product[], message = 'Ordre de la vitrine enregistré.') {
    const before = this.products();
    this.products.set(list);
    const ok = await this.run(async () => {
      await adminApi.reorder(list.map((p) => p.id));
      await this.reload();
    }, message);
    if (!ok) this.products.set(before);
  }

  protected dropped(e: CdkDragDrop<Product[]>) {
    if (e.previousIndex === e.currentIndex) return;
    const list = [...this.products()];
    moveItemInArray(list, e.previousIndex, e.currentIndex);
    void this.saveOrder(list);
  }

  /** Keyboard alternative to dragging: arrow keys on the grip move the row. */
  protected async gripKey(e: KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    e.preventDefault();
    const to = index + delta;
    if (to < 0 || to >= this.products().length) return;
    const list = [...this.products()];
    moveItemInArray(list, index, to);
    await this.saveOrder(list, `« ${list[to].name} » est maintenant en position ${to + 1}.`);
    setTimeout(() => (document.querySelectorAll<HTMLElement>('.grip')[to])?.focus(), 0);
  }

  protected async sortBy(mode: 'name' | 'metier' | 'published') {
    const fr = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });
    const list = [...this.products()].sort((a, b) =>
      mode === 'name'
        ? fr(a.name, b.name)
        : mode === 'metier'
          ? fr(a.metier, b.metier) || fr(a.name, b.name)
          : Number(b.published) - Number(a.published),
    );
    const labels = { name: 'par nom (A → Z)', metier: 'par métier', published: 'affichés d’abord' };
    await this.saveOrder(list, `Produits triés ${labels[mode]}.`);
  }

  protected async remove(p: Product) {
    if (this.confirmDelete() !== p.id) {
      this.confirmDelete.set(p.id);
      return;
    }
    this.confirmDelete.set(null);
    await this.run(async () => {
      await adminApi.remove(p.id);
      if (this.draft()?.id === p.id) this.draft.set(null);
      await this.reload();
    }, `« ${p.name} » est supprimé.`);
  }

  protected async saveDesign() {
    const d = this.design();
    await this.run(async () => {
      await adminApi.setDesign(d);
      this.savedDesign.set(d);
    }, `La page d’accueil affiche maintenant « ${DESIGN_LABELS[d]} ».`);
  }

  protected newTrack() {
    this.trackDraft.set({ id: null, title: '', artist: '', url: '/musique/', rights: '', position: 0, published: true });
  }

  protected editTrack(t: Track) {
    this.trackDraft.set({ ...t });
  }

  protected patchTrack(change: Partial<TrackInput>) {
    const d = this.trackDraft();
    if (d) this.trackDraft.set({ ...d, ...change });
  }

  protected async saveTrack() {
    const d = this.trackDraft();
    if (!d) return;
    const { id, ...input } = d;
    const ok = await this.run(async () => {
      if (id === null) await adminApi.createTrack(input);
      else await adminApi.updateTrack(id, input);
      this.tracks.set(await adminApi.tracks());
    }, `« ${d.title} » est dans la playlist.`);
    if (ok) this.trackDraft.set(null);
  }

  protected async toggleTrack(t: Track) {
    const { id, ...rest } = t;
    await this.run(async () => {
      await adminApi.updateTrack(id, { ...rest, published: !t.published });
      this.tracks.set(await adminApi.tracks());
    }, t.published ? `« ${t.title} » est retiré de la playlist.` : `« ${t.title} » est de nouveau proposé.`);
  }

  protected async removeTrack(t: Track) {
    if (this.confirmTrack() !== t.id) {
      this.confirmTrack.set(t.id);
      return;
    }
    this.confirmTrack.set(null);
    await this.run(async () => {
      await adminApi.removeTrack(t.id);
      this.tracks.set(await adminApi.tracks());
    }, `« ${t.title} » est supprimé.`);
  }

  protected productName(slug: string | null) {
    if (!slug) return 'Non précisé';
    return this.products().find((p) => p.slug === slug)?.name ?? slug;
  }
}
