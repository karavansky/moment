//
//  PlanningView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import SwiftUI
import SwiftData

@Observable
class AddAppointmentModel: ObservableObject {
  var query: String = ""
  var selectedWorker: Worker = Worker(id: UUID(), firmaID: UUID(), workerName: "WTF", appointments: [], team: Team(id: UUID(), firmaID: UUID(), worker: [], teamName: "WTF"))
  var client: Client?
  var date = Date()
  var appointment: Appointment?
  // ...
}

class DataProvider: ObservableObject {
  @Published var client: Client?
  @Published var appointment: Appointment?
  @Published var worker: Worker?
  @Published var date = Date()
  @Published var repeatingDate: [Date] = []
}

struct PlanningView: View {
  @StateObject private var searchModel = AddAppointmentModel()
  
  @StateObject private var provider = DataProvider()
  
  @Environment(\.modelContext) private var modelContext
  @Query(sort: \Worker.workerName)
  var workers: [Worker]
  
  @Query(sort: \Team.teamName)
  var teams: [Team]
  //  @Query(sort: \Appoitment.date, order: .forward)
  //  var appoitments: [Appoitment]
  
  @State var client: Client
  @State var listApoitmentView: [DateApoitmentView] = []
  @State var workerListDraggable: [WorkerDraggable] = []
  @State var selectedWorker: Worker =  Worker(id: UUID(), firmaID: UUID(), workerName: "Pupkin", appointments: [], team: Team(id: UUID(), firmaID: UUID(), worker: [], teamName: "WTF"))
  @State var selectedWorkerID: String = ""
  @State private var isDragging: Bool = false
  
  // @Binding var items: [DateApoitmentView]
  @State private var position1: Int? //  @State private var position: Int?
  @State private var position: DateApoitmentView.ID? //  @State private var position: Int?
  
  @State private var monat: String = "Test"
  
  @State var isDrag = false
  @State private var isAddAppoitment = false
  @State private var isEditAppointment = false
  //  @State var newAppoitment: Appointment
  @State var isUpdateAppointments = false
  
  @State var selectedTeam = 0
  
  @State var appointment: Appointment?
  
//  init(client: Client) {
//    print("Client: \(client.clientName)")
//    print("Client ID: \(client.id)")
//    print("Appoitments: \(client.appointments.count)")
//    var resultArray: [DateApoitmentView] = []
//    var calendar = Calendar.autoupdatingCurrent
//    calendar.timeZone = .current
//    calendar.locale = Locale.preferredLocale() //(identifier: "ru_RU") // Locale.current
//    print("Locale.autoupdatingCurrent.identifier class:", Locale.preferredLocale().identifier)
//    let startDate = calendar.date(byAdding: .weekOfYear, value: -1, to: Date())!
//    let endDate = calendar.date(byAdding: .month, value: 3, to: Date())!
//    let numberOfDays = calendar.dateComponents([.day], from: startDate, to: endDate)
//    for i in 0..<numberOfDays.day! {
//      let dateIncreasing = calendar.date(byAdding: .day, value: i, to: startDate)!
//      let day = calendar.component(.day, from: dateIncreasing)
//      let index = calendar.component(.weekday, from: dateIncreasing)
//      let dateFormatter = DateFormatter()
//      dateFormatter.dateFormat = "EEEE"
//      dateFormatter.locale = Locale.preferredLocale()
//      let weekName = dateFormatter.weekdaySymbols[calendar.component(.weekday, from: dateIncreasing) - 1]
//
//      let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
//      let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: weekName, day: day.description)
//      resultArray.append(dateApoitmentView)
//    }
//    listApoitmentView = resultArray
//    self.client = client
//    //    let team = Team(id: UUID(), firmaID: UUID(), worker: [], teamName: "WTF")
//    //    let tmpWorker = Worker(id: UUID(), firmaID: UUID(), workerName: "Pupkin", appointments: [], team: team)
//    //    self.selectedWorker =  tmpWorker
//    //    self.newAppoitment = Appointment(id: UUID(), userID: UUID(), clientID: client.id, client: client, date: Date().onlyDate!, startTime: Date().onlyDate!, endTime: Date().onlyDate!, worker: tmpWorker)
//    for day in client.appointments {
//      print(day.date)
//      if let dayIndex = listApoitmentView.firstIndex(where: {$0.date.onlyDate == day.date.onlyDate}) {
//        listApoitmentView[dayIndex].appointmens.append(day.createDraggable())
//        print("PlanningView INIT In listApoitmentView[\(dayIndex)].appointmens.append(\(day.date.description))")
//      }
//    }
//
//
//  }
  
