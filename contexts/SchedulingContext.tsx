'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Appointment,
  Worker,
  Client,
  Team,
  Groupe,
  User,
  Report,
} from '@/types/scheduling';
import getAllSampleObjects from '@/lib/scheduling-mock-data';

// Тип для состояния планирования
interface SchedulingState {
  user: User | null;
  teams: Team[];
  groups: Groupe[];
  workers: Worker[];
  clients: Client[];
  appointments: Appointment[];
  reports: Report[];
  firmaID: string;
  isLoading: boolean;
  selectedWorker: Worker | null;
  selectedClient: Client | null;
  selectedDate: Date;
  selectedAppointment: Appointment | null;
}

// Тип для действий (actions)
interface SchedulingActions {
  setSelectedWorker: (worker: Worker | null) => void;
  setSelectedClient: (client: Client | null) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
  moveAppointmentToDate: (appointmentId: string, newDate: Date) => void;
  refreshData: () => void;
}

// Комбинированный тип для контекста
type SchedulingContextType = SchedulingState & SchedulingActions;

// Создаем контекст
const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined);

// Провайдер контекста
export const SchedulingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SchedulingState>({
    user: null,
    teams: [],
    groups: [],
    workers: [],
    clients: [],
    appointments: [],
    reports: [],
    firmaID: '',
    isLoading: true,
    selectedWorker: null,
    selectedClient: null,
    selectedDate: new Date(),
    selectedAppointment: null,
  });

  // Инициализация данных при монтировании
  useEffect(() => {
    loadMockData();
  }, []);

  // Загрузка mock данных
  const loadMockData = () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const mockData = getAllSampleObjects();

      setState({
        user: mockData.user,
        teams: mockData.teams,
        groups: mockData.groups,
        workers: mockData.workers,
        clients: mockData.clients,
        appointments: mockData.appointments,
        reports: mockData.reports,
        firmaID: mockData.firmaID,
        isLoading: false,
        selectedWorker: null,
        selectedClient: null,
        selectedDate: new Date(),
        selectedAppointment: null,
      });

      console.log('Mock data loaded successfully:', {
        workers: mockData.workers.length,
        clients: mockData.clients.length,
        appointments: mockData.appointments.length,
      });
    } catch (error) {
      console.error('Error loading mock data:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Действия для управления состоянием - мемоизированы для предотвращения лишних ре-рендеров
  const actions: SchedulingActions = useMemo(() => ({
    setSelectedWorker: (worker) => {
      setState((prev) => ({ ...prev, selectedWorker: worker }));
    },

    setSelectedClient: (client) => {
      setState((prev) => ({ ...prev, selectedClient: client }));
    },

    setSelectedDate: (date) => {
      setState((prev) => ({ ...prev, selectedDate: date }));
    },

    setSelectedAppointment: (appointment) => {
      setState((prev) => ({ ...prev, selectedAppointment: appointment }));
    },

    addAppointment: (appointment) => {
      setState((prev) => ({
        ...prev,
        appointments: [...prev.appointments, appointment],
      }));
    },

    updateAppointment: (updatedAppointment) => {
      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((apt) =>
          apt.id === updatedAppointment.id ? updatedAppointment : apt
        ),
      }));
    },

    deleteAppointment: (id) => {
      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.filter((apt) => apt.id !== id),
      }));
    },

    moveAppointmentToDate: (appointmentId, newDate) => {
      setState((prev) => {
        const appointment = prev.appointments.find((apt) => apt.id === appointmentId);
        if (!appointment) return prev;

        // Вычисляем разницу в днях между старой и новой датой
        const oldDate = appointment.date;
        const timeDiff = newDate.getTime() - oldDate.getTime();
        const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

        // Обновляем дату и времена назначения
        const newStartTime = new Date(appointment.startTime);
        newStartTime.setDate(newStartTime.getDate() + daysDiff);

        const newEndTime = new Date(appointment.endTime);
        newEndTime.setDate(newEndTime.getDate() + daysDiff);

        const updatedAppointment: Appointment = {
          ...appointment,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
        };

        console.log('Moving appointment:', {
          id: appointmentId,
          oldDate: oldDate.toLocaleDateString(),
          newDate: newDate.toLocaleDateString(),
          daysDiff,
        });

        return {
          ...prev,
          appointments: prev.appointments.map((apt) =>
            apt.id === appointmentId ? updatedAppointment : apt
          ),
        };
      });
    },

    refreshData: () => {
      loadMockData();
    },
  }), []); // Без зависимостей, так как все функции используют setState с функциональным обновлением

  // Мемоизируем contextValue для предотвращения лишних ре-рендеров потребителей контекста
  const contextValue: SchedulingContextType = useMemo(() => ({
    ...state,
    ...actions,
  }), [state, actions]);

  return (
    <SchedulingContext.Provider value={contextValue}>
      {children}
    </SchedulingContext.Provider>
  );
};

// Hook для использования контекста
export const useScheduling = (): SchedulingContextType => {
  const context = useContext(SchedulingContext);
  if (context === undefined) {
    throw new Error('useScheduling must be used within a SchedulingProvider');
  }
  return context;
};

// Экспорт для удобства
export default SchedulingContext;
