import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { Activities } from './app/Activities';
import '../assets/css/theme.css';
import './styles/base.css';
import './styles/directory.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><Activities /></ThemeProvider></ErrorBoundary></StrictMode>);
