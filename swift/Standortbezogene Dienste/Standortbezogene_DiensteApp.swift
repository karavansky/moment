//
//  Standortbezogene_DiensteApp.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import SwiftUI
import SwiftData

@main
struct Standortbezogene_DiensteApp: App {
  
//    var sharedModelContainer: ModelContainer = {
//        let schema = Schema([
//          Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
//        ])
//        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
//
//        do {
//            print("ModelContainer created successfully")
//            return try ModelContainer(for: schema, configurations: [modelConfiguration])
//        } catch {
//            fatalError("Could not create ModelContainer: \(error)")
//        }
//    }()
  
    var body: some Scene { 
        WindowGroup {
            ContentView()
            .environmentObject(Auth.shared)

        }
//        .modelContainer(sharedModelContainer)
    }
}


/*
@main
struct Standortbezogene_DiensteApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
          Appointment.self, User.self, Worker.self, Client.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
          TabView {
            Group {
              if UIDevice.current.userInterfaceIdiom != .phone {
                
              } else {
                
              }
              DienstplanView()
                .tabItem {
                    Label("Dienstplan", systemImage: "calendar")
                }
              ClientsView()
                .tabItem {
                    Label("Kunden", systemImage: "person.2.fill")
                }
                .modelContainer(try! ModelContainer.sample())

              DienstplanView()
                .tabItem {
                    Label("Fachkräfte", systemImage: "figure.walk")
                }
              SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
            }
          }
          
//          ContentView()
//            .environmentObject(Auth.shared)

        }
        .modelContainer(sharedModelContainer)
    }
}

*/

