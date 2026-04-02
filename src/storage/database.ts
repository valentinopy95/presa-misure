import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Opening } from '../types';

const PROJECTS_KEY = '@measure_projects';

export async function getAllProjects(): Promise<Project[]> {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await getAllProjects();
  return projects.find(p => p.id === id) ?? null;
}

export async function saveProject(project: Project): Promise<void> {
  const projects = await getAllProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getAllProjects();
  await AsyncStorage.setItem(
    PROJECTS_KEY,
    JSON.stringify(projects.filter(p => p.id !== id))
  );
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
  await saveProject(project);
}

export async function deleteOpening(projectId: string, openingId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project) return;
  project.openings = project.openings.filter(o => o.id !== openingId);
  project.updatedAt = new Date().toISOString();
  await saveProject(project);
}
