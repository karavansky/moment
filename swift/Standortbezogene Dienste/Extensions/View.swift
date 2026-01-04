//
//  View.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 18.11.24.
//
import SwiftUI

extension View {
    @ViewBuilder func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}
