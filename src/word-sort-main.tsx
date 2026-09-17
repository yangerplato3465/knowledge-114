import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { WordSort } from './games/word-sort/WordSort';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><WordSort /></ThemeProvider></ErrorBoundary></StrictMode>);
