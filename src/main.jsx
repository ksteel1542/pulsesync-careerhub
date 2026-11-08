import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClassroomStoreProvider } from './state/ClassroomStore'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClassroomStoreProvider>
      <App />
    </ClassroomStoreProvider>
  </StrictMode>,
)
