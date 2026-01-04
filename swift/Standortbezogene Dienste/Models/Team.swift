//
//  Team.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 21.11.24.
//

import Foundation
import SwiftData

@Model
final public class Team: ObservableObject {
  
  @Attribute(.unique)
  public var id: UUID
  
  var teamName: String
  var firmaID: UUID
  
  @Relationship(deleteRule: .cascade, inverse: \Worker.team)
  var worker: [Worker] = []
  
  init(id: UUID, firmaID: UUID, worker: [Worker], teamName: String) {
    self.id = id
    self.worker = worker
    self.teamName = teamName
    self.firmaID = firmaID
  }
  
}
