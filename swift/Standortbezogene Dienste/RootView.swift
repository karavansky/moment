//
//  RootView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import SwiftUI
import SwiftData

struct RootView: View {

  var body: some View {
 
      TabView {
        Group {
          DienstplanView(isClients: true)
            .tabItem {
                Label("Dienstplan", systemImage: "calendar")
            }
          ClientsView()
            .tabItem {
                Label("Kunden", systemImage: "person.2.fill")
            }
          DienstplanView(isClients: true)
            .tabItem {
                Label("Fachkräfte", systemImage: "figure.walk")
            }
          SettingsView()
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        } 
      }   
  }
 
}
/*
struct RootView: View {
    @Environment(\.modelContext) private var modelContext
  enum Tab {
      case library
      case test
      case vocabulary
      case settings
  }
  @State private var selection: Tab = .library
    var body: some View {
      TabView(selection: $selection) {
        ClientsView()
              .tabItem {
//                Text("Dienstplan")
                  Label("Dienstplan", systemImage: "doc.on.doc")
              }
              .tag(Tab.library)
//          TesterView()
//              .tabItem {
//                  Label("Prüfen", systemImage: "checklist")
//              }
//              .tag(Tab.test)
//          VocabularyHome()
//              .tabItem {
//                  Label("Wortschatz", systemImage: "list.triangle")
//              }
//              .tag(Tab.vocabulary)
////            TestContentView()
//          SettingsHome()
//              .tabItem {
//                  Label("Einstellungen", systemImage: "gear")
//              }
//              .tag(Tab.settings)
      }
      .onAppear(perform: {
          let actorQueueLabel = DispatchQueue.currentLabel
          print("HomeScreen queue:",actorQueueLabel)
      })
//        NavigationSplitView {
//            List {
//                ForEach(items) { item in
//                    NavigationLink {
//                        Text("Item at \(item.timestamp, format: Date.FormatStyle(date: .numeric, time: .standard))")
//                    } label: {
//                        Text(item.timestamp, format: Date.FormatStyle(date: .numeric, time: .standard))
//                    }
//                }
//                .onDelete(perform: deleteItems)
//            }
//#if os(macOS)
//            .navigationSplitViewColumnWidth(min: 180, ideal: 200)
//#endif
//            .toolbar {
//#if os(iOS)
//                ToolbarItem(placement: .navigationBarTrailing) {
//                    EditButton()
//                }
//#endif
//                ToolbarItem {
//                    Button(action: addItem) {
//                        Label("Add Item", systemImage: "plus")
//                    }
//                }
//            }
//        } detail: {
//            Text("Select an item")
//        }
    }

//    private func addItem() {
//        withAnimation {
//            let newItem = Item(timestamp: Date())
//            modelContext.insert(newItem)
//        }
//    }
//
//    private func deleteItems(offsets: IndexSet) {
//        withAnimation {
//            for index in offsets {
//                modelContext.delete(items[index])
//            }
//        }
//    }
}
*/
#Preview {
  let container = try! ModelContainer.sample()
  RootView()
    .modelContainer(container)

//        .modelContainer(for: Item.self, inMemory: true)
}
