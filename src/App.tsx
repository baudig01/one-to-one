import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage, MeetingPage, MySpacePage } from './pages';
import { ProtectedRoute } from './components';
import { useData } from './hooks/useData';
import { Loader2, Database, HardDrive } from 'lucide-react';

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
    resolveRequest,
    isFirebaseConfigured,
  } = useData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Storage indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          ${isFirebaseConfigured
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'}`}
        >
          {isFirebaseConfigured ? (
            <>
              <Database className="w-3.5 h-3.5" />
              Firebase
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5" />
              Local Storage
            </>
          )}
        </div>
      </div>

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
