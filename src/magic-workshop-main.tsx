import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { MagicWorkshop } from './games/magic-workshop/MagicWorkshop';
import '../assets/css/theme.css';
import './styles/base.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><MagicWorkshop /></ThemeProvider></ErrorBoundary></StrictMode>);
