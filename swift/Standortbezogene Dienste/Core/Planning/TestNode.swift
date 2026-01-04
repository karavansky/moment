//
//  TestNode.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 11.12.24.
//

import SwiftData
import Foundation

// @Model
class TreeNode {
    @Attribute(.unique)
    var id: UUID = UUID()
    var name: String
    var value: String?
    
//    @Relationship(deleteRule: .cascade, inverse: \TreeNode.parent)
    var children: [TreeNode] = []
    
//    @Relationship(deleteRule: .nullify, inverse: \TreeNode.children)
    var parent: TreeNode?
    
    init(name: String, value: String? = nil, parent: TreeNode? = nil) {
        self.name = name
        self.value = value
        self.parent = parent
    }
}
