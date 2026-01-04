//
//  UTType.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import UniformTypeIdentifiers

extension UTType {
  static let dateApoitmentView = UTType(exportedAs: "dateApoitmentView")
  static var persistentModelID: UTType { UTType(exportedAs: "persistentModelID") }

}