  var body: some View {
      GeometryReader { geometry in
        VStack(spacing: 2) {
          Text("\(monat) ") //(geometry.size.height)")
            .onTapGesture {
              print("Tap detected")
              if let idScrollTo = listApoitmentView.first(where: {$0.date == Date().onlyDate!}) {
                print("Ok: ", idScrollTo)
                withAnimation(.spring(response: 0.3, dampingFraction: 0.3)) {
                  self.position = idScrollTo.id
                }
              }
            }
  #if os(macOS)
            .foregroundStyle(Color.primary, Color(NSColor.controlTextColor))
  #endif
  #if os(iOS)
            .foregroundStyle(Color(UIColor.label))
  #endif
            .font(.title)
          ScrollView(.horizontal){
            LazyHGrid(rows: [GridItem()], spacing: 2) {
              ForEach($listApoitmentView, id: \.id) { dateInfo in
                DayAppView(dayAppoitments: dateInfo, isAddAppoitment: $isAddAppoitment,
                        isEditAppointment: $isEditAppointment, selectedWorker:
                          $selectedWorker,  searchModel: searchModel, provider: provider, isUpdateAppointments: $isUpdateAppointments) // , selectedWorkerID: $selectedWorkerID)
                .frame(width: geometry.size.width < 400 ? geometry.size.width/5 : 100 )
                //                      .dropDestination(for: WorkerDraggable.self) { droppedTask, location in
                //                        print(location)
                //                        return true
                //                      } isTargeted: { isTargeted in
                //                        self.isInProgressTargeted = isTargeted
                //                      }
                //                      .id(index)
              }
            }
            .scrollTargetLayout()
          }
          .frame(height:  geometry.size.height/2)
          //            .scrollTargetBehavior(.viewAligned)
          .scrollPosition(id: $position, anchor: .center)
          .onChange(of: position, {oldValue, newValue in
            if let currenScrollValue = newValue,
               let element =  listApoitmentView.first(where: {$0.id == currenScrollValue}) {
              let dateFormatter = DateFormatter()
              dateFormatter.locale = Locale.preferredLocale()
              dateFormatter.dateFormat = "LLLL"
              let nameOfMonth = dateFormatter.string(from: element.date)
              print("onScrollVisibilityChange: \(nameOfMonth)")
              withAnimation(.spring(response: 0.3, dampingFraction: 0.3)) {
                monat = nameOfMonth
              }
            }
          })
          //            .onChange(of: position) { oldValue, newValue in
          //              print("onScrollVisibilityChange: \(newValue.id)")
          //            }
          ZStack{
            RoundedRectangle(cornerRadius: 12)
            //            .border(Color(UIColor.secondarySystemBackground), width: 1)
  #if os(macOS)
              .fill(Color(NSColor.gridColor))
  #endif
  #if os(iOS)
              .fill(Color(UIColor.systemBackground))
  #endif
            VStack(alignment:.trailing ,spacing: 6) {
              Picker( selection: $selectedTeam) {
                ForEach(Array(teams.enumerated()), id: \.offset) { index, team in
                  Text(team.teamName).tag(index)
                }
              } label: {
                Text("Choose your team")
              }
  //            .pickerStyle(.palette)
  //            .paletteSelectionEffect(.symbolVariant(.slash))
              .padding(.top, 12)
              .frame(maxHeight:40)
              Divider()
              
              ScrollView(.horizontal){ // GridItem(.flexible()) GridItem(.adaptive(minimum: 100))
                LazyHGrid(rows: Array(repeating:  GridItem(.flexible()),  count: geometry.size.height < 400 ? 1 : 3), alignment: .center, spacing: 20) {
                  ForEach(workerListDraggable, id: \.id) { worker in
                    Text(worker.workerName)
                      .font(.headline)
                      .padding()
  #if os(macOS)
                      .background(Color(NSColor.controlBackgroundColor))
  #endif
  #if os(iOS)
                      .background(Color(UIColor.secondarySystemBackground))
  #endif
                      .cornerRadius(15)
                      .shadow(radius: 3, x: 3, y: 3)
                      .draggable(worker) {
                        Text(worker.workerName)
                          .font(.headline)
                          .scaleEffect(2)
                          .frame(width: 200, height: 60)
                          .background(
                            RoundedRectangle(cornerRadius: 15)
  #if os(macOS)
                              .fill(Color(NSColor.controlBackgroundColor))
  #endif
  #if os(iOS)
                              .fill(Color(UIColor.secondarySystemBackground) )
  #endif
                              .contentShape(.dragPreview, RoundedRectangle(cornerRadius: 18, style: .continuous))
                          )
                        
                      }
                      .contentShape(.dragPreview, RoundedRectangle(cornerRadius: 18, style: .continuous))
                  }
                }
                .animation(.interactiveSpring(), value: 3)
                .frame(alignment: .center)
              }
              .frame(height: geometry.size.height/2 - 120)
              
            }
            .overlay(
              RoundedRectangle(cornerRadius: 20)
  #if os(macOS)
                .stroke(Color(NSColor.controlBackgroundColor), lineWidth: 1)
  #endif
  #if os(iOS)
                .stroke(Color(UIColor.label), lineWidth: 1)
  #endif
            )
          }
        }
        .sheet(isPresented: $isEditAppointment) {
            EditAppointment(provider: provider, isEditAppointment: $isEditAppointment, isUpdateAppointments: $isUpdateAppointments)
        }
        .sheet(isPresented: $isAddAppoitment) {
          AddAppointment(provider: provider, isUpdateAppointments: $isUpdateAppointments)
        }
  #if os(macOS)
        .navigationTitle(client.clientName)
  #endif
  #if os(iOS)
        .navigationBarTitle(client.clientName, displayMode: .inline)
  #endif
        .onChange(of: selectedTeam){
          print("Onchange")
          let team = teams[selectedTeam]
            workerListDraggable = team.worker.map {$0.createDraggable() }
            workerListDraggable.sort(by: {$0.workerName < $1.workerName})
        }
        .onChange(of: isUpdateAppointments){
          updateAppointmens()
        }
        .task {
          print("Task: Teams:", teams.count)
        }
        .onAppear( perform: {
          print("onAppear: Teams:", teams.count)
          
          if let team = teams.first, let indexTeam = teams.firstIndex(of: team) {
            selectedTeam = indexTeam // State(initialValue: team)
            print("Team :", teams[indexTeam].teamName)
            workerListDraggable = team.worker.map {$0.createDraggable() }
            workerListDraggable.sort(by: {$0.workerName < $1.workerName})

          }

          
          let actorQueueLabel = DispatchQueue.currentLabel
          print("onAppear( perform:",actorQueueLabel)
          print("appoitments.count:",client.appointments.count)
          print("workers.count:",workers.count)
          if let idScrollTo = listApoitmentView.first(where: {$0.date == Date().onlyDate!}) {
            print("Ok: ", idScrollTo)
            self.position = idScrollTo.id
          }
          provider.client = client
  //        updateAppointmens()
          isUpdateAppointments = true
  //        updateAppointmens()
          //          workerListDraggable = workers.map {$0.createDraggable() }
          //          workerListDraggable.sort(by: {$0.workerName < $1.workerName})
          
        })
        .padding(2)
      }
  }
  
