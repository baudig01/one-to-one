import { useState, useEffect, useCallback } from 'react';
import type { TeamMember, Meeting, OneToOneRequest } from '../types';
import {
  fetchMembers,
  fetchMeetings,
  addMember as addMemberService,
  updateMember as updateMemberService,
  deleteMember as deleteMemberService,
  addMeeting as addMeetingService,
  updateMeeting as updateMeetingService,
  deleteMeeting as deleteMeetingService,
  fetchPendingRequests,
  resolveRequest as resolveRequestService,
  isFirebaseConfigured,
} from '../services/firebase';

export function useData() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [requests, setRequests] = useState<OneToOneRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, meetingsData, requestsData] = await Promise.all([
          fetchMembers(),
          fetchMeetings(),
          fetchPendingRequests(),
        ]);
        setMembers(membersData);
        setMeetings(meetingsData);
        setRequests(requestsData);
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Member operations
  const addMember = useCallback(async (member: Omit<TeamMember, 'id' | 'createdAt'>) => {
    try {
      const newMember = await addMemberService(member);
      setMembers(prev => [newMember, ...prev]);
      return newMember;
    } catch (err) {
      console.error('Error adding member:', err);
      throw err;
    }
  }, []);

  const updateMember = useCallback(async (member: TeamMember) => {
    try {
      await updateMemberService(member);
      setMembers(prev => prev.map(m => m.id === member.id ? member : m));
    } catch (err) {
      console.error('Error updating member:', err);
      throw err;
    }
  }, []);

  const deleteMember = useCallback(async (memberId: string) => {
    try {
      await deleteMemberService(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error deleting member:', err);
      throw err;
    }
  }, []);

  // Meeting operations
  const addMeeting = useCallback(async (meeting: Meeting) => {
    try {
      const newMeeting = await addMeetingService(meeting);
      setMeetings(prev => [newMeeting, ...prev]);
      return newMeeting;
    } catch (err) {
      console.error('Error adding meeting:', err);
      throw err;
    }
  }, []);

  const updateMeeting = useCallback(async (meeting: Meeting) => {
    try {
      await updateMeetingService(meeting);
      setMeetings(prev => prev.map(m => m.id === meeting.id ? meeting : m));
    } catch (err) {
      console.error('Error updating meeting:', err);
      throw err;
    }
  }, []);

  const deleteMeeting = useCallback(async (meetingId: string) => {
    try {
      await deleteMeetingService(meetingId);
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
    } catch (err) {
      console.error('Error deleting meeting:', err);
      throw err;
    }
  }, []);

  // Request operations
  const resolveRequest = useCallback(async (requestId: string, scheduledAt?: Date) => {
    try {
      await resolveRequestService(requestId, scheduledAt);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Error resolving request:', err);
      throw err;
    }
  }, []);

  return {
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
    isFirebaseConfigured: isFirebaseConfigured(),
  };
}
