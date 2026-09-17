import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { MathRpg } from './games/math-rpg/MathRpg';
import '../assets/css/theme.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><MathRpg /></ThemeProvider></ErrorBoundary></StrictMode>);
