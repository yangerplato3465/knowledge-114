import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { DetectiveAdmin } from './features/detective/DetectiveAdmin';
import '../assets/css/theme.css';
import '../assets/css/class-rpg.css';
import './features/detective/detective-admin.css';

import './styles/ui.css';

createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><DetectiveAdmin /></ThemeProvider></ErrorBoundary>);
