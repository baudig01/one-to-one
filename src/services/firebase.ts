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
import type { TeamMember, Meeting } from '../types';

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
    return stored ? JSON.parse(stored) : [];
  }

  const membersRef = collection(db, 'members');
  const q = query(membersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as TeamMember[];
};

export const addMember = async (member: Omit<TeamMember, 'id' | 'createdAt'>): Promise<TeamMember> => {
  const newMember: TeamMember = {
    ...member,
    id: crypto.randomUUID(),
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
