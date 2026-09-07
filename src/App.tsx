import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage, MeetingPage, MySpacePage } from './pages';
import { ProtectedRoute } from './components';
import { useData } from './hooks/useData';
import { Loader2 } from 'lucide-react';

function App() {
  const {
    members,
    meetings,
    requests,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    resolveRequest,
  } = useData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lift">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
          <p className="text-sm text-slate-500">Chargement des one-to-one…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <p className="mb-4 text-sm text-negative-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mx-auto">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Mode lecture - membres */}
        <Route
          path="/"
          element={
            <DashboardPage
              members={members}
              meetings={meetings}
              isAdmin={false}
            />
          }
        />
        {/* Mode admin - lead (protégé) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <DashboardPage
                members={members}
                meetings={meetings}
                requests={requests}
                onAddMember={addMember}
                onDeleteMember={deleteMember}
                onEditMember={updateMember}
                onDeleteMeeting={deleteMeeting}
                onResolveRequest={resolveRequest}
                isAdmin={true}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting/:memberId"
          element={
            <ProtectedRoute>
              <MeetingPage
                members={members}
                meetings={meetings}
                onSaveMeeting={addMeeting}
                onUpdateMeeting={updateMeeting}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting/:memberId/edit/:meetingId"
          element={
            <ProtectedRoute>
              <MeetingPage
                members={members}
                meetings={meetings}
                onSaveMeeting={addMeeting}
                onUpdateMeeting={updateMeeting}
              />
            </ProtectedRoute>
          }
        />
        {/* Espace membre */}
        <Route path="/my-space" element={<MySpacePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
