import { createBrowserRouter } from 'react-router-dom'
import LibraryRoute from './LibraryRoute'
import QuickReadRoute from './QuickReadRoute'
import ReaderRoute from './ReaderRoute'
import HomeView from '../features/home/HomeView'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <HomeView />,
    },
    {
      path: '/library',
      element: <LibraryRoute />,
    },
    {
      path: '/quick-read',
      element: <QuickReadRoute />,
    },
    {
      path: '/reader/:comicId',
      element: <ReaderRoute />,
    },
    {
      path: '/settings',
      lazy: async () => {
        const { default: SettingsView } = await import('../features/settings/SettingsView')
        return { Component: SettingsView }
      },
    },
  ],
  { basename: '/comiq' },
)
