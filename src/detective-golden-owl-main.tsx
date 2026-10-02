import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { DetectiveCase } from './features/detective/DetectiveCase';
import '../assets/css/theme.css';
import '../assets/css/detective.css';

import './styles/ui.css';
import './styles/forest.css';
import './styles/forest-game-frame.css';

createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><DetectiveCase gameId="owl" caseFile="golden-owl" placeholder="OWL-0000" /></ThemeProvider></ErrorBoundary>);
