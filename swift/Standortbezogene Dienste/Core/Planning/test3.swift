import SwiftUI

import SwiftUI

struct LazyVGridDragExample: View {
    @State private var gridItems = Array(repeating: GridItem(.flexible()), count: 2) // 2 Spalten
    @State private var dragOffset: CGSize = .zero
    @State private var textPosition: CGSize = .zero
    @State private var isDragging: Bool = false

    var body: some View {
        ScrollView {
            LazyVGrid(columns: gridItems, spacing: 20) {
                ForEach(0..<10) { index in
                    if index == 4 {
                        // Der Text, der gezogen werden kann
                        Text("Drag me!")
                            .font(.system(size: isDragging ? 36 : 24)) // Dynamische Größe
                            .bold()
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(10)
                            .offset(x: textPosition.width + dragOffset.width,
                                    y: textPosition.height + dragOffset.height)
                            .gesture(
                                DragGesture()
                                    .onChanged { value in
                                        isDragging = true
                                        dragOffset = value.translation
                                    }
                                    .onEnded { value in
                                        textPosition.width += value.translation.width
                                        textPosition.height += value.translation.height
                                        dragOffset = .zero
                                        isDragging = false
                                    }
                            )
                            .animation(.spring(), value: isDragging) // Animation für Größenänderung
                    } else {
                        // Andere Grid-Zellen
                        Text("Item \(index)")
                            .font(.headline)
                            .frame(maxWidth: .infinity, minHeight: 80)
                            .background(Color.gray.opacity(0.3))
                            .cornerRadius(10)
                    }
                }
            }
            .padding()
        }
    }
}

struct LazyVGridDragExample_Previews: PreviewProvider {
    static var previews: some View {
        LazyVGridDragExample()
    }
}
