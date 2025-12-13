import pool from '../db'
import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcryptjs'

async function seed() {
  const connection = await pool.getConnection()
  try {
    console.log('Starting to seed data...')
    await connection.beginTransaction()

    // Temporarily disable foreign key checks to allow truncation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;')

    // List of tables to truncate in order
    const tables = [
      'admin_term_members',
      'admin_terms',
      'fame_members',
      'history',
      'members',
      'messages',
      'news',
      'users',
      'works',
      'friend_links',
    ]

    console.log('Truncating all tables...')
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE ${table}`)
    }
    console.log('All tables truncated.')

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;')

    // Seed news data
    const newsPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'news.json')
    const newsData = JSON.parse(await fs.readFile(newsPath, 'utf-8'))
    for (const item of newsData) {
      await connection.query(
        'INSERT INTO news (id, title, date, author, image, summary, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.id, item.title, item.date, item.author, item.image, item.summary, item.content],
      )
    }
    console.log('News data seeded successfully.')

    // Seed members data
    const membersPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'data',
      'members_generated.json',
    )
    const membersData = JSON.parse(await fs.readFile(membersPath, 'utf-8'))
    for (const member of membersData) {
      await connection.query('INSERT INTO members (id, name, logo, link) VALUES (?, ?, ?, ?)', [
        member.id,
        member.name,
        member.logo,
        member.link,
      ])
    }
    console.log('Members data seeded successfully.')

    // Seed friend links data
    const friendLinksPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'data',
      'friend_link.json',
    )
    const friendLinksData = JSON.parse(await fs.readFile(friendLinksPath, 'utf-8'))
    for (const link of friendLinksData) {
      await connection.query('INSERT INTO friend_links (title, url) VALUES (?, ?)', [
        link.title,
        link.url,
      ])
    }
    console.log('Friend links data seeded successfully.')

    // Seed works data
    const worksPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'works.json')
    const worksData = JSON.parse(await fs.readFile(worksPath, 'utf-8'))
    for (const work of worksData) {
      await connection.query(
        'INSERT INTO works (id, title, description, imageUrl, link) VALUES (?, ?, ?, ?, ?)',
        [work.id, work.title, work.description, work.imageUrl, work.link],
      )
    }
    console.log('Works data seeded successfully.')

    // Seed history data
    const historyPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'history.json')
    const historyData = JSON.parse(await fs.readFile(historyPath, 'utf-8'))
    for (const event of historyData) {
      await connection.query(
        'INSERT INTO history (id, title, date, description, image, link, dialog_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          event.id,
          event.title,
          event.date,
          event.description,
          event.image,
          event.link,
          JSON.stringify(event.dialog_data),
        ],
      )
    }
    console.log('History data seeded successfully.')

    // Seed admin history data
    const adminHistoryPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'data',
      'admins_history.json',
    )
    const adminHistoryData = JSON.parse(await fs.readFile(adminHistoryPath, 'utf-8'))
    for (const term of adminHistoryData) {
      await connection.query(
        'INSERT INTO admin_terms (id, title, trem, description) VALUES (?, ?, ?, ?)',
        [term.id, term.title, term.trem, term.description],
      )
      for (const member of term.members) {
        await connection.query(
          'INSERT INTO admin_term_members (term_id, name, position, image) VALUES (?, ?, ?, ?)',
          [term.id, member.name, member.position, member.image],
        )
      }
    }
    console.log('Admin history data seeded successfully.')

    // Seed fame members data
    const fameMembersPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'data',
      'fames_member.json',
    )
    const fameMembersData = JSON.parse(await fs.readFile(fameMembersPath, 'utf-8'))
    for (const member of fameMembersData) {
      await connection.query(
        'INSERT INTO fame_members (id, name, description, image) VALUES (?, ?, ?, ?)',
        [member.id, member.name, member.description, member.image],
      )
    }
    console.log('Fame members data seeded successfully.')

    // Seed messages data
    const messagesPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'messages.json')
    const messagesData = JSON.parse(await fs.readFile(messagesPath, 'utf-8'))
    for (const message of messagesData) {
      await connection.query(
        'INSERT INTO messages (id, author, content, qq, status) VALUES (?, ?, ?, ?, ?)',
        [message.id, message.author, message.content, message.qq, 'approved'],
      ) // Approve messages from json by default
    }
    console.log('Messages data seeded successfully.')

    // Seed a default admin user
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash('password', salt)
    await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
      'admin',
      hashedPassword,
      'admin',
    ])
    console.log('Default admin user created successfully.')

    await connection.commit()
    console.log('Data seeding completed successfully.')
  } catch (error) {
    await connection.rollback()
    console.error('Error during data seeding:', error)
  } finally {
    connection.release()
    await pool.end()
  }
}

seed()
