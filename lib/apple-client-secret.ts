import * as jose from 'jose'

export async function generateAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID!
  const clientId = process.env.APPLE_CLIENT_ID!
  const keyId = process.env.APPLE_KEY_ID!
  const privateKey = process.env.APPLE_CLIENT_SECRET!

  // Import the private key
  const key = await jose.importPKCS8(privateKey, 'ES256')

  // Create JWT
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('180d') // Apple allows up to 6 months
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(key)

  return jwt
}
