import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { MathRpg } from './games/math-rpg/MathRpg';
import '../assets/css/theme.css';

import './styles/base.css';
import './styles/forest.css';
import './styles/forest-game-frame.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><MathRpg /></ThemeProvider></ErrorBoundary></StrictMode>);
