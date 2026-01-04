////
////  AddAppoitment.swift
////  Standortbezogene Dienste
////
////  Created by Serhii Karavanskyi on 18.11.24.
////
//
//import SwiftUI
//
//
//
//struct AddAppointmentOLD: View {
//  
//  @Environment(\.modelContext) private var modelContext
//  @Environment(\.dismiss) var dismiss
//  
//  @State var timeToWork: Int = 0
//  @State var isFixedTime: Bool = false
//  @State private var date = Date.now
//  @State private var wakeUp = Date.now
//  @State var listApoitmentView: [DateApoitmentView] = []
//  @Bindable var addAppointment: AddAppointmentModel
//  @State var worker: Worker
//  @State var title: String = ""
//  @State var isRepeating: Bool = false
//  @State var wegzeit: Int = 0
//  @State var endDate: Date = Date.now
//  @Binding var isUpdateAppointments: Bool
//
//  init(addAppointment: AddAppointmentModel, isUpdateAppointments: Binding<Bool>){
//    var calendar = Calendar.autoupdatingCurrent
//    calendar.timeZone = .current
//    calendar.locale = Locale.preferredLocale()
//    _worker = State(initialValue: addAppointment.selectedWorker)
//    _isUpdateAppointments = isUpdateAppointments
//    let foo = addAppointment.selectedWorker.workerName
//    _addAppointment = Bindable(addAppointment)
//    var resultArray: [DateApoitmentView] = []
//    _listApoitmentView = State(initialValue: resultArray)
//    
//    let appoitments = addAppointment.selectedWorker.appointments
//      .filter({$0.date.onlyDate! >= addAppointment.date.onlyDate! } ).sorted(by: {$0.date < $1.date})
//    if !appoitments.isEmpty, let lastAppoitmentDate = appoitments.last?.date{
//      
//      print(" addAppointment.date: ", addAppointment.date)
//      print("lastAppoitmentDate: \(lastAppoitmentDate.description.localized)")
//      let numberOfDays = calendar.dateComponents([.day], from: addAppointment.date.onlyDate!, to: lastAppoitmentDate).day! + 1
//      
//      for i in 0..<numberOfDays {
//        let dateIncreasing = calendar.date(byAdding: .day, value: i, to: addAppointment.date.onlyDate!)!
//        let day = calendar.component(.day, from: dateIncreasing)
//        let index = calendar.component(.weekday, from: dateIncreasing)
//        let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
//        let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: String(characterDay), day: day.description)
//        resultArray.append(dateApoitmentView)
//      }
//      _listApoitmentView = State(initialValue: resultArray)
//    }
//    //   print("AddAppoitment listApoitmentView: \(listApoitmentView.count)")
//    let appointments = addAppointment.selectedWorker.appointments
//    if !appoitments.isEmpty  {
//      for day in appointments {
//        print(day.date)
//        if let dayIndex = listApoitmentView.firstIndex(where: {$0.date.onlyDate == day.date.onlyDate}) {
//          listApoitmentView[dayIndex].appointmens.append(day.createDraggable())
//          print("In listApoitmentView[\(dayIndex)].appointmens.append(\(day.date.description))")
//        }
//      }
//    }
//    
//  }
//  var body: some View {
//    GeometryReader { geometry in
//      
//      NavigationStack {
//        VStack{
//          Form {
//            Section {
//              DatePicker("Datum", selection: $addAppointment.date, displayedComponents: .date)
//                .environment(\.locale, Locale.init(identifier: String(Locale.preferredLanguages[0].prefix(2))))
//              MultiPicker(selection: $timeToWork).frame(height: 100)
//              Toggle(isOn: $isFixedTime, label: {
//                Text("feste Zeit")
//              })
//              if isFixedTime {
//                DatePicker("Bitte geben Sie eine Uhrzeit ein", selection: $wakeUp, displayedComponents: .hourAndMinute)
//              }
//              Picker("Wegzeit", selection: $wegzeit) {
//                Text("Ohne").tag(0)
//                Text("5 Minuten").tag(5)
//                Text("15 Minuten").tag(15)
//                Text("30 Minuten").tag(30)
//                Text("1 Stunde").tag(60)
//                Text("1 Stunde, 30 Minuten").tag(90)
//                Text("2 Stunden").tag(120)
//              }
//              Toggle(isOn: $isRepeating, label: {
//                Text("Wiederholen")
//              })
//              if isRepeating {
//                NavigationLink(destination: DaysOfWeekView()) {
//                  Text("Wird jede Woche am Dienstag wiedeholt")
//                    .font(.caption)
//                }
//                .id(UUID())
//                DatePicker("Enddatum", selection: $endDate, displayedComponents: .date)
//                  .environment(\.locale, Locale.init(identifier: String(Locale.preferredLanguages[0].prefix(2))))
//              }
//            } // Section
//            Section("Dienstplan für " + worker.workerName ) {
//              if !listApoitmentView.isEmpty {
//                Text("November")
//                  .font(.body)
//                ScrollView(.horizontal){
//                  LazyHGrid(rows: [GridItem()], spacing: 2) {
//                    ForEach($listApoitmentView, id: \.id) { dateInfo in
//                      DayViewWorker(dayAppoitments: dateInfo)
//                        .frame(width:  geometry.size.width < 400 ? geometry.size.width/5 : 100  )
//                    }
//                  }
//                  .scrollTargetLayout()
//                }
//                .frame(minHeight: 300)
//              } else {
//                Text("nichts geplant")
//                  .font(.body)
//              }
//            }
//          } // Form
//          
//        }
//        
//        .onAppear(){
//          if let client = addAppointment.client {
//            title = client.clientName
//          }
//        }
//        .toolbar {
//          ToolbarItem(placement: .cancellationAction, content: {
//            Button("Abbrechen", action: {
//              //            isAddAppoitment = false
//              dismiss()
//            })
//          })
//          ToolbarItem(placement: .confirmationAction) {
//            Button("Hinzufügen", action: {
//              saveItem()
//            })
//            .disabled(timeToWork == 0 ? true : false )
//          }
//        }
//        .navigationTitle(title)
//      }
//    }
//  }
//  func saveItem() {
//    if let client = addAppointment.client {
//      // Start time initialization
//      var startTime = Date()
//      if isFixedTime {
//        //
//      }
//
//      let newAppointment = Appointment(id: UUID(), userID: UUID(), clientID: client.id, client: client, date: addAppointment.date, isFixedTime: isFixedTime, startTime: startTime, endTime: startTime, worker: addAppointment.selectedWorker, duration: timeToWork)
//      let actorQueueLabel = DispatchQueue.currentLabel
//      print("DispatchQueue modelContext.insert:",actorQueueLabel)
//      modelContext.insert(newAppointment)
//      isUpdateAppointments = true
//      dismiss()
//    } else {
//      print("Client WTF")
//    }
//  }
//}
//
//#Preview {
////  let client = Client(id: UUID(), firmaID: UUID(), clientName: "Zimmermann", strasse: "Karl-Friedrich-Schinkel-Str", plz: "53127", ort: "Bonn-Ippendorf", houseNumber: "157", latitude: 0, longitude: 0, appointments: [], group: <#Group#>)
//  let team1 = Team(id: UUID(), firmaID: UUID(), worker: [], teamName: "Team 1")
//  
//  let worker = Worker(id: UUID(), firmaID: UUID(), workerName: "Pupkin", appointments: [],team: team1)
//  //  AddAppoitment(isAddAppoitment: .constant(true), newAppoitment: .constant(Appoitment(id: UUID(), userID: UUID(), clientID: UUID(), client: client, date: Date(), startTime: Date(), endTime: Date(), worker: worker)), selectedWorker: Binding(projectedValue: worker))
//}
