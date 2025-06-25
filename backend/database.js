const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database. The file 'academix.db' will be created if it doesn't exist.
const db = new sqlite3.Database('./academix.db', (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
        throw err;
    }
    console.log('Successfully connected to the academix.db SQLite database.');
});

// db.serialize ensures that the database commands are executed in order.
db.serialize(() => {
    // 1. Create a table for teachers (for login/signup)
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
    if (err) return console.error("Error creating 'teachers' table:", err.message);
    console.log("'teachers' table with profilePicture column is ready.");
});


    // 2. Create a table for students (for studentdetails.html)
    // In db.serialize()


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
        if (err) return console.error("Error creating 'students' table:", err.message);
        console.log("'students' table is ready.")
    });

    // 3. Create a table for tasks (for teacher_todo.html)
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        priority TEXT,
        dueDate TEXT,
        isCompleted INTEGER DEFAULT 0 -- Changed BOOLEAN to INTEGER for consistency with SQLite storage
    )`, (err) => {
        if (err) return console.error("Error creating 'tasks' table:", err.message);
        console.log("'tasks' table is ready.");

        // Add some default data for tasks if the table is empty
        const checkSql = `SELECT COUNT(*) as count FROM tasks`;
        db.get(checkSql, [], (err, row) => {
            if (err) {
                console.error("Error checking tasks table for count:", err.message);
                return;
            }
            if (row.count === 0) {
                // Get today's and tomorrow's date in YYYY-MM-DD format
                const today = new Date();
                const tomorrow = new Date();
                tomorrow.setDate(today.getDate() + 1); // Set to tomorrow
                const tomorrowDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD

                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7); // Set to next week
                const nextWeekDate = nextWeek.toISOString().split('T')[0]; // Format as YYYY-MM-DD

                const insertSql = `INSERT INTO tasks (name, priority, dueDate, isCompleted) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`;
                db.run(insertSql, [
                    "Prepare Lecture Slides for Chapter 5", "high", tomorrowDate, 0,
                    "Respond to Pending Student Emails", "medium", nextWeekDate, 0
                ], function(insertErr) {
                    if (insertErr) console.error("Error seeding 'tasks' table:", insertErr.message);
                    else console.log("'tasks' table is ready and seeded with initial data.");
                });
            } else {
                console.log("'tasks' table is ready.");
            }
        });
    });

    // 4. Create a table for assignments (for the dashboard on ip.html)
    db.run(`CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        deadline TEXT NOT NULL,
        status TEXT NOT NULL
    )`, (err) => {
        if (err) return console.error("Error creating 'assignments' table:", err.message);
        
        // Let's add some default data for demonstration purposes if the table is empty
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
    if (err) return console.error("Error creating 'attendance_records' table:", err.message);
    console.log("'attendance_records' table is ready.");
});

db.run(`CREATE TABLE IF NOT EXISTS section_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    note TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) return console.error("Error creating 'section_notes' table:", err.message);
    console.log("'section_notes' table is ready.");
});


});

// Export the database connection object to be used in server.js
module.exports = db;
