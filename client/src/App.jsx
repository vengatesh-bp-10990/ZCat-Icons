import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Gallery from './pages/Gallery'
import AdminPanel from './pages/AdminPanel'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const storedUser = sessionStorage.getItem('zcat_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    sessionStorage.setItem('zcat_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('zcat_user')
    sessionStorage.removeItem('zcat_token')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f11]">
        <div className="text-zinc-400 text-lg">Loading...</div>
      </div>
    )
  }

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
        element={user ? <AdminPanel user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
