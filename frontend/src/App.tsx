import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './components/pages/LoginPage'
import RegisterPage from './components/pages/RegisterPage'
import DashboardPage from './components/pages/DashboardPage'
import DevicesPage from './components/pages/DevicesPage'
import ContactsPage from './components/pages/ContactsPage'
import BlastPage from './components/pages/BlastPage'
import { TemplatesPage, AutoReplyPage } from './components/pages/TemplatesPage'
import { Inbox } from 'lucide-react'
import InboxView from './components/pages/Inbox'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return !token ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#fff',
            color: '#1e293b',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #f1f5f9',
          },
          success: {
            iconTheme: { primary: '#25D366', secondary: '#fff' },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="blast" element={<BlastPage />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="auto-reply" element={<AutoReplyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
