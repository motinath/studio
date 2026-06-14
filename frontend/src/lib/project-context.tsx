/**
 * ProjectContext — manages the "active project" that connects all tools.
 *
 * Flow:
 *   Projects page selects a project → stored here
 *   Designer generates a chip → auto-saved to active project
 *   QCLang editor compiles → saves .qc file to active project
 *   Canvas edits → debounced save to active project
 *   Verification / Simulation → runs against active project
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type Project,
  type GenerateResponse,
  fetchProjects,
  createProject,
  saveDesignToProject,
  updateProject,
} from "@/lib/api/backend";

interface ProjectContextProps {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  refreshProjects: () => Promise<void>;
  createAndActivate: (data: { name: string; topology?: string; num_qubits?: number; target_frequency_ghz?: number; substrate_material?: string; metal_layer?: string }) => Promise<Project>;
  saveDesign: (payload: GenerateResponse) => Promise<void>;
  backendOnline: boolean;
  setBackendOnline: (v: boolean) => void;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

const STORAGE_KEY = "qs.active_project_id";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, _setActiveProject] = useState<Project | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  const setActiveProject = useCallback((p: Project | null) => {
    _setActiveProject(p);
    if (p) {
      try { localStorage.setItem(STORAGE_KEY, p.id); } catch {}
    } else {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);
      setBackendOnline(true);

      // Restore active project from storage
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = data.find(p => p.id === savedId);
        if (found) {
          _setActiveProject(found);
        } else {
          _setActiveProject(null);
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
        }
      }
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => { refreshProjects(); }, []);

  const createAndActivate = useCallback(async (data: Parameters<ProjectContextProps["createAndActivate"]>[0]) => {
    const p = await createProject(data);
    setProjects(prev => [p, ...prev]);
    setActiveProject(p);
    return p;
  }, [setActiveProject]);

  const saveDesign = useCallback(async (payload: GenerateResponse) => {
    if (!activeProject) return;
    try {
      await saveDesignToProject(activeProject.id, payload);
      // Update local state to reflect has_design = true
      setProjects(prev => prev.map(p =>
        p.id === activeProject.id
          ? { ...p, has_design: true, num_qubits: payload.num_qubits, topology: payload.topology }
          : p
      ));
      _setActiveProject(prev =>
        prev?.id === activeProject.id
          ? { ...prev, has_design: true, num_qubits: payload.num_qubits, topology: payload.topology }
          : prev
      );
    } catch {
      // Backend offline — silently skip persistence
    }
  }, [activeProject]);

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      setActiveProject,
      refreshProjects,
      createAndActivate,
      saveDesign,
      backendOnline,
      setBackendOnline,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
