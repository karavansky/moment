//
//  ResourceRequestError.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation

enum ResourceRequestError: Error {
  case noData
  case decodingError
  case encodingError
}
