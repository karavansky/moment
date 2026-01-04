//
//  ContentView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import SwiftUI
import SwiftData

struct ContentView: View {
  
//  var sharedModelContainer: ModelContainer = {
//      let schema = Schema([
//        Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
//      ])
//      let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
//
//      do {
//          print("ModelContainer created successfully")
//          return try ModelContainer(for: schema, configurations: [modelConfiguration])
//      } catch {
//          fatalError("Could not create ModelContainer: \(error)")
//      }
//  }()
//  var sharedModelContainerDemo: ModelContainer = {
//      let schema = Schema([
//        Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
//      ])
//    let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
//
//      do {
//          print("ModelContainer created successfully")
//          return try ModelContainer(for: schema, configurations: [modelConfiguration])
//      } catch {
//          fatalError("Could not create ModelContainer: \(error)")
//      }
//  }()
    let coordinator = DataCoordinator.shared
  
    @EnvironmentObject var auth: Auth
  
  
    var body: some View {
      if  auth.isDemo { //auth.loggedIn ||
        if let container = coordinator.container {
          RootView()
            .modelContainer(container)
        } else {
          fatalError("Could not create ModelContainer in ContentView")
        }
      } else {
          LoginView(coordinator: coordinator)
      }
    }
 

}
//struct RootScreen_Previews: PreviewProvider {
//    static var previews: some View {
//        RootView()
//            .environmentObject(Auth.shared)
//
//    }
//}

#Preview {
    let container = try! ModelContainer.sample()
    ContentView()
    .modelContainer(container)
      .environmentObject(Auth.shared)

//        .modelContainer(for: Item.self, inMemory: true)
}
