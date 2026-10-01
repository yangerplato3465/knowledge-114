import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { TeacherTools } from './app/TeacherTools';
import '../assets/css/theme.css';
import './styles/base.css';
import './styles/directory.css';

import './styles/forest.css';
import './styles/forest-pages.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><TeacherTools /></ThemeProvider></ErrorBoundary></StrictMode>);
