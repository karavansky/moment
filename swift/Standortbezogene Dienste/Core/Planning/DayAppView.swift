//
//  DayView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//
import SwiftData
import SwiftUI

struct DayAppView: View {
  
  @Query(sort: \Worker.workerName, order: .forward)
  var workers: [Worker]
  @Query
  var appointments: [Appointment]
  
  @Binding var dayAppoitments: DateApoitmentView
  @Binding var isAddAppoitment: Bool
  @Binding var isEditAppointment: Bool
  @Binding var selectedWorker: Worker
  //  @Binding var selectedWorkerID: String
  //  @Binding var newAppoitment: Appointment
  
  @Bindable var searchModel: AddAppointmentModel

  let items = [1, 2, 3, 4, 5, 6, 7]
  
  @State var isTargeted: Bool = false
  @State var isAnimationEnd: Bool = true
  //  @State var isEditAppointment: Bool = false
  let stripeHeight = 7.0
  
  @ObservedObject var provider: DataProvider
  @State var dictionary: [AnyHashable: Bool] = [:]
  @Binding var isUpdateAppointments: Bool
  
  
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
            //            if calendar.component(.weekday, from: dayAppoitments.date) == 1 || calendar.component(.weekday, from: dayAppoitments.date) == 7 {
            //              Text(dayAppoitments.dayOfWeek)
            //                .font(.caption)
            //                .padding(3)
            //                .background(
            //                    RoundedRectangle(cornerRadius: 7)
            //                      .stroke(Color(UIColor.label), lineWidth: 1) // Blue border with rounded corners
            //                )
            ////                .padding(.top, 2)
            //#if os(macOS)
            //              .foregroundColor(Color(NSColor.controlTextColor))
            //#endif
            //#if os(iOS)
            //          .foregroundColor(Color(UIColor.label))
            //#endif
            ////          .font(.caption)
            ////          .padding(.top, 2)
            //            } else {
            Text(dayAppoitments.dayOfWeek)
            //                .padding(7)
#if os(macOS)
              .foregroundColor(Color(NSColor.controlTextColor))
#endif
#if os(iOS)
              .foregroundColor(Color(UIColor.label))
#endif
              .font(.caption)
            if dayAppoitments.date.onlyDate == Date().onlyDate {
              Text(dayAppoitments.day)
                .font(.subheadline)
                .frame(maxHeight: 20)
                .foregroundStyle(.white)
                .background {
                  RoundedRectangle(cornerRadius: 5)
                    .fill(Color.red)
                    .frame(width: 25, height: 22)
                }

//              Image(systemName: "\(dayAppoitments.day).square.fill")
//                .symbolRenderingMode(.palette)
//                .foregroundStyle(Color.primary, Color.accentColor)
//                .font(.system(size: 33))
            } else {
              Text(dayAppoitments.day)
                .font(.subheadline)
                .frame(maxHeight: 20)
//
//              Image(systemName: "\(dayAppoitments.day).square.fill")
//                .symbolRenderingMode(.palette)
//#if os(macOS)
//                .foregroundStyle(Color.primary, Color(NSColor.gridColor))
//#endif
//#if os(iOS)
//                .foregroundStyle(Color.primary, Color(UIColor.systemBackground))
//#endif
//                .font(.system(size: 33))
            }
          }
          .padding(.top, 2)
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
                    Text(appointment.workerName)
                      .font(.system(size: 15))
                    Text(appointment.duration.timeStringShort)
                      .font(.system(size: 12))
                  }
                  .padding(.top, 8)
                }
                .frame(minWidth: 0, maxWidth: .infinity, minHeight: 50, maxHeight: 56)
                //                .offset(x: viewState.width, y: viewState.height)
                .scaleEffect((dictionary[appointment.id.uuidString] ?? true) ? 1 : 0.9)
                //                .scaleEffect(isAnimationEnd ? 1 : 0.9)
                .draggable(appointment)

                .onTapGesture(perform: {
                  print("tapped")
                  isAnimationEnd = false
                  dictionary[appointment.id.uuidString] = false
                  withAnimation(.spring(response: 0.3, dampingFraction: 0.3)) {
                    isAnimationEnd = true
                    dictionary[appointment.id.uuidString] = true
                    if let editAppointment = appointments.first(where: {$0.id == appointment.id}) {
                      //                    EditAppointment(editAppointment: editAppointment)
                      provider.appointment = editAppointment
                      searchModel.appointment = editAppointment
                      isEditAppointment = true
                    } else {
                      print("not found")
                    }
                  }
                })
              }
            }
            
          }
          .dropDestination(for: DropItem.self) { items, location in
            let payload = items.first!
            switch payload {
            case .app(let appDrop):
              print("Appointment")
              if dayAppoitments.date.onlyDate! >= Date().onlyDate! {
                if let client = provider.client,
                   let app = client.appointments.first(where: {$0.id == appDrop.id})
                {
                  app.date = dayAppoitments.date
                  isUpdateAppointments = true
                }
                return true
              } else {
                return false
              }
            case .worker(let workerDrop):
              print("Worker")
              if dayAppoitments.date.onlyDate! >= Date().onlyDate! {
                if let worker = workers.first(where: {$0.id == workerDrop.id}){
                  selectedWorker = worker
                  print(selectedWorker.workerName)
                  searchModel.query = selectedWorker.workerName
                  searchModel.selectedWorker = worker
                  searchModel.date = dayAppoitments.date
                  
                  provider.worker = worker
                  provider.date = dayAppoitments.date
                }
                isAddAppoitment = true
                return true
              } else {
                return false
              }
            case .none:
              print("None")
            }
            return true
          } isTargeted: { isTargeted in
            if dayAppoitments.date.onlyDate! >= Date().onlyDate! {
              self.isTargeted = isTargeted
            } else {
              self.isTargeted = false
            }
          }
          //          .dropDestination(for: AppointmentDraggable.self) { droppedTask, location in
          //            print(location)
          //            if dayAppoitments.date.onlyDate! >= Date().onlyDate! {
          //              if let appDrag = droppedTask.first,
          //                 let client = provider.client,
          //                 let app = client.appointments.first(where: {$0.id == appDrag.id})
          //              {
          //                app.date = dayAppoitments.date
          //                isUpdateAppointments = true
          //              }
          //              return true
          //            } else {
          //              return false
          //            }
          //          } isTargeted: { isTargeted in
          //            if dayAppoitments.date.onlyDate! >= Date().onlyDate! {
          //              self.isTargeted = isTargeted
          //            } else {
          //              self.isTargeted = false
          //            }
          //          }
          //          .dropDestination(for: WorkerDraggable.self) { droppedTask, location in
          //            print(location)
          //            if dayAppoitments.date.onlyDate! >= Date().onlyDate! {
          //              if let workerDragable = droppedTask.first, let worker = workers.first(where: {$0.id == workerDragable.id}){
          //                selectedWorker = worker
          //                print(selectedWorker.workerName)
          //                searchModel.query = selectedWorker.workerName
          //                searchModel.selectedWorker = worker
          //                searchModel.date = dayAppoitments.date
          //
          //                provider.worker = worker
          //                provider.date = dayAppoitments.date
          //                //              selectedWorkerID = workerDragable.id.uuidString
          //              }
          //              //              newAppoitment.date = dayAppoitments.date
          //              isAddAppoitment = true
          //              return true
          //            } else {
          //              return false
          //            }
          //
          //          } isTargeted: { isTargeted in
          //            if dayAppoitments.date.onlyDate! >= Date().onlyDate! {
          //              self.isTargeted = isTargeted
          //            } else {
          //              self.isTargeted = false
          //            }
          //          }
        }
        
      }
      .onAppear {
        dictionary = dayAppoitments.appointmens.reduce(into: [:]) { dictionary, user in
          dictionary[user.id.uuidString] = true
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
