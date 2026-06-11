import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function getStoredSession() {
  try {
    const rawSession = localStorage.getItem('points_app_session')
    return rawSession ? JSON.parse(rawSession) : null
  } catch (error) {
    console.error('Failed to parse stored session.', error)
    return null
  }
}

const session = getStoredSession()
const jwtToken = localStorage.getItem('jwt_token')

if (!jwtToken || !session || session.isAdmin !== true) {
  window.location.replace('/login.html')
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
