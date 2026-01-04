//
//  DropItem.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 23.11.24.
//

import CoreTransferable

enum DropItem: Codable, Transferable {
    case none
    case app(AppointmentDraggable)
    case worker(WorkerDraggable)
    
    static var transferRepresentation: some TransferRepresentation {
        ProxyRepresentation { DropItem.app($0) }
        ProxyRepresentation { DropItem.worker($0) }
    }
    
    var app: AppointmentDraggable? {
        switch self {
            case .app(let app): return app
            default: return nil
        }
    }
    
    var worker: WorkerDraggable? {
        switch self {
            case.worker(let worker): return worker
            default: return nil
        }
    }
}
