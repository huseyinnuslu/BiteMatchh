import { createContext, useState } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

export const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  const createRoom = async (name, options, category, priceRange, timeLimit, filmPreferences = {}) => {
    setLoading(true);
    // A match belongs to one room only; never carry it into a newly created room.
    setMatchResult(null);
    try {
      const { data } = await api.post('/rooms', { name, options, category, priceRange, timeLimit, ...filmPreferences });
      setCurrentRoom(data);
      toast.success('Oda başarıyla kuruldu!');
      return { success: true, roomId: data._id };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Oda kurulamadı';
      toast.error(msg);
      return { success: false, message: msg, activeRoom: error.response?.data?.activeRoom || null };
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomId) => {
    setLoading(true);
    setMatchResult(null);
    try {
      const { data } = await api.put(`/rooms/${roomId}/join`);
      setCurrentRoom(data);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Odaya katılınamadı';
      toast.error(msg);
      return { success: false, message: msg, activeRoom: error.response?.data?.activeRoom || null };
    } finally {
      setLoading(false);
    }
  };

  const getMyRooms = async () => {
    try {
      const { data } = await api.get('/rooms');
      return data;
    } catch (error) {
      console.error("Fetch rooms error", error);
      return [];
    }
  };

  const deleteRoom = async (roomId) => {
    try {
      await api.delete(`/rooms/${roomId}`);
      toast.success('Oda silindi');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Silinemedi');
      return false;
    }
  };

  const leaveRoom = async (roomId) => {
    try {
      const { data } = await api.put(`/rooms/${roomId}/leave`);
      setCurrentRoom(null);
      setMatchResult(null);
      return { success: true, ...data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Odadan ayrılamadın';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const startRoom = async (roomId) => {
    try {
      const { data } = await api.put(`/rooms/${roomId}/start`);
      setCurrentRoom(data);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Oda başlatılamadı');
      return false;
    }
  };

  const fetchRoomStatus = async (roomId) => {
    try {
      const { data } = await api.get(`/rooms/${roomId}`);
      setCurrentRoom(data);
      // Clear any result from a previously viewed room unless this room is finished.
      setMatchResult(data.status === 'finished' ? data.matchResult : null);
      return data;
    } catch (error) {
      console.error("Room status error", error);
    }
  };

  const swipe = async (roomId, optionId, decision) => {
    try {
      const { data } = await api.post(`/swipes`, { roomId, optionId, decision });
      if (data.match) {
        setMatchResult(data.matchedOption);
      }
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Kaydırma işlemi başarısız');
      return false;
    }
  };

  const resetRoom = () => {
    setCurrentRoom(null);
    setMatchResult(null);
  };

  return (
    <RoomContext.Provider value={{ 
      currentRoom, setCurrentRoom, loading, matchResult, 
      createRoom, joinRoom, fetchRoomStatus, swipe, resetRoom, getMyRooms, deleteRoom, leaveRoom, startRoom, setMatchResult
    }}>
      {children}
    </RoomContext.Provider>
  );
};
