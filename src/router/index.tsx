import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { AnswerKeysPage } from '../pages/AnswerKeysPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LandingPage } from '../pages/LandingPage'
import { ResultsPage } from '../pages/ResultsPage'
import { TemplatesPage } from '../pages/TemplatesPage'
import { UploadsPage } from '../pages/UploadsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/app',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'uploads', element: <UploadsPage /> },
      { path: 'results', element: <ResultsPage /> },
      { path: 'templates', element: <TemplatesPage /> },
      { path: 'answer-keys', element: <AnswerKeysPage /> },
    ],
  },
])
