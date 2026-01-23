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
  Notif,
} from '@/types/scheduling';
import getAllSampleObjects from '@/lib/scheduling-mock-data';

// Типы для группированных данных
interface GroupedClients {
  group: Groupe;
  clients: Client[];
}

interface TeamsWithWorkers {
  team: Team;
  workers: Worker[];
}

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
  notifications: Notif[];
}

// Тип для вычисляемых данных (derived state)
interface SchedulingDerived {
  groupedClients: GroupedClients[];
  teamsWithWorkers: TeamsWithWorkers[];
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
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addWorker: (worker: Worker) => void;
  updateWorker: (worker: Worker) => void;
  deleteWorker: (id: string) => void;
  refreshData: () => void;
  addNotification: (notification: Notif) => void;
  markNotificationAsRead: (id: string) => void;
}

// Комбинированный тип для контекста
type SchedulingContextType = SchedulingState & SchedulingActions & SchedulingDerived;

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
    notifications: [],
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
        notifications: [],
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

    addNotification: (notification: Notif) => {
      setState((prev) => ({
        ...prev,
        notifications: [...prev.notifications, notification],
      }));
    },

    markNotificationAsRead: (id: string) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((notif) =>
          notif.id === id ? { ...notif, isRead: true } : notif
        ),
      }));
    },

    addClient: (client: Client) => {
      console.log('Adding new client:', client);
      setState((prev) => ({
        ...prev,
        clients: [...prev.clients, client],
      }));
    },

    updateClient: (updatedClient) => {
      console.log('Updating client:', updatedClient);
      setState((prev) => ({
        ...prev,
        clients: prev.clients.map((client) =>
          client.id === updatedClient.id ? updatedClient : client
        ),
      }));
    },

    deleteClient: (id) => {
      console.log('Deleting client:', id);
      setState((prev) => ({
        ...prev,
        clients: prev.clients.filter((client) => client.id !== id),
        // Также удаляем все связанные appointments
        appointments: prev.appointments.filter((apt) => apt.clientID !== id),
      }));
    },
    addWorker: (worker) => {
      console.log('Adding new worker:', worker);
      setState((prev) => ({
        ...prev,
        workers: [...prev.workers, worker],
      }));
    },

    updateWorker: (updatedWorker) => {
      console.log('Updating worker:', updatedWorker);
      setState((prev) => ({
        ...prev,
        workers: prev.workers.map((worker) =>
          worker.id === updatedWorker.id ? updatedWorker : worker
        ),
      }));
    },

    deleteWorker: (id) => {
      console.log('Deleting worker:', id);
      setState((prev) => ({
        ...prev,
        workers: prev.workers.filter((worker) => worker.id !== id),
        // Также удаляем все связанные appointments
        appointments: prev.appointments.filter((apt) => apt.workerId !== id),
      }));
    },
    refreshData: () => {
      loadMockData();
    },
  }), []); // Без зависимостей, так как все функции используют setState с функциональным обновлением

  // Группировка клиентов по группам - вычисляется при изменении clients или groups
  const groupedClients = useMemo<GroupedClients[]>(() => {
    return state.groups
      .map(group => ({
        group,
        clients: state.clients
          .filter(c => c.groupe?.id === group.id)
          .sort((a, b) =>
            a.surname.localeCompare(b.surname, undefined, {
              sensitivity: 'base',
              numeric: true,
            })
          ),
      }))
      .filter(({ clients }) => clients.length > 0);
  }, [state.groups, state.clients]);

  // Группировка workers по teams - вычисляется при изменении workers или teams
  const teamsWithWorkers = useMemo<TeamsWithWorkers[]>(() => {
    return state.teams
      .map(team => ({
        team,
        workers: state.workers
          .filter(w => w.teamId === team.id)
          .sort((a, b) =>
            a.surname.localeCompare(b.surname, undefined, {
              sensitivity: 'base',
              numeric: true,
            })
          ),
      }))
      .filter(({ workers }) => workers.length > 0);
  }, [state.teams, state.workers]);

  // Мемоизируем contextValue для предотвращения лишних ре-рендеров потребителей контекста
  const contextValue: SchedulingContextType = useMemo(() => ({
    ...state,
    ...actions,
    groupedClients,
    teamsWithWorkers,
  }), [state, actions, groupedClients, teamsWithWorkers]);

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
