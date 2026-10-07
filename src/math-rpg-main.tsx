import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MathRpg } from './games/math-rpg/MathRpg';
import '../assets/css/theme.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><MathRpg /></ErrorBoundary></StrictMode>);
