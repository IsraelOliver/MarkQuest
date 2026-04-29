import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '../auth/RequireAuth'
import { MainLayout } from '../layouts/MainLayout'
import { AnswerKeysPage } from '../pages/AnswerKeysPage'
import { AccountSettingsPage } from '../pages/AccountSettingsPage'
import { ClassroomDetailPage } from '../pages/ClassroomDetailPage'
import { ClassroomExamsPage } from '../pages/ClassroomExamsPage'
import { ClassroomStudentsPage } from '../pages/ClassroomStudentsPage'
import { DashboardPage } from '../pages/DashboardPage'
import { ExamDetailPage } from '../pages/ExamDetailPage'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { ResultsPage } from '../pages/ResultsPage'
import { TemplatesPage } from '../pages/TemplatesPage'
import { UnitDetailPage } from '../pages/UnitDetailPage'
import { UnitsPage } from '../pages/UnitsPage'
import { UploadsPage } from '../pages/UploadsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'units', element: <UnitsPage /> },
      { path: 'account-settings', element: <AccountSettingsPage /> },
      { path: 'units/:unitId', element: <UnitDetailPage /> },
      { path: 'units/:unitId/classrooms/:classroomId', element: <ClassroomDetailPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/exams', element: <ClassroomExamsPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/students', element: <ClassroomStudentsPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/exams/:examId', element: <ExamDetailPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/exams/:examId/layout', element: <TemplatesPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/exams/:examId/layout/:templateId/edit', element: <TemplatesPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/exams/:examId/answer-key', element: <AnswerKeysPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/exams/:examId/uploads', element: <UploadsPage /> },
      { path: 'units/:unitId/classrooms/:classroomId/exams/:examId/results', element: <ResultsPage /> },
    ],
  },
])
