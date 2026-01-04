//
//  Test4.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 27.11.24.
//

import SwiftUI

struct InfinitePageView<C, T>: View where C: View, T: Hashable {
    @Binding var selection: T

    let before: (T) -> T
    let after: (T) -> T

    @ViewBuilder let view: (T) -> C

    @State private var currentTab: Int = 0

    var body: some View {
        let previousIndex = before(selection)
        let nextIndex = after(selection)
        TabView(selection: $currentTab) {
            view(previousIndex)
                .tag(-1)

            view(selection)
                .onDisappear() {
                    if currentTab != 0 {
                        selection = currentTab < 0 ? previousIndex : nextIndex
                        currentTab = 0
                    }
                }
                .tag(0)

            view(nextIndex)
                .tag(1)
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .disabled(currentTab != 0) // FIXME: workaround to avoid glitch when swiping twice very quickly
    }
}

struct Content: View {
    private let systemColors: [Color] = [
        .red, .orange, .yellow, .green,
        .mint, .teal, .cyan, .blue,
        .indigo, .purple, .pink, .brown
    ]

    @State private var colorIndex = 4

    var body: some View {
      Text("Hello \(colorIndex)")
        InfinitePageView(
            selection: $colorIndex,
            before: { correctedIndex(for: $0 - 1) },
            after: { correctedIndex(for: $0 + 1) },
            view: { index in
                SubView(index: index)
//                systemColors[index]
//                    .overlay(
//                      SubView(index: index)
////                        Text("\(index)     \(index)")
////                            .colorInvert()
//                    )
//                    .font(.system(size: 100, weight: .heavy))
            }
        )
    }

    private func correctedIndex(for index: Int) -> Int {
        let count = systemColors.count
        return (count + index) % count
    }
}

#Preview {
  Content()
}


struct SubView: View {
  var index: Int
  var body: some View {
    VStack {
      Text("Hello, World!")
      Text("\(index)     \(index)")
    }
  }
}
