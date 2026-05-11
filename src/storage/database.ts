import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Project, Opening } from '../types';

const PROJECTS_KEY = '@measure_projects';   // solo per migrazione
const MIGRATED_KEY = '@measure_migrated_v1';

// ─── Cache in memoria per IDs e progetti ─────────────────────────────────────

let _cachedIds: { userId: string; companyId: string } | null = null;
let _projectCache: Map<string, Project> = new Map();
let _listCache: Project[] | null = null;
// null = non ancora verificato; true/false = verificato
let _hasParentId: boolean | null = null;
// Colonne opzionali non presenti sullo schema Supabase corrente
const _unsupportedCols = new Set<string>();

export function clearDbCache() {
  _cachedIds    = null;
  _projectCache = new Map();
  _listCache    = null;
}

// ─── Helper: upsert robusto, rimuove automaticamente colonne mancanti ─────────

async function upsertProject(payload: Record<string, unknown>): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    // Costruisci payload senza le colonne già note come mancanti
    const stripped = Object.fromEntries(
      Object.entries(payload).filter(([k]) => !_unsupportedCols.has(k))
    );

    const { error } = await supabase.from('projects').upsert(stripped);
    if (!error) {
      // Aggiorna flag _hasParentId usato da fetchProjectList
      if (!_unsupportedCols.has('parent_id')) _hasParentId = true;
      return;
    }

    const err = error as { code?: string; message?: string };
    // PGRST204 = colonna non trovata nello schema
    if (err.code === 'PGRST204') {
      const m = (err.message ?? '').match(/find the '(\w+)' column/);
      if (m) {
        _unsupportedCols.add(m[1]);
        if (m[1] === 'parent_id') _hasParentId = false;
        continue; // riprova senza quella colonna
      }
    }
    console.warn('upsertProject error:', error);
    return;
  }
}

// ─── Helpers interni ──────────────────────────────────────────────────────────

export async function getCurrentIds(): Promise<{ userId: string; companyId: string } | null> {
  if (_cachedIds) return _cachedIds;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (!data?.company_id) return null;

  _cachedIds = { userId: user.id, companyId: data.company_id };
  return _cachedIds;
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id:              row.id              as string,
    name:            row.name            as string,
    clientName:      row.client_name     as string,
    clientPhone:     row.client_phone    as string,
    address:         row.address         as string,
    gps:             row.gps             as Project['gps'],
    openings:       (row.openings        as Opening[]) ?? [],
    parentId:       (row.parent_id       as string | null) ?? null,
    catalogSeriesId:(row.catalog_series_id as string | null) ?? null,
    createdAt:       row.created_at      as string,
    updatedAt:       row.updated_at      as string,
  };
}

// ─── Migrazione locale → Supabase (eseguita una sola volta) ──────────────────

export async function migrateLocalToSupabase(): Promise<void> {
  const already = await AsyncStorage.getItem(MIGRATED_KEY);
  if (already) return;

  const ids = await getCurrentIds();
  if (!ids) return;

  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  if (raw) {
    const local = JSON.parse(raw) as Project[];
    for (const p of local) {
      await supabase.from('projects').upsert({
        id:           p.id,
        company_id:   ids.companyId,
        user_id:      ids.userId,
        name:         p.name,
        client_name:  p.clientName,
        client_phone: p.clientPhone,
        address:      p.address,
        gps:          p.gps,
        openings:     p.openings,
        parent_id:    null,
        created_at:   p.createdAt,
        updated_at:   p.updatedAt,
      });
    }
  }

  await AsyncStorage.setItem(MIGRATED_KEY, '1');
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Lista progetti — mostra cache subito, poi aggiorna in background */
export async function getAllProjects(): Promise<Project[]> {
  // Cache disponibile → restituisci subito e aggiorna in background
  if (_listCache) {
    getCurrentIds().then(ids => {
      if (!ids) return;
      fetchProjectList(ids.companyId).then(list => { if (list) _listCache = list; }).catch(() => {});
    });
    return _listCache;
  }

  // Prima volta: attendi ids e fetch
  const ids = await getCurrentIds();
  if (!ids) return [];
  const list = await fetchProjectList(ids.companyId);
  if (!list) return [];
  _listCache = list;
  return _listCache;
}

async function fetchProjectList(companyId: string): Promise<Project[] | null> {
  if (_hasParentId !== false) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });
    if (!error && data) {
      _hasParentId = true;
      return data.map(row => rowToProject(row as Record<string, unknown>));
    }
    _hasParentId = false;
  }
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_name, client_phone, address, gps, openings, created_at, updated_at')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });
  if (error || !data) return null;
  return data.map(row => rowToProject(row as Record<string, unknown>));
}

