import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { DetectiveCase } from './features/detective/DetectiveCase';
import '../assets/css/theme.css';
import '../assets/css/detective.css';

import './styles/ui.css';

createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><DetectiveCase gameId="ai-museum" caseFile="ai-museum" placeholder="AIM-XXXX-XX" /></ThemeProvider></ErrorBoundary>);
