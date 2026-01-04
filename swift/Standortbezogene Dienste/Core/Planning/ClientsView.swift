//
//  ClientsView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 17.11.24.
//

import SwiftUI
import SwiftData



struct ClientsView: View {
  @Environment(\.modelContext) private var modelContext
  //    @Query private var items: [Vocabulary]
  @Query(sort: \Client.clientName, order: .forward)
  private var itemsFull: [Client]
  @Query(sort: \Appointment.date, order: .forward)
  private var appoitments: [Appointment]
  
  @Query(sort: \Category.categoryName)
  private var categories: [Category]

  @Query(sort: \Team.teamName, order: .forward)
  var teams: [Team]

  
  @State private var selectedGroup = "Alle"
  
  @State private var isLoading: Bool = false
  @State private var isLoadingAll: Bool = false
  
  @State private var error: MyError? = nil
  @State private var showAlert = false
  
  @State private var progress: Double = 0.0
  @State private var progressWord: String = ""
  
  @State private var searchText = ""
  @State private var isPresented = false
  @Environment(\.dismissSearch) private var dismissSearch
  
  var resultArray: [DateApoitmentView] = []
  
  //  @Query(filter: #Predicate<Vocabulary>  { !$0.isFamous && !$0.isWiederholen }) private var itemsUnbekannt: [Vocabulary]
  //  @Query(filter: #Predicate<Vocabulary>  { $0.isWiederholen }) private var itemsWider: [Vocabulary]
  //  @Query(filter: #Predicate<Vocabulary>  { $0.isFamous && !$0.isWiederholen }) private var itemsBerumte: [Vocabulary]
  
  var items: [Client] {
    itemsFull
    //    switch currentWortschatz {
    //    case 0:
    ////      itemsFull.filter({!$0.isFamous && !$0.isWiederholen})
    //      itemsUnbekannt.filter({$0.languageWord == wortschatzSchpracheCode}).sorted(by: {$0.word < $1.word})
    //    case 1:
    //      itemsWider.filter({$0.languageWord == wortschatzSchpracheCode}).sorted(by: {$0.word < $1.word})
    //    default:
    //      itemsBerumte.filter({$0.languageWord == wortschatzSchpracheCode}).sorted(by: {$0.word < $1.word})
    //    }
  }
  var filteredItems: [Client] {
    if selectedCategory != 0 {
      if searchText.isEmpty {
        return itemsFull.filter({$0.category == categories[selectedCategory - 1]})
      } else {
        return items.filter({$0.category == categories[selectedCategory - 1]}).filter { $0.clientName.lowercased().contains(searchText.lowercased())}
      }
    } else {
      if searchText.isEmpty {
        return itemsFull
      } else {
        return items.filter { $0.clientName.lowercased().contains(searchText.lowercased())}
      }
    }
  }
  
  @State var selectedClient: Client?
  @State var naviTitle: String = "Kunden"
  @State private var sort: Int = 0
  @State private var selectedCategory: Int = 0
  struct PickerCategory {
    let id: UUID
    let categoryName: String
  }
  @State var pickerCategories: [PickerCategory] = [
    PickerCategory(id: UUID(), categoryName: "Alle"),
  ]
  
  var body: some View {
    NavigationSplitView {
//      Group {
//        SideBarView(selectedClient: $selectedClient)
        List {
          Picker(selection: $selectedCategory, label: Text("Kategorie")) {
            ForEach(Array(pickerCategories.enumerated()), id: \.offset) { index, category in
              Text(category.categoryName).tag(index)
            }
          }
          ForEach(filteredItems) { client in
            NavigationLink{
              PlanningView(client: client)
                .id(UUID())
            } label: {
              ClientCellView(client: client)
            }
            .id(UUID())
          }
        }

        
        
//        List(filteredItems, id: \.id, selection: $selectedClient) { client in
//          NavigationLink{
//            PlanningView(client: client)
//
//          } label: {
//            ClientCellView(client: client)
//          }
//          .id(UUID())
//        }
        //      .toolbar {
        //        ToolbarItem(placement: .primaryAction) {
        //          Menu {
        //            Picker( selection: $selectedGroup) {
        //              ForEach(groups, id: \.id) { group in
        //                Text(group.groupName).tag(group.groupName)
        //              }
        //            }
        //            label: {
        //              Label("Sort", systemImage: "arrow.up.arrow.down")
        //            }
        //          }
        //        }
        //      }
        .searchable(text: $searchText, isPresented: $isPresented)
        .navigationTitle("Kunden")
//        .navigationBarHidden(true)

//      } /// Group


    } detail: {
      Text("Pick a color")
//
//      if let client = selectedClient {
//        NavigationStack {
//          PlanningView2(client: client)
//        }
//      } else {
//        Text("Pick a color")
//      }
    }
//    .onChange(of: selectedCategory) {
//      switch selectedCategory {
//      case 0:
//      default :
//        filteredItems = clients.filter(\.init.categoryName == categories[0].categoryName)
//      }
//    }
    .onAppear( perform: {
        if !categories.isEmpty {
          pickerCategories.removeAll()
          pickerCategories.append(PickerCategory(id: UUID(), categoryName: "Alle"))
          for category in categories {
            pickerCategories.append(PickerCategory(id:category.id, categoryName: category.categoryName))
          }
      }
//      print("onApear allGroups.count:", groups.count )
    })
     
  }
  
  private func addItem() {
    withAnimation {
      //            let newItem = Item(timestamp: Date())
      //            modelContext.insert(newItem)
    }
  }
  
  private func deleteItems(offsets: IndexSet) {
    withAnimation {
      for index in offsets {
        modelContext.delete(items[index])
      }
    }
  }
  
}

#Preview {
 
  ClientsView()
    .modelContainer( try! ModelContainer.sample())
}

//#Preview("ModelContainerPreview") {
//  ModelContainerPreview(ModelContainer.sample) {
//    NavigationStack {
//      ClientsView()
//    }
//  }
//}
