//
//  Auth.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation

enum AuthResult {
    case success
    case failure
}

class Auth: ObservableObject {
    static let keychainKey = "TIL-API-KEY"
    
    static let shared = Auth()
    
    @Published var loggedIn: Bool = false
    @Published var isDemo: Bool = false
    @Published var user: String = ""
    @Published var isAdmin: Bool = false
    
    var token: String? {
        get {
            Keychain.load(key: Auth.keychainKey)
        }
        set {
            if let newToken = newValue {
                Keychain.save(key: Auth.keychainKey, data: newToken)
            } else {
                Keychain.delete(key: Auth.keychainKey)
            }
        }
    }
    
    func logout() {
        token = nil
        loggedIn = false
        //    DispatchQueue.main.async {
        //      guard let applicationDelegate =
        //        UIApplication.shared.delegate as? AppDelegate else {
        //          return
        //      }
        //      let rootController =
        //        UIStoryboard(name: "Login", bundle: Bundle.main).instantiateViewController(withIdentifier: "LoginNavigation")
        //      applicationDelegate.window?.rootViewController = rootController
        //    }
    }
    
    func login(username: String, password: String, completion: @escaping (AuthResult) -> Void) {
        let path = "\(apiHostname)/api/users/login"
        guard let url = URL(string: path) else {
            fatalError("Failed to convert URL")
        }
        guard
            let loginString = "\(username):\(password)"
                .data(using: .utf8)?
                .base64EncodedString()
        else {
            fatalError("Failed to encode credentials")
        }
        
        var loginRequest = URLRequest(url: url)
        loginRequest.addValue("Basic \(loginString)", forHTTPHeaderField: "Authorization")
        loginRequest.httpMethod = "POST"
        
        let dataTask = URLSession.shared.dataTask(with: loginRequest) { data, response, _ in
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200, let jsonData = data else {
                completion(.failure)
                return
            }
            do {
                let token = try JSONDecoder().decode(Token.self, from: jsonData)
                self.token = token.value
                completion(.success)
            } catch {
                completion(.failure)
            }
        }
        dataTask.resume()
    }
    
    func login(signInWithAppleInformation: SignInWithAppleToken, completion: @escaping (AuthResult) -> Void) throws {
        let path = "\(apiHostname)/api/users/siwa"
        guard let url = URL(string: path) else {
            fatalError("Failed to convert URL")
        }
        var loginRequest = URLRequest(url: url)
        loginRequest.httpMethod = "POST"
        loginRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        loginRequest.httpBody = try JSONEncoder().encode(signInWithAppleInformation)
        
        let dataTask = URLSession.shared.dataTask(with: loginRequest) { data, response, _ in
            guard
                let httpResponse = response as? HTTPURLResponse,
                httpResponse.statusCode == 200,
                let jsonData = data
            else {
                completion(.failure)
                return
            }
            
            do {
                let token = try JSONDecoder().decode(Token.self, from: jsonData)
                self.token = token.value
                completion(.success)
            } catch {
                completion(.failure)
            }
        }
        dataTask.resume()
    }
}

struct SignInWithAppleToken: Codable {
    let token: String
    let name: String?
}
