//
//  Appointment.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation
import SwiftUI
import SwiftData
import UniformTypeIdentifiers



@Model
final public class Appointment: ObservableObject {
  
  @Attribute(.unique)
  public var id: UUID

  var userID: UUID
  var clientID: UUID
  var date: Date
  var isFixedTime: Bool = false
  var startTime: Date
  var duration: Int
  var endTime: Date // ???
  var isReport: Bool {
    !reports.isEmpty
  }
  var worker: Worker
  var client: Client
  var fahrzeit: Int
  
  @Relationship(deleteRule: .cascade, inverse: \Report.appointment)
  var reports: [Report] = []
  
  init(id: UUID, userID: UUID, clientID: UUID, client: Client, date: Date, isFixedTime: Bool = false, startTime: Date, endTime: Date, worker: Worker, duration: Int = 0, fahrzeit: Int) {
    self.id = id
    self.userID = userID
    self.clientID = clientID
    self.date = date
    self.startTime = startTime
    self.endTime = endTime
    self.worker = worker
    self.client = client
    self.duration = duration
    self.isFixedTime = isFixedTime
    self.fahrzeit = fahrzeit
  }
  
  func createDraggable() -> AppointmentDraggable {
    let draggable = AppointmentDraggable(id: self.id, exportID: self.id.uuidString, userID: self.userID, clientID: clientID, date: self.date, isFixedTime: self.isFixedTime, startTime: self.startTime, endTime: self.endTime, workerName: worker.workerName, isReport: self.isReport, clientName: self.client.clientName, duration: self.duration, fahrzeit: self.fahrzeit)
    return draggable
  }
}

class AppointmentDraggable: Codable, Hashable, Transferable {

  let id: UUID
  let exportID: String
  var userID: UUID
  var clientID: UUID
  var date: Date
  var isFixedTime: Bool
  var startTime: Date
  var endTime: Date
  let workerName: String
  let clientName: String
  var duration: Int
  var fahrzeit: Int
  var isReport: Bool

  init(id: UUID, exportID: String, userID: UUID, clientID: UUID, date: Date, isFixedTime: Bool, startTime: Date, endTime: Date, workerName: String, isReport: Bool, clientName: String, duration: Int, fahrzeit: Int) {
    self.id = id
    self.exportID = exportID
    self.userID = userID
    self.clientID = clientID
    self.date = date
    self.startTime = startTime
    self.endTime = endTime
    self.workerName = workerName
    self.isReport = isReport
    self.clientName = clientName
    self.isFixedTime = isFixedTime
    self.duration = duration
    self.fahrzeit = fahrzeit
  }
  
    static var transferRepresentation: some TransferRepresentation {
        // This allows to drag and drop our entire custom object
        // We are using this method for transfer because our object conforms to Codable,
        // which allows our object to be represented a JSON and this method along with exporting our object,
        // lets other apps know about our custom object and what its structure is
        CodableRepresentation(contentType: .appoitmentDraggable)
        
        // This allows us to export a single value from our custom object.
        // For example, it allows us to paste only the title if we have copied the whole object
//      ProxyRepresentation(exporting: \.exportID)
    }
  func hash(into hasher: inout Hasher) {
      hasher.combine(id)
  }
  static func == (lhs: AppointmentDraggable, rhs: AppointmentDraggable) -> Bool {
      return lhs.id == rhs.id
  }

}

extension UTType {
    // exportedAs is declared in reverse domain name notation using a domain that you (or your employer) owns
    // this ensures there is only ever one owner to this kind of data
    static let appoitmentDraggable = UTType(exportedAs: "com.karavansky.appoitmentDraggable")
}
