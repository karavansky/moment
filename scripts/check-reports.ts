import pool from '../lib/db'

async function checkReports() {
  try {
    const appointmentId = 'qK7tDQ6HqdgBzNZNBtAWL'

    const query = `
      SELECT
        r."reportID",
        r."type",
        r."workerId",
        r."appointmentId",
        r."notes",
        r."date",
        r."openAt",
        r."closeAt",
        COUNT(p."photoID") as photo_count,
        r."createdAt"
      FROM reports r
      LEFT JOIN report_photos p ON r."reportID" = p."reportID"
      WHERE r."appointmentId" = $1
      GROUP BY r."reportID"
      ORDER BY r."createdAt" ASC
    `

    const result = await pool.query(query, [appointmentId])

    console.log('Total reports:', result.rows.length)
    console.log('\n--- Reports breakdown ---')

    const workSessions = result.rows.filter((r: any) => r.type === 0)
    const proxySessions = result.rows.filter((r: any) => r.type === 1)

    console.log('Work sessions (type=0):', workSessions.length)
    console.log('Proxy sessions (type=1):', proxySessions.length)

    console.log('\n--- All reports ---')
    result.rows.forEach((r: any, idx: number) => {
      console.log(`${idx + 1}. Report ID: ${r.reportID}`)
      console.log(`   Type: ${r.type} (${r.type === 0 ? 'work session' : 'proxy/photo container'})`)
      console.log(`   Photos: ${r.photo_count}`)
      console.log(`   OpenAt: ${r.openAt ? new Date(r.openAt).toISOString() : 'null'}`)
      console.log(`   CloseAt: ${r.closeAt ? new Date(r.closeAt).toISOString() : 'null'}`)
      console.log(`   CreatedAt: ${new Date(r.createdAt).toISOString()}`)
      console.log(`   Notes: ${r.notes ? r.notes.substring(0, 50) : 'null'}`)
      console.log('')
    })

    await pool.end()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkReports()
