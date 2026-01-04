//
//  Worker.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation
import SwiftUI
import SwiftData
import UniformTypeIdentifiers

@Model
final public class Worker: ObservableObject {

  @Attribute(.unique)
  public var id: UUID
  
  var firmaID: UUID
  var workerName: String
  var team: Team
  
//  @Relationship(deleteRule: .nullify, inverse: \Appointment.worker)
  @Relationship(deleteRule: .cascade, inverse: \Appointment.worker)
  var appointments: [Appointment] = []
  @Relationship(deleteRule: .cascade, inverse: \Report.worker)
  var reports: [Report] = []

  
  init(id: UUID, firmaID: UUID, workerName: String, appointments: [Appointment], team: Team) {
    self.id = id
    self.firmaID = firmaID
    self.workerName = workerName
    self.appointments = appointments
    self.team = team
  }
  
  func createDraggable() -> WorkerDraggable {
    let draggable = WorkerDraggable(id: id, workerName: workerName)
    return draggable
  }
}


struct WorkerDraggable: Codable, Hashable, Transferable {
    let id: UUID
    let workerName: String
    
    static var transferRepresentation: some TransferRepresentation {
        // This allows to drag and drop our entire custom object
        // We are using this method for transfer because our object conforms to Codable,
        // which allows our object to be represented a JSON and this method along with exporting our object,
        // lets other apps know about our custom object and what its structure is
        CodableRepresentation(contentType: .workerDraggable)
        
        // This allows us to export a single value from our custom object.
        // For example, it allows us to paste only the title if we have copied the whole object
//      ProxyRepresentation(exporting: \.workerName)
    }
  func hash(into hasher: inout Hasher) {
      hasher.combine(id)
  }
  static func == (lhs: WorkerDraggable, rhs: WorkerDraggable) -> Bool {
      return lhs.id == rhs.id
  }

}

extension UTType {
    // exportedAs is declared in reverse domain name notation using a domain that you (or your employer) owns
    // this ensures there is only ever one owner to this kind of data
    static let workerDraggable = UTType(exportedAs: "com.karavansky.workerDraggable")
}
