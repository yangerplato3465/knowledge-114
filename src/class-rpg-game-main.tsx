import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { ClassRpgWorld } from './features/class-rpg/ClassRpgWorld';
import '../assets/css/theme.css';
import '../assets/css/class-rpg-game.css';

import './styles/ui.css';

createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><ClassRpgWorld /></ThemeProvider></ErrorBoundary>);
