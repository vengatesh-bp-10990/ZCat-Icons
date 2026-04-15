import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Gallery from './pages/Gallery'
import AdminPanel from './pages/AdminPanel'

const IS_LOCAL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session
    const storedUser = sessionStorage.getItem('zcat_user')
    const storedToken = sessionStorage.getItem('zcat_token')
    if (storedUser && storedToken) {
      const parsed = JSON.parse(storedUser)
      // Validate session is still active
      fetch('/api/icons?page=1&limit=1', {
        headers: { Authorization: storedToken ? `Zoho-oauthtoken ${storedToken}` : '' },
      })
        .then((res) => {
          if (res.ok) {
            setUser(parsed)
          } else {
            // Token expired — clear session
            sessionStorage.removeItem('zcat_user')
            sessionStorage.removeItem('zcat_token')
          }
        })
        .catch(() => {
          // Offline or server down — allow cached session for local dev
          if (IS_LOCAL) setUser(parsed)
        })
        .finally(() => setLoading(false))
    } else {
      // In production, check if Catalyst SDK has a valid session
      if (!IS_LOCAL && window.catalyst?.auth) {
        window.catalyst.auth
          .isUserAuthenticated()
          .then((result) => {
            if (result?.content) {
              // Auto-restore from Catalyst session
              sessionStorage.setItem('zcat_token', result.content)
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    sessionStorage.setItem('zcat_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('zcat_user')
    sessionStorage.removeItem('zcat_token')
    // In production, also sign out of Catalyst
    if (!IS_LOCAL && window.catalyst?.auth) {
      try {
        window.catalyst.auth.signOut()
      } catch {}
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f11]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isAdmin = user?.role_id === '1'

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
      />
      <Route
        path="/"
        element={user ? <Gallery user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
      />
      <Route
        path="/admin"
        element={
          !user ? (
            <Navigate to="/login" />
          ) : !isAdmin ? (
            <Navigate to="/" />
          ) : (
            <AdminPanel user={user} onLogout={handleLogout} />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
