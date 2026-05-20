// src/features/roadmap/roadmap-types.ts
import type { ElementType } from "react";

export interface Module {
  id: string;
  title: string;
  completed: boolean;
  locked: boolean;
  estimatedTime: string;
  lessonCount: number;
  level: string;
  slug: string;
  bestScore: number;
  attemptsCount: number;
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  difficulty: string;
  difficultyLevel: 1 | 2 | 3;
  estimatedTime: string;
  modules: Module[];
  accent: string;
}

export type SortMode = "default" | "progress" | "alphabetical";
export type DifficultyFilter = "all" | "1" | "2" | "3";
