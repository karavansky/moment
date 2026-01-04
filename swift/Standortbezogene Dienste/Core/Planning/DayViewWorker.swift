//
//  DayViewWorker.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 19.11.24.
//

import SwiftData
import SwiftUI

struct DayViewWorker: View {

  @Query(sort: \Worker.workerName, order: .forward)
  var workers: [Worker]

  @Binding var dayAppoitments: DateApoitmentView
  
  let items = [1, 2, 3, 4, 5, 6, 7]
  
  @State var isTargeted: Bool = false
  let stripeHeight = 7.0

  var body: some View {
    GeometryReader { geometry in
      ZStack {
        RoundedRectangle(cornerRadius: 12)
#if os(macOS)
          .fill(isTargeted ? .teal.opacity(0.2) : Color(NSColor.gridColor))
#endif
#if os(iOS)
          .fill(isTargeted ? .teal.opacity(0.2) : Color(UIColor.systemBackground))
#endif
//          .foregroundColor(.black)
//          .frame(width: geometry.size.width / 5.5)
//          .border(Color.white, width: 1)
        VStack {
          VStack(alignment: .center) {
            Text(dayAppoitments.dayOfWeek)
#if os(macOS)
              .foregroundColor(Color(NSColor.controlTextColor))
#endif
#if os(iOS)
          .foregroundColor(Color(UIColor.label))
#endif
              .font(.caption)
              .padding(.top, 2)
            if dayAppoitments.date.onlyDate == Date().onlyDate {
              Image(systemName: "\(dayAppoitments.day).square.fill")
                .symbolRenderingMode(.palette)
                .foregroundStyle(Color.primary, Color.accentColor)
                .font(.system(size: 33))
          //      .font(.title)
  //              .padding(1)

            } else {
              Image(systemName: "\(dayAppoitments.day).square.fill")
                .symbolRenderingMode(.palette)
#if os(macOS)
                .foregroundStyle(Color.primary, Color(NSColor.gridColor))
#endif
#if os(iOS)
                .foregroundStyle(Color.primary, Color(UIColor.systemBackground))
#endif
                .font(.system(size: 33))
  //            Text(dateApoitmen.day)
  //              .foregroundColor(.white)
  //              .font(.headline)
  //              .fontWeight(.bold)
  //              .padding(1)
            }
          }
          .frame(
            minWidth: 0,
            maxWidth: .infinity,
            minHeight: 0,
            maxHeight: 50,
            alignment: .top)
          ScrollView {
            LazyVStack {
              ForEach(dayAppoitments.appointmens, id: \.id) { appointment in
                ZStack {
                  if appointment.date >= Date().onlyDate! {
                    ZStack(alignment: .top) {
                      Rectangle()
                        .frame(maxHeight: 8)
                      Rectangle()
                        .opacity(0.3)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundColor(.teal)
//                    .frame(minWidth: 0, maxWidth: .infinity, minHeight: 40, maxHeight: 40)
                  } else if appointment.isReport{
                    ZStack(alignment: .top) {
                      Rectangle()
                        .frame(maxHeight: 8)
                        .foregroundColor(.green)
                      Rectangle()
                        .opacity(0.3)
                        .padding(.top, 8)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundColor(.teal)
//                    .frame(minWidth: 0, maxWidth: .infinity, maxHeight: 56)
                  } else {
                    ZStack(alignment: .top) {
                      Rectangle()
                        .frame(maxHeight: 8)
#if os(macOS)
                        .foregroundColor(Color(NSColor.red))
#endif
#if os(iOS)
                        .foregroundColor(Color(UIColor.red))
#endif
                      Rectangle()
                        .opacity(0.3)
                        .padding(.top, 8)

                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundColor(.teal)
//                    .frame(minWidth: 0, maxWidth: .infinity, maxHeight: 56)
                  }
                  VStack(alignment: .leading) {
                    Text(appointment.clientName)
                      .font(.system(size: 15))
                    Text("1°15'")
                    .font(.system(size: 12))
                  }
                  .padding(.top, 8)
                }
                .frame(minWidth: 0, maxWidth: .infinity, minHeight: 50, maxHeight: 56)
              }
            }
          }
//          .dropDestination(for: WorkerDraggable.self) { droppedTask, location in
//            print(location)
//            // Date and Worker update in
//            if let workerDragable = droppedTask.first, let worker = workers.first(where: {$0.id == workerDragable.id}){
//              newAppoitment.worker = worker
//            }
//            newAppoitment.date = dayAppoitments.date
//            isAddAppoitment = true
//            return true
//          } isTargeted: { isTargeted in
//            self.isTargeted = isTargeted
//          }
        }
       
      }

    }
  }
}

//struct DayViewPreviews: PreviewProvider {
//  static var previews: some View {
//    DayView(dayAppoitments: MockDataProvider.shared.dateArray[5])
//  }
//}
