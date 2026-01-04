import SwiftUI

struct ContentViewText: View {
    @State var viewState = CGSize.zero
  enum Reaction: Identifiable, CaseIterable {
      case thumbsup, thumbsdown, heart, questionMark
      var id: Self { self }
  }
  @State private var selection: Reaction? = .none

  @State var selectedTeam = 0
  struct TeamPicker: Identifiable {
    let id: UUID
    let name: String
  }
  var teamsPicker: [TeamPicker] = [TeamPicker(id: UUID(), name: "11"), TeamPicker(id: UUID(), name: "23")]
    var body: some View {
      Picker( selection: $selectedTeam) {
        ForEach(Array(teamsPicker.enumerated()), id: \.offset) {  index, team in
          Text(team.name).tag(team.id)
        }
      } label: {
        Text("Choose your team")
      }

         Menu("Reactions") {
              Picker("Palette", selection: $selection) {
                  Label("Thumbs up", systemImage: "hand.thumbsup")
                      .tag(Reaction.thumbsup)
                  Label("Thumbs down", systemImage: "hand.thumbsdown")
                      .tag(Reaction.thumbsdown)
                  Label("Like", systemImage: "heart")
                      .tag(Reaction.heart)
                  Label("Question mark", systemImage: "questionmark")
                      .tag(Reaction.questionMark)
              }
           //   .pickerStyle(.palette)
//              .paletteSelectionEffect(.symbolVariant(.slash))

            Button() {
              
            } label: { Text("eee")
            }
          }
        RoundedRectangle(cornerRadius: 30)
            .fill(Color.blue)
            .frame(width: 300, height: 400)
            .offset(x: viewState.width, y: viewState.height)
            .gesture(
                DragGesture().onChanged { value in
                    viewState = value.translation
                }
                .onEnded { value in
                    withAnimation(.spring()) {
                        viewState = .zero
                    }
                }
            )
    }
}

#Preview {
  ContentViewText()
}
