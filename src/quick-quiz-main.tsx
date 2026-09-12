import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { QuickQuiz } from './games/quick-quiz/QuickQuiz';
import '../assets/css/theme.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><QuickQuiz /></ThemeProvider></ErrorBoundary></StrictMode>);
