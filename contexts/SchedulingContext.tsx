'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import {
  Appointment,
  Worker,
  Client,
  Team,
  Groupe,
  User,
  Report,
  Service,
  ServiceTreeItem,
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

interface ServiceOption {
  id: string;
  name: string;        // Название с duration и price: "Ganzkörperwäsche, 30 Min, 25€"
  fullPath: string;    // Полный путь для чипов: "Ganzkörperwäsche - Körperpflege - Grundpflege"
}

interface ServiceGroupForSelect {
  id: string;
  label: string;
  options: ServiceOption[];
}

interface ServicesForSelect {
  rootServices: ServiceOption[];
  groups: ServiceGroupForSelect[];
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
  services: ServiceTreeItem[];
  firmaID: string;
  isLoading: boolean;
  selectedWorker: Worker | null;
  selectedClient: Client | null;
  selectedDate: Date;
  selectedAppointment: Appointment | null;
}

// Appointment с обязательным client для отображения на карте
export interface AppointmentWithClient extends Appointment {
  client: Client;
}

// Тип для вычисляемых данных (derived state)
interface SchedulingDerived {
  groupedClients: GroupedClients[];
  teamsWithWorkers: TeamsWithWorkers[];
  todayAppointments: AppointmentWithClient[];
  servicesForSelect: ServicesForSelect;
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
  addService: (service: ServiceTreeItem) => void;
  updateService: (service: ServiceTreeItem) => void;
  deleteService: (id: string) => void;
  refreshData: () => void;
  openAppointment: (appointmentId: string) => void;
}

// Комбинированный тип для контекста
type SchedulingContextType = SchedulingState & SchedulingActions & SchedulingDerived;

// Создаем контекст
const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined);

