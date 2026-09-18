import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { ClassRpgAdmin } from './features/class-rpg/ClassRpgAdmin';
import '../assets/css/theme.css';
import '../assets/css/class-rpg.css';

import './styles/ui.css';

createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><ClassRpgAdmin /></ThemeProvider></ErrorBoundary>);
