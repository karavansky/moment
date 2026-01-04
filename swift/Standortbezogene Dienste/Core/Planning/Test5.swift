//
//  Test5.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 08.12.24.
//

import SwiftUI

struct Test5: View {

  public var body: some View {
    ScrollView {
        ForEach(0..<50) { i in
            Text("Item \(i)")
                .font(.largeTitle)
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .background(.blue)
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 20))
        }
    }
    .scrollTargetBehavior(.paging)

  }
}

#Preview { Test5() }