// Провайдер контекста
export const SchedulingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mountIdRef = useRef(Math.random().toString(36).slice(2, 8))

  const [state, setState] = useState<SchedulingState>({
    user: null,
    teams: [],
    groups: [],
    workers: [],
    clients: [],
    appointments: [],
    reports: [],
    services: [],
    firmaID: '',
    isLoading: true,
    selectedWorker: null,
    selectedClient: null,
    selectedDate: new Date(),
    selectedAppointment: null,
  });

  // Логируем монтирование/размонтирование
  useEffect(() => {
    console.log(`🟢 SchedulingProvider MOUNTED [${mountIdRef.current}]`)
    return () => {
      console.log(`🔴 SchedulingProvider UNMOUNTED [${mountIdRef.current}]`)
    }
  }, [])

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
        services: mockData.services,
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

    addService: (service) => {
      console.log('Adding new service:', service);
      setState((prev) => ({
        ...prev,
        services: [...prev.services, service],
      }));
    },

    updateService: (updatedService) => {
      console.log('Updating service:', updatedService);
      setState((prev) => ({
        ...prev,
        services: prev.services.map((service) =>
          service.id === updatedService.id ? updatedService : service
        ),
      }));
    },

    deleteService: (id) => {
      console.log('Deleting service:', id);
      setState((prev) => {
        // Рекурсивно собираем все ID для удаления (сам элемент + все дочерние)
        const getChildIds = (parentId: string): string[] => {
          const children = prev.services.filter((s) => s.parentId === parentId);
          return children.flatMap((child) => [child.id, ...getChildIds(child.id)]);
        };
        const idsToDelete = [id, ...getChildIds(id)];
        return {
          ...prev,
          services: prev.services.filter((service) => !idsToDelete.includes(service.id)),
        };
      });
    },

    refreshData: () => {
      loadMockData();
    },

    openAppointment: (appointmentId) => {
      setState((prev) => {
        const appointment = prev.appointments.find((apt) => apt.id === appointmentId);
        if (!appointment) return prev;

        return {
          ...prev,
          appointments: prev.appointments.map((apt) =>
            apt.id === appointmentId
              ? { ...apt, isOpen: true, openedAt: new Date() }
              : apt
          ),
        };
      });
    }
  }), []); // Без зависимостей, так как все функции используют setState с функциональным обновлением

  // Конвертация дерева услуг в формат для select с optgroup
  const servicesForSelect = useMemo<ServicesForSelect>(() => {
    const rootServices: ServiceOption[] = [];
    const groups: ServiceGroupForSelect[] = [];

    // Функция для построения цепочки родителей группы (вершина справа)
    const buildGroupChain = (groupId: string): string => {
      const group = state.services.find(s => s.id === groupId && s.isGroup);
      if (!group) return '';

      const chain: string[] = [group.name];
      let currentParentId = group.parentId;

      while (currentParentId) {
        const parent = state.services.find(s => s.id === currentParentId && s.isGroup);
        if (parent) {
          chain.push(parent.name);
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }

      // chain = ['Körperpflege', 'Grundpflege'] → 'Körperpflege - Grundpflege'
      return chain.join(' - ');
    };

    // Функция для построения полного пути услуги (услуга - родители)
    const buildServiceFullPath = (serviceName: string, parentId: string | null): string => {
      if (!parentId) return serviceName;

      const parentChain = buildGroupChain(parentId);
      return parentChain ? `${serviceName} - ${parentChain}` : serviceName;
    };

    // Функция для форматирования названия услуги с duration и price
    const formatServiceName = (service: Service): string => {
      const parts = [service.name];
      if (service.duration) parts.push(`${service.duration} Min`);
      if (service.price) parts.push(`${service.price}€`);
      return parts.join(', ');
    };

    // Рекурсивная функция для обхода дерева и сбора групп с услугами
    const processGroup = (parentId: string | null) => {
      const children = state.services.filter(s => s.parentId === parentId);

      // Сначала обрабатываем услуги (isGroup = false)
      const services = children.filter((s): s is Service => !s.isGroup);
      const serviceOptions: ServiceOption[] = services.map(service => ({
        id: service.id,
        name: formatServiceName(service),
        fullPath: buildServiceFullPath(service.name, service.parentId),
      }));

      // Если это корневой уровень и есть услуги — добавляем в rootServices
      if (parentId === null && serviceOptions.length > 0) {
        rootServices.push(...serviceOptions);
      }

      // Обрабатываем подгруппы (isGroup = true)
      const subgroups = children.filter(s => s.isGroup);
      for (const group of subgroups) {
        // Получаем услуги непосредственно в этой группе
        const groupChildren = state.services.filter(s => s.parentId === group.id);
        const groupServices = groupChildren.filter((s): s is Service => !s.isGroup);

        // Если в группе есть услуги — добавляем как optgroup
        if (groupServices.length > 0) {
          const options: ServiceOption[] = groupServices.map(service => ({
            id: service.id,
            name: formatServiceName(service),
            fullPath: buildServiceFullPath(service.name, service.parentId),
          }));

          groups.push({
            id: group.id,
            label: buildGroupChain(group.id),
            options,
          });
        }

        // Рекурсивно обрабатываем вложенные группы
        processGroup(group.id);
      }
    };

    // Начинаем с корневых элементов
    processGroup(null);

    return { rootServices, groups };
  }, [state.services]);

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

  // Appointments на сегодня с привязанными клиентами (для карты)
  const todayAppointments = useMemo<AppointmentWithClient[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return state.appointments
      .filter(apt => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      })
      .map(apt => {
        const client = state.clients.find(c => c.id === apt.clientID);
        if (!client) return null;
        return { ...apt, client };
      })
      .filter((apt): apt is AppointmentWithClient => apt !== null)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [state.appointments, state.clients]);

  // Мемоизируем contextValue для предотвращения лишних ре-рендеров потребителей контекста
  const contextValue: SchedulingContextType = useMemo(() => ({
    ...state,
    ...actions,
    groupedClients,
    teamsWithWorkers,
    todayAppointments,
    servicesForSelect,
  }), [state, actions, groupedClients, teamsWithWorkers, todayAppointments, servicesForSelect]);

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