  func updateAppointmens() {
    if isUpdateAppointments {
      var resultArray: [DateApoitmentView] = []
      var calendar = Calendar.autoupdatingCurrent
      calendar.timeZone = .current
      calendar.locale = Locale.preferredLocale() //(identifier: "ru_RU") // Locale.current
      //      print("Locale.autoupdatingCurrent.identifier class:", Locale.preferredLocale().identifier)
      let startDate = calendar.date(byAdding: .weekOfYear, value: -1, to: Date())!
      let endDate = calendar.date(byAdding: .month, value: 3, to: Date())!
      let numberOfDays = calendar.dateComponents([.day], from: startDate, to: endDate)
      for i in 0..<numberOfDays.day! {
        let dateIncreasing = calendar.date(byAdding: .day, value: i, to: startDate)!
        let day = calendar.component(.day, from: dateIncreasing)
        let index = calendar.component(.weekday, from: dateIncreasing)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEEE"
        dateFormatter.locale = Locale.preferredLocale()
        let weekName = dateFormatter.weekdaySymbols[calendar.component(.weekday, from: dateIncreasing) - 1]
        let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
        let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: weekName, day: day.description)
//        let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: String(characterDay), day: day.description)
        resultArray.append(dateApoitmentView)
      }
      listApoitmentView = resultArray
      for day in client.appointments {
        //        print(day.date)
        if let dayIndex = listApoitmentView.firstIndex(where: {$0.date.onlyDate == day.date.onlyDate}) {
          listApoitmentView[dayIndex].appointmens.append(day.createDraggable())
          //          print("PlanningView updateAppointmens In listApoitmentView[\(dayIndex)].appointmens.append(\(day.date.description))")
        }
      }
      if let idScrollTo = listApoitmentView.first(where: {$0.date == Date().onlyDate!}) {
        self.position = idScrollTo.id
      }
      if let appointment = provider.appointment {
        for i in listApoitmentView {
          if let currentAppointment = i.appointmens.first(where: {$0.id == appointment.id})  {
            self.position = currentAppointment.id
          }
        }
      }
      isUpdateAppointments = false
    }
  } /// func updateAppointmens()
  
}

#Preview {
  RootView()
    .modelContainer(try! ModelContainer.sample())
  //
  //  PlanningView(client: Client(id: UUID(), firmaID: UUID(), clientName: "Zimmermann", strasse: "Karl-Friedrich-Schinkel-Str", plz: "53127", ort: "Bonn-Ippendorf", houseNumber: "157", latitude: 0, longitude: 0, appointments: []))
  //      .modelContainer(try! ModelContainer.sample())
}