/** Lista progetti con openings — per calcolo materiali */
export async function getAllProjectsWithOpenings(): Promise<Project[]> {
  const ids = await getCurrentIds();
  if (!ids) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', ids.companyId)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  // Restituisce dalla cache se disponibile
  if (_projectCache.has(id)) return _projectCache.get(id)!;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  const project = rowToProject(data);
  _projectCache.set(id, project);
  return project;
}

export async function saveProject(project: Project): Promise<void> {
  // Metti subito in cache locale — la UI trova il progetto anche se Supabase è lento
  _projectCache.set(project.id, project);
  // Aggiorna/aggiungi nella lista cache (anche se era null, crea una lista con questo progetto)
  const existing = _listCache ?? [];
  const idx = existing.findIndex(p => p.id === project.id);
  _listCache = idx >= 0
    ? existing.map(p => p.id === project.id ? project : p)
    : [project, ...existing];

  const ids = await getCurrentIds();
  if (!ids) throw new Error('NO_IDS');

  await upsertProject({
    id:                 project.id,
    company_id:         ids.companyId,
    user_id:            ids.userId,
    name:               project.name,
    client_name:        project.clientName,
    client_phone:       project.clientPhone,
    address:            project.address,
    gps:                project.gps,
    openings:           project.openings,
    parent_id:          project.parentId ?? null,
    catalog_series_id:  project.catalogSeriesId ?? null,
    created_at:         project.createdAt,
    updated_at:         project.updatedAt,
  });

  _projectCache.set(project.id, project);
}

export async function deleteProject(id: string): Promise<void> {
  // Elimina prima i sub-progetti figli
  await supabase.from('projects').delete().eq('parent_id', id);
  await supabase.from('projects').delete().eq('id', id);
  _projectCache.delete(id);
  _listCache = null;
}

export async function saveOpening(projectId: string, opening: Opening): Promise<void> {
  const project = await getProject(projectId);
  if (!project) return;

  const idx = project.openings.findIndex(o => o.id === opening.id);
  if (idx >= 0) {
    project.openings[idx] = opening;
  } else {
    project.openings.push(opening);
  }
  project.updatedAt = new Date().toISOString();

  // Salva senza invalidare _listCache (le aperture non compaiono nella lista)
  const ids = await getCurrentIds();
  if (!ids) return;
  await upsertProject({
    id:                 project.id,
    company_id:         ids.companyId,
    user_id:            ids.userId,
    name:               project.name,
    client_name:        project.clientName,
    client_phone:       project.clientPhone,
    address:            project.address,
    gps:                project.gps,
    openings:           project.openings,
    parent_id:          project.parentId ?? null,
    catalog_series_id:  project.catalogSeriesId ?? null,
    created_at:         project.createdAt,
    updated_at:         project.updatedAt,
  });
  _projectCache.set(project.id, project);
}

/** Ritorna il progetto aperto + tutti i suoi fratelli/figli (la "famiglia") */
export async function getProjectFamily(projectId: string): Promise<Project[]> {
  const p = await getProject(projectId);
  if (!p) return [];
  const parentId = p.parentId ?? p.id;
  const all = await getAllProjects();
  let family = all.filter(x => x.id === parentId || x.parentId === parentId);
  // Se il progetto appena creato non è ancora nella lista (cache vecchia), aggiungilo
  if (!family.find(x => x.id === p.id)) family = [p, ...family];
  // Fetch fresco per avere le openings aggiornate
  const fresh = await Promise.all(family.map(x => getProject(x.id).then(r => r ?? x)));
  return fresh.sort((a, b) => {
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export async function deleteOpening(projectId: string, openingId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project) return;

  project.openings = project.openings.filter(o => o.id !== openingId);
  project.updatedAt = new Date().toISOString();

  const ids = await getCurrentIds();
  if (!ids) return;
  await upsertProject({
    id:                 project.id,
    company_id:         ids.companyId,
    user_id:            ids.userId,
    name:               project.name,
    client_name:        project.clientName,
    client_phone:       project.clientPhone,
    address:            project.address,
    gps:                project.gps,
    openings:           project.openings,
    parent_id:          project.parentId ?? null,
    catalog_series_id:  project.catalogSeriesId ?? null,
    created_at:         project.createdAt,
    updated_at:         project.updatedAt,
  });
  _projectCache.set(project.id, project);
}
