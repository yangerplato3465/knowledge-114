import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import '../assets/css/theme.css';
import './styles/global.css';
import { MagicInk } from './lessons/magic-ink/MagicInk';
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><MagicInk /></ThemeProvider></ErrorBoundary></StrictMode>);
