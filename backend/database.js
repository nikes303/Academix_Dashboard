const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./academix.db', (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
        throw err;
    }
    console.log('Successfully connected to the academix.db SQLite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        department TEXT,
        designation TEXT,
        employeeId TEXT NOT NULL UNIQUE,
        phone TEXT,
        officeAddress TEXT,
        researchInterests TEXT,
        profilePicture TEXT 
    )`, (err) => {
        if (err) {
            return console.error("Error creating 'teachers' table:", err.message);
        }
        console.log("'teachers' table with profilePicture column is ready.");
    });

    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        usn TEXT NOT NULL UNIQUE,
        branch TEXT,
        section TEXT,
        test1 INTEGER,
        test2 INTEGER,
        quiz INTEGER,
        assignment INTEGER
    )`, (err) => {
        if (err) {
            return console.error("Error creating 'students' table:", err.message);
        }
        console.log("'students' table is ready.")
    });

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        priority TEXT,
        dueDate TEXT,
        isCompleted INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            return console.error("Error creating 'tasks' table:", err.message);
        }
        const checkSql = `SELECT COUNT(*) as count FROM tasks`;
        db.get(checkSql, [], (err, row) => {
            if (err) {
                console.error("Error checking tasks table for count:", err.message);
                return;
            }
            if (row.count === 0) {
                const today = new Date();
                const tomorrow = new Date();
                tomorrow.setDate(today.getDate() + 1);
                const tomorrowDate = tomorrow.toISOString().split('T')[0];

                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);
                const nextWeekDate = nextWeek.toISOString().split('T')[0];

                const insertSql = `INSERT INTO tasks (name, priority, dueDate, isCompleted) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`;
                db.run(insertSql, [
                    "Prepare Lecture Slides for Chapter 5", "high", tomorrowDate, 0,
                    "Respond to Pending Student Emails", "medium", nextWeekDate, 0
                ], function(insertErr) {
                    if (insertErr) {
                        console.error("Error seeding 'tasks' table:", insertErr.message);
                    } else {
                        console.log("'tasks' table is ready and seeded with initial data.");
                    }
                });
            } else {
                console.log("'tasks' table is ready.");
            }
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        deadline TEXT NOT NULL,
        status TEXT NOT NULL
    )`, (err) => {
        if (err) {
            return console.error("Error creating 'assignments' table:", err.message);
        }
        const checkSql = `SELECT COUNT(*) as count FROM assignments`;
        db.get(checkSql, [], (err, row) => {
            if (row.count === 0) {
                const insertSql = `INSERT INTO assignments (name, deadline, status) VALUES (?, ?, ?), (?, ?, ?)`;
                db.run(insertSql, ["Algebra Problems", "2025-01-15", "Pending", "Physics Lab Report", "2025-01-20", "Completed"]);
                console.log("'assignments' table is ready and seeded with initial data.");
            } else {
                console.log("'assignments' table is ready.");
            }
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_usn TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        UNIQUE(student_usn, date)
    )`, (err) => {
        if (err) {
            return console.error("Error creating 'attendance_records' table:", err.message);
        }
        console.log("'attendance_records' table is ready.");
    });

    db.run(`CREATE TABLE IF NOT EXISTS section_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT NOT NULL,
        note TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            return console.error("Error creating 'section_notes' table:", err.message);
        }
        console.log("'section_notes' table is ready.");
    });
});

module.exports = db;