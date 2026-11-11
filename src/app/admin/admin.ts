import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BUILTIN_TRACKS, type Lead, type Track, type TrackInput, type Univers, type UniversInput } from '../core/catalog.model';
import { ALLEE_IDS, P, PALETTE_IDS, SCREEN_IDS, SOUK_ALLEES } from '../souk/data/souk';
import { Icon } from '../shared/icon';
import { adminApi, ApiError } from './admin-api';
import { Seo } from '../core/seo';

type Tab = 'produits' | 'musique' | 'demandes';

interface Draft extends UniversInput {
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
  protected readonly allees = ALLEE_IDS;
  protected readonly alleeLabels = SOUK_ALLEES;
  protected readonly palettes = PALETTE_IDS;
  protected readonly paletteColors = P;
  protected readonly screens = SCREEN_IDS;
  protected readonly screenLabels: Record<string, string> = {
    agenda: 'Agenda', chat: 'Conversation', files: 'Documents', dash: 'Tableau de bord', people: 'Personnes',
    form: 'Formulaire', card: 'Carte NFC', rating: 'Notation', queue: 'File d’attente',
  };

  protected readonly state = signal<'checking' | 'login' | 'ready'>('checking');
  protected readonly tab = signal<Tab>('produits');
  protected readonly products = signal<Univers[]>([]);
  protected readonly leads = signal<Lead[] | null>(null);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly confirmDelete = signal<number | null>(null);
  protected readonly builtinTracks = BUILTIN_TRACKS;
  protected readonly tracks = signal<Track[] | null>(null);
  /** New track (id null: name + file) or renaming of an existing one. */
  protected readonly trackDraft = signal<{ id: number | null; title: string; file: File | null } | null>(null);
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
    this.products.set(data.univers);
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
      allee: 'metiers',
      palette: 'lilac',
      screen: 'dash',
      badge: '',
      film: false,
      line1: '',
      who: '',
      features: [],
      featuresText: '',
      screenTitle: '',
      screenCta: '',
      imageUrl: null,
      mobileImageUrl: null,
      position: this.products().length + 1,
      published: false,
    });
  }

  protected edit(p: Univers) {
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
    const input: UniversInput = { ...rest, features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean) };
    const ok = await this.run(async () => {
      if (id === null) await adminApi.create(input);
      else await adminApi.update(id, input);
      await this.reload();
    }, id === null ? `« ${d.name} » est ajouté au catalogue.` : `« ${d.name} » est enregistré.`);
    if (ok) this.draft.set(null);
  }

  protected async togglePublished(p: Univers) {
    const { id, ...rest } = p;
    await this.run(async () => {
      await adminApi.update(id, { ...rest, published: !p.published });
      await this.reload();
    }, p.published ? `« ${p.name} » est masqué de la vitrine.` : `« ${p.name} » est visible sur la vitrine.`);
  }

  /** Saves a new order; the list is updated first so the row stays where it was dropped. */
  private async saveOrder(list: Univers[], message = 'Ordre de la vitrine enregistré.') {
    const before = this.products();
    this.products.set(list);
    const ok = await this.run(async () => {
      await adminApi.reorder(list.map((p) => p.id));
      await this.reload();
    }, message);
    if (!ok) this.products.set(before);
  }

  protected dropped(e: CdkDragDrop<Univers[]>) {
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

  protected async sortBy(mode: 'name' | 'allee' | 'published') {
    const fr = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });
    const list = [...this.products()].sort((a, b) =>
      mode === 'name'
        ? fr(a.name, b.name)
        : mode === 'allee'
          ? fr(SOUK_ALLEES[a.allee], SOUK_ALLEES[b.allee]) || fr(a.name, b.name)
          : Number(b.published) - Number(a.published),
    );
    const labels = { name: 'par nom (A → Z)', allee: 'par allée', published: 'affichés d’abord' };
    await this.saveOrder(list, `Produits triés ${labels[mode]}.`);
  }

  protected async remove(p: Univers) {
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


  protected newTrack() {
    this.trackDraft.set({ id: null, title: '', file: null });
  }

  protected editTrack(t: Track) {
    this.trackDraft.set({ id: t.id, title: t.title, file: null });
  }

  protected pickTrackFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const d = this.trackDraft();
    if (!d) return;
    // The file name is a sensible default name, left untouched once the admin has typed one.
    const title = d.title || (file ? file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() : '');
    this.trackDraft.set({ ...d, file, title });
  }

  protected async saveTrack() {
    const d = this.trackDraft();
    if (!d) return;
    const title = d.title.trim();
    this.notice.set('');
    if (!title) return this.error.set('Donnez un nom au morceau.');
    if (d.id === null && !d.file) return this.error.set('Choisissez le fichier audio.');
    const ok = await this.run(async () => {
      if (d.id === null) await adminApi.uploadTrack(title, d.file!);
      else {
        const t = this.tracks()?.find((x) => x.id === d.id);
        if (t) {
          const { id, ...rest } = t;
          await adminApi.updateTrack(id, { ...rest, title });
        }
      }
      this.tracks.set(await adminApi.tracks());
    }, `« ${title} » est dans la playlist.`);
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
