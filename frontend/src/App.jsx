import React from 'react'
import { BrowserRouter,Routes,Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import ProtectedRoute from "./components/ProtectedRoute"
import DocumentView from './pages/DocumentView'
import UploadFile from './pages/UploadFile'
import UserDashboard from './pages/UserDashboard'
import NotFound from './pages/NotFound'
import Home from './pages/Home'

function Logout(){
  localStorage.clear()
  return <Navigate to ='/login'/>
}

function RegisterAndLogut(){
  localStorage.clear()
  return <Register />
}

function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route
      path='/upload'
      element={
        <ProtectedRoute>
          <UploadFile />
        </ProtectedRoute>
      }
      />
      <Route path='/login' element = {<Login />}/>
      <Route path='/logout' element = {<Logout />}/>
      <Route path='/register' element = {<RegisterAndLogut />}/>
      <Route path='/document-view/:documentId' element = {<DocumentView />}/>
      <Route path='/dashboard' element = {<UserDashboard />}/>
      <Route path='/' element = {<Home />}/>
      <Route path='*' element = {<NotFound />}/>

      </Routes>
      </BrowserRouter>
  )
}

export default App
