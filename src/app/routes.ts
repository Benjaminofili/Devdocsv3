import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Generate } from './pages/Generate';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Landing },
      { path: 'generate', Component: Generate },
      { path: 'dashboard', Component: Dashboard },
      { path: 'dashboard/history', Component: Dashboard },
      { path: 'admin', Component: Admin },
      { path: '*', Component: NotFound },
    ],
  },
]);
