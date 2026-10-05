import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { DetectiveNew } from './games/detective-new/DetectiveNew';
import '../assets/css/theme.css';
import './styles/base.css';
import './styles/forest.css';
import './styles/forest-game-frame.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><DetectiveNew /></ThemeProvider></ErrorBoundary></StrictMode>);
