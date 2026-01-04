//
//  Group.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 23.11.24.
//

import Foundation
import SwiftData

@Model
final public class Category: ObservableObject {
  
  @Attribute(.unique)
  public var id: UUID
  
  var categoryName: String
  var firmaID: UUID
  
  @Relationship(deleteRule: .cascade, inverse: \Client.category)
  var clients: [Client] = []
  
  init(id: UUID, firmaID: UUID, clients: [Client], categoryName: String) {
    self.id = id
    self.clients = clients
    self.categoryName = categoryName
    self.firmaID = firmaID
  }
  
}
