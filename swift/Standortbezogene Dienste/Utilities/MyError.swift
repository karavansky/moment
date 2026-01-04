//
//  MyError.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 17.11.24.
//

import Foundation
enum MyError: LocalizedError {
    case someError
    
    var errorDescription: String? {
        switch self {
        case .someError:
            return "Something went wrong"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .someError:
            return "Please try again."
        }
    }
}
