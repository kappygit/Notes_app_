import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Login from './auth/Login';
import Register from './auth/Register';
import VerifyEmail from './auth/VerifyEmail';
import ProtectedRoutes from './Protect/ProtectedRoutes';
import DashBoard from './Protect/pages/DashBoard';
import Admin from './Protect/pages/Admin';
import AdminNotes from './Protect/pages/AdminNotes';
import NotesList from './notes/NotesList';
import NoteForm from './notes/NoteForm';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Routes for All Authenticated Users */}
          <Route element={<ProtectedRoutes />}>
            <Route path="/dashboard" element={<DashBoard />} />
            <Route path="/notes" element={<NotesList />} />
            <Route path="/notes/new" element={<NoteForm />} />
            <Route path="/notes/:id/edit" element={<NoteForm />} />
          </Route>

          {/* Protected Routes for Authorized Admins Only */}
          <Route element={<ProtectedRoutes requiredRole="admin" />}>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/notes" element={<AdminNotes />} />
          </Route>

          {/* Default Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
