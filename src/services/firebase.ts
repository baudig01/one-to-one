import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { TeamMember, Meeting, MemberNote, OneToOneRequest } from '../types';

// Génère un code d'accès simple (6 caractères)
const generateAccessCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 0, 1 pour éviter confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Configuration Firebase - À REMPLACER avec tes propres valeurs
// Tu peux créer un projet Firebase gratuit sur https://console.firebase.google.com
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Initialisation conditionnelle (fallback sur localStorage si pas de config)
let db: ReturnType<typeof getFirestore> | null = null;

export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
         firebaseConfig.projectId !== 'YOUR_PROJECT_ID';
};

if (isFirebaseConfigured()) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed, using localStorage fallback');
  }
}

// ============ MEMBERS ============

export const fetchMembers = async (): Promise<TeamMember[]> => {
  if (!db) {
    const stored = localStorage.getItem('one-to-one-members');
    const members: TeamMember[] = stored ? JSON.parse(stored) : [];

    // Migration: générer un code pour les membres qui n'en ont pas
    let needsUpdate = false;
    const updatedMembers = members.map(m => {
      if (!m.accessCode) {
        needsUpdate = true;
        return { ...m, accessCode: generateAccessCode() };
      }
      return m;
    });

    if (needsUpdate) {
      localStorage.setItem('one-to-one-members', JSON.stringify(updatedMembers));
    }

    return updatedMembers;
  }

  const membersRef = collection(db, 'members');
  const q = query(membersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const members = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as TeamMember[];

  // Migration Firebase: générer un code pour les membres qui n'en ont pas
  for (const member of members) {
    if (!member.accessCode) {
      const newCode = generateAccessCode();
      const memberRef = doc(db, 'members', member.id);
      await updateDoc(memberRef, { accessCode: newCode });
      member.accessCode = newCode;
    }
  }

  return members;
};

export const addMember = async (member: Omit<TeamMember, 'id' | 'createdAt' | 'accessCode'>): Promise<TeamMember> => {
  const accessCode = generateAccessCode();
  const newMember: TeamMember = {
    ...member,
    id: crypto.randomUUID(),
    accessCode,
    createdAt: new Date(),
  };

  if (!db) {
    const members = await fetchMembers();
    const updated = [newMember, ...members];
    localStorage.setItem('one-to-one-members', JSON.stringify(updated));
    return newMember;
  }

  const docRef = await addDoc(collection(db, 'members'), {
    ...member,
    accessCode,
    createdAt: Timestamp.now(),
  });

  return { ...newMember, id: docRef.id };
};

export const updateMember = async (member: TeamMember): Promise<void> => {
  if (!db) {
    const members = await fetchMembers();
    const updated = members.map(m => m.id === member.id ? member : m);
    localStorage.setItem('one-to-one-members', JSON.stringify(updated));
    return;
  }

  const memberRef = doc(db, 'members', member.id);
  await updateDoc(memberRef, {
    name: member.name,
    role: member.role,
    avatar: member.avatar,
  });
};

export const deleteMember = async (memberId: string): Promise<void> => {
  if (!db) {
    const members = await fetchMembers();
    const updated = members.filter(m => m.id !== memberId);
    localStorage.setItem('one-to-one-members', JSON.stringify(updated));
    return;
  }

  await deleteDoc(doc(db, 'members', memberId));
};

// ============ MEETINGS ============

export const fetchMeetings = async (): Promise<Meeting[]> => {
  if (!db) {
    const stored = localStorage.getItem('one-to-one-meetings');
    return stored ? JSON.parse(stored) : [];
  }

  const meetingsRef = collection(db, 'meetings');
  const q = query(meetingsRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate() || new Date(),
    actions: (doc.data().actions || []).map((a: any) => ({
      ...a,
      createdAt: a.createdAt?.toDate?.() || new Date(a.createdAt),
      completedAt: a.completedAt?.toDate?.() || (a.completedAt ? new Date(a.completedAt) : undefined),
    })),
  })) as Meeting[];
};

export const addMeeting = async (meeting: Meeting): Promise<Meeting> => {
  if (!db) {
    const meetings = await fetchMeetings();
    const updated = [meeting, ...meetings];
    localStorage.setItem('one-to-one-meetings', JSON.stringify(updated));
    return meeting;
  }

  const meetingData = {
    ...meeting,
    date: Timestamp.fromDate(new Date(meeting.date)),
    actions: meeting.actions.map(a => ({
      ...a,
      createdAt: Timestamp.fromDate(new Date(a.createdAt)),
      completedAt: a.completedAt ? Timestamp.fromDate(new Date(a.completedAt)) : null,
    })),
  };

  const docRef = await addDoc(collection(db, 'meetings'), meetingData);
  return { ...meeting, id: docRef.id };
};

