import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { Upload } from './features/materials/Upload';
import '../assets/css/theme.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><Upload /></ThemeProvider></ErrorBoundary></StrictMode>);
