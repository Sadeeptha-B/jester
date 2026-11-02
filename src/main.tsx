import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/500.css';
import './presentation/ui/theme.css';
import { createRoot } from 'react-dom/client';
import { setUpApp } from './app/install';
import { App } from './presentation/ui/App';

setUpApp();
createRoot(document.getElementById('root')!).render(<App />);