export const updateMeeting = async (meeting: Meeting): Promise<void> => {
  if (!db) {
    const meetings = await fetchMeetings();
    const updated = meetings.map(m => m.id === meeting.id ? meeting : m);
    localStorage.setItem('one-to-one-meetings', JSON.stringify(updated));
    return;
  }

  const meetingRef = doc(db, 'meetings', meeting.id);
  await updateDoc(meetingRef, {
    mood: meeting.mood,
    winsPains: meeting.winsPains,
    radar: meeting.radar,
    actions: meeting.actions.map(a => ({
      ...a,
      createdAt: Timestamp.fromDate(new Date(a.createdAt)),
      completedAt: a.completedAt ? Timestamp.fromDate(new Date(a.completedAt)) : null,
    })),
    notes: meeting.notes,
    duration: meeting.duration,
  });
};

// ============ MEMBER NOTES (Carnet de bord) ============

export const fetchNotes = async (): Promise<MemberNote[]> => {
  if (!db) {
    const stored = localStorage.getItem('one-to-one-notes');
    return stored ? JSON.parse(stored) : [];
  }

  const notesRef = collection(db, 'notes');
  const q = query(notesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as MemberNote[];
};

export const fetchNotesByMember = async (memberId: string): Promise<MemberNote[]> => {
  const allNotes = await fetchNotes();
  return allNotes.filter(n => n.memberId === memberId);
};

export const fetchPendingNotes = async (memberId: string): Promise<MemberNote[]> => {
  const notes = await fetchNotesByMember(memberId);
  return notes.filter(n => !n.usedInMeetingId);
};

export const addNote = async (note: Omit<MemberNote, 'id' | 'createdAt'>): Promise<MemberNote> => {
  const newNote: MemberNote = {
    ...note,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  if (!db) {
    const notes = await fetchNotes();
    const updated = [newNote, ...notes];
    localStorage.setItem('one-to-one-notes', JSON.stringify(updated));
    return newNote;
  }

  const docRef = await addDoc(collection(db, 'notes'), {
    ...note,
    createdAt: Timestamp.now(),
  });

  return { ...newNote, id: docRef.id };
};

export const markNotesAsUsed = async (noteIds: string[], meetingId: string): Promise<void> => {
  if (!db) {
    const notes = await fetchNotes();
    const updated = notes.map(n =>
      noteIds.includes(n.id) ? { ...n, usedInMeetingId: meetingId } : n
    );
    localStorage.setItem('one-to-one-notes', JSON.stringify(updated));
    return;
  }

  // En Firebase, on met à jour chaque note
  for (const noteId of noteIds) {
    const noteRef = doc(db, 'notes', noteId);
    await updateDoc(noteRef, { usedInMeetingId: meetingId });
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  if (!db) {
    const notes = await fetchNotes();
    const updated = notes.filter(n => n.id !== noteId);
    localStorage.setItem('one-to-one-notes', JSON.stringify(updated));
    return;
  }

  await deleteDoc(doc(db, 'notes', noteId));
};

// ============ ONE-TO-ONE REQUESTS ============

export const fetchRequests = async (): Promise<OneToOneRequest[]> => {
  if (!db) {
    const stored = localStorage.getItem('one-to-one-requests');
    return stored ? JSON.parse(stored) : [];
  }

  const requestsRef = collection(db, 'requests');
  const q = query(requestsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    resolvedAt: doc.data().resolvedAt?.toDate() || undefined,
  })) as OneToOneRequest[];
};

export const fetchPendingRequests = async (): Promise<OneToOneRequest[]> => {
  const requests = await fetchRequests();
  return requests.filter(r => !r.resolvedAt);
};

export const addRequest = async (request: Omit<OneToOneRequest, 'id' | 'createdAt'>): Promise<OneToOneRequest> => {
  const newRequest: OneToOneRequest = {
    ...request,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  if (!db) {
    const requests = await fetchRequests();
    const updated = [newRequest, ...requests];
    localStorage.setItem('one-to-one-requests', JSON.stringify(updated));
    return newRequest;
  }

  const docRef = await addDoc(collection(db, 'requests'), {
    ...request,
    createdAt: Timestamp.now(),
  });

  return { ...newRequest, id: docRef.id };
};

export const resolveRequest = async (requestId: string): Promise<void> => {
  if (!db) {
    const requests = await fetchRequests();
    const updated = requests.map(r =>
      r.id === requestId ? { ...r, resolvedAt: new Date() } : r
    );
    localStorage.setItem('one-to-one-requests', JSON.stringify(updated));
    return;
  }

  const requestRef = doc(db, 'requests', requestId);
  await updateDoc(requestRef, { resolvedAt: Timestamp.now() });
};

// ============ MEMBER BY ACCESS CODE ============

export const getMemberByAccessCode = async (code: string): Promise<TeamMember | null> => {
  const members = await fetchMembers();
  return members.find(m => m.accessCode === code) || null;
};
