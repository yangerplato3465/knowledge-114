import type { GeometryDiagramData } from './geometry-questions';
export interface Question { q: string; a: string[]; correct: number; diagram?: GeometryDiagramData; difficulty?: 'basic' | 'challenge' }
