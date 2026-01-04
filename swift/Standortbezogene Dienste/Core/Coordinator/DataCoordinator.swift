//
//  DataCoordinator.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 26.11.24.
//

import Foundation
import SwiftData
import SwiftUI

enum InitType {
  case normal, demo
}

@MainActor
class DataCoordinator: NSObject {
  
  static let identifier: String = "DataCoordinator"
  static let shared = DataCoordinator()
//  let configuration: Configuration = Configuration()
  var container: ModelContainer? = nil
//  let persistentContainer: ModelContainer = {
//    do {
//      let schema = Schema([
//        Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
//      ])
//      let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
//      let container = try  ModelContainer(for: schema, configurations: [modelConfiguration])
//      return container
//    } catch {
//      fatalError("Failed to create container: \(error.localizedDescription)")
//    }
//  }()
//  let persistentContainerSample: ModelContainer = {
//    do {
//      let schema = Schema([
//        Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
//      ])
//      let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
//      let container = try  ModelContainer(for: schema, configurations: [modelConfiguration])
//
//      return container
//    } catch {
//      fatalError("Failed to create container: \(error.localizedDescription)")
//    }
//  }()
  
  func initialize(type: InitType) {
    debugPrint("\(DataCoordinator.identifier) initialize")
    if type == .demo {
          do {
            let schema = Schema([
              Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
            ])
            let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            let container = try  ModelContainer(for: schema, configurations: [modelConfiguration])
      
            self.container = container
            print("ModelContainer in initialize DataCoordinator created successfully")
            getAllSampleObjects()
          } catch {
            fatalError("Failed to create container: \(error.localizedDescription)")
          }
    } else {
      do {
        let schema = Schema([
          Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        let container = try  ModelContainer(for: schema, configurations: [modelConfiguration])
  
        self.container =  container
      } catch {
        fatalError("Failed to create container: \(error.localizedDescription)")
      }
    }
//    getAllSampleObjects()
  }
  
  func getAllSampleObjects(){
    if let container {
      var calendar = Calendar(identifier: .gregorian)
      calendar.timeZone = .current
      calendar.locale = Locale.preferredLocale() //(identifier: "ru_RU") // Locale.current
      let currentDate = Date()
      let firmaID = UUID()
      let user = User(id: UUID(), firmaID: firmaID, userName: "Warsteiner")
      let team1 = Team(id: UUID(), firmaID: firmaID, worker: [], teamName: "Pflege")
      let team2 = Team(id: UUID(), firmaID: firmaID, worker: [], teamName: "Reinigung")
      let group1 = Category(id: UUID(), firmaID: firmaID, clients: [], categoryName: "VIP")
      let group2 = Category(id: UUID(), firmaID: firmaID, clients: [], categoryName: "Normal")
      let worker_1 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schmidt", appointments: [], team: team1)
      let worker_2 = Worker(id: UUID(), firmaID: firmaID, workerName: "Müller", appointments: [], team: team2)
      let worker_3 = Worker(id: UUID(), firmaID: firmaID, workerName: "Meyer", appointments: [], team: team1)
      let worker_4 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schulz", appointments: [], team: team1)
      let worker_5 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schneider", appointments: [], team: team1)
      let worker_6 = Worker(id: UUID(), firmaID: firmaID, workerName: "Hoffmann", appointments: [], team: team1)
      let worker_7 = Worker(id: UUID(), firmaID: firmaID, workerName: "Becker", appointments: [], team: team1)
      let worker_8 = Worker(id: UUID(), firmaID: firmaID, workerName: "Fischer", appointments: [], team: team1)
      let worker_11 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schmidt", appointments: [], team: team2)
      let worker_21 = Worker(id: UUID(), firmaID: firmaID, workerName: "Müller", appointments: [], team: team2)
      let worker_31 = Worker(id: UUID(), firmaID: firmaID, workerName: "Meyer", appointments: [], team: team2)
      let worker_41 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schulz", appointments: [], team: team2)
      let worker_51 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schneider", appointments: [], team: team2)
      let worker_61 = Worker(id: UUID(), firmaID: firmaID, workerName: "Hoffmann", appointments: [], team: team2)
      let worker_71 = Worker(id: UUID(), firmaID: firmaID, workerName: "Becker", appointments: [], team: team2)
      let worker_81 = Worker(id: UUID(), firmaID: firmaID, workerName: "Fischer", appointments: [], team: team2)
      let client_1 = Client(id: UUID(), firmaID: firmaID, clientName: "Wagner", strasse: "Burgstarsse", plz: "53177", ort: "München", houseNumber: "157", latitude: 0, longitude: 0, appointments: [], category: group1)
      let client_2 = Client(id: UUID(), firmaID: firmaID, clientName: "Zimmermann", strasse: "Karl-Friedrich-Schinkel-Str", plz: "53127", ort: "Bonn-Ippendorf", houseNumber: "157", latitude: 0, longitude: 0, appointments: [], category: group2)
      let appointmentDate_1 = calendar.date(byAdding: .day, value: -1, to: currentDate)!
      let appointmentDate_2 = calendar.date(byAdding: .day, value: -3, to: currentDate)!
      let appointmentDate_3 = calendar.date(byAdding: .day, value: 3, to: currentDate)!
      let appointmentDate_4 = calendar.date(byAdding: .day, value: 4, to: currentDate)!
      let appointmentDate_5 = calendar.date(byAdding: .day, value: -2, to: currentDate)!
      let appointmentDate_6 = calendar.date(byAdding: .day, value: 0, to: currentDate)!
      let appointmentDate_7 = calendar.date(byAdding: .day, value: 1, to: currentDate)!
      let appointmentDate_8 = calendar.date(byAdding: .day, value: 3, to: currentDate)!
      
      let appointment_1 = Appointment(id: UUID(), userID: worker_1.id, clientID: client_1.id, client: client_1, date: appointmentDate_1.onlyDate!, startTime: appointmentDate_1, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_1)!, worker: worker_1, duration: 90, fahrzeit: 0)
      
      let appointment_2 = Appointment(id: UUID(), userID: worker_2.id, clientID: client_1.id, client: client_1, date: appointmentDate_2.onlyDate!, startTime: appointmentDate_2, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_2)!, worker: worker_2, duration: 60, fahrzeit: 0)
      let appointment_3 = Appointment(id: UUID(), userID: worker_3.id, clientID: client_1.id, client: client_1, date: appointmentDate_3.onlyDate!, startTime: appointmentDate_3, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_3)!, worker: worker_3, duration: 30, fahrzeit: 0)
      let appointment_4 = Appointment(id: UUID(), userID: worker_4.id, clientID: client_1.id, client: client_1, date: appointmentDate_4.onlyDate!, startTime: appointmentDate_4, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_4)!, worker: worker_4, duration: 30, fahrzeit: 0)
      let appointment_5 = Appointment(id: UUID(), userID: worker_5.id, clientID: client_2.id, client: client_2, date: appointmentDate_5.onlyDate!, startTime: appointmentDate_5, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_5)!, worker: worker_5, duration: 60, fahrzeit: 0)
      let appointment_6 = Appointment(id: UUID(), userID: worker_6.id, clientID: client_2.id, client: client_2, date: appointmentDate_6.onlyDate!, startTime: appointmentDate_6, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_6)!, worker: worker_6, duration: 30, fahrzeit: 0)
      let appointment_7 = Appointment(id: UUID(), userID: worker_7.id, clientID: client_2.id, client: client_2, date: appointmentDate_7.onlyDate!, startTime: appointmentDate_7, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_7)!, worker: worker_7, duration: 30, fahrzeit: 0)
      let appointment_8 = Appointment(id: UUID(), userID: worker_8.id, clientID: client_2.id, client: client_2, date: appointmentDate_8.onlyDate!, startTime: appointmentDate_8, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_8)!, worker: worker_8, duration: 30, fahrzeit: 0)

      let report1 = Report(id: UUID(), firmaID: firmaID, worker: worker_1, photos: "twinlake", appointment: appointment_1)
      let report2 = Report(id: UUID(), firmaID: firmaID, worker: worker_1, photos: "chilkoottrail", appointment: appointment_1)
  //
      appointment_1.reports.append(report1)
      appointment_5.reports.append(report2)
      container.mainContext.insert(appointment_1)
      container.mainContext.insert(appointment_2)
      container.mainContext.insert(appointment_3)
      container.mainContext.insert(appointment_4)
      container.mainContext.insert(appointment_5)
      container.mainContext.insert(appointment_6)
      container.mainContext.insert(appointment_7)
      container.mainContext.insert(appointment_8)

      print("Inserted sample data by DataCoordinator")
    }

  }
  
}
