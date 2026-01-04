//
//  SideBarView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 24.11.24.
//

import SwiftUI
import SwiftData

struct SideBarView: View {
  @Binding var selectedClient: Client?
  @Environment(\.modelContext) private var modelContext
  //    @Query private var items: [Vocabulary]
  @Query(sort: \Client.clientName, order: .forward)
  private var clients: [Client]

  var body: some View {
    List(clients, selection: $selectedClient) { client in
        NavigationLink(value: client) {
          Label(client.clientName, systemImage: "person.crop.circle")
        }
    }
  }
}
