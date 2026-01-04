//
//  WorkersListView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation
import SwiftUI
import SwiftData

struct WorkersListView: View {
  @Environment(\.modelContext) private var modelContext
  @Query(sort: \Worker.workerName, order: .forward)  var workers: [Worker]

    var body: some View {
      VStack(alignment: .center) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .frame(maxWidth: .infinity)
                    .foregroundColor(Color(.secondarySystemFill))

                VStack(alignment: .leading, spacing: 12) {
                    ForEach(workers, id: \.id) { worker in
                      Text(worker.workerName)
                            .padding(12)
#if os(macOS)
                            .background(Color(NSColor.gridColor))
#endif
                      #if os(iOS)
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                      #endif
                            .cornerRadius(8)
                            .shadow(radius: 1, x: 1, y: 1)
                            .draggable(worker.persistentModelID)
                    }

                    Spacer()
                }
                .padding(.vertical)
            }
        }
    }
}
#Preview {
  WorkersListView()
      .modelContainer(try! ModelContainer.sample())

//        .modelContainer(for: Item.self, inMemory: true)
}
