import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import '../assets/css/theme.css';
import './styles/global.css';
import { WaterAcidBase } from './lessons/water-acid-base/WaterAcidBase';
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><WaterAcidBase /></ThemeProvider></ErrorBoundary></StrictMode>);

