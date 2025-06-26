// --- 1. IMPORTS ---
// All required packages are declared at the top.
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database.js');


// --- 2. INITIAL SETUP & MIDDLEWARE ---
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
// In server.js, add this line after app.use(express.json());



app.use(express.static('frontend'));
// In server.js, add this line after app.use(express.json());



// --- 3. FILE UPLOAD (MULTER) CONFIGURATION ---
// This setup is now in one clean block.

// Ensure the 'uploads' directory for profile pictures exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
// Serve the 'uploads' folder as a static directory so browsers can access the images
app.use('/uploads', express.static('uploads'));

// Configure how files are stored
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        // Create a unique filename for the profile picture
        cb(null, `profile-${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Initialize the upload middleware
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB file size limit
    fileFilter: function(req, file, cb) {
        // Function to allow only image files
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Only image files are allowed!');
        }
    }
}).single('profilePicture'); // This looks for a form field named 'profilePicture'


// ===============================================
// ---               4. API ROUTES             ---
// ===============================================

// --- Authentication Routes (login.html, sign_up.html) ---
app.post('/api/signup', (req, res) => {
    const { fullName, email, password, department, designation, employeeId } = req.body;
    if (!fullName || !email || !password || !employeeId) return res.status(400).json({ error: "Please provide all required fields." });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = `INSERT INTO teachers (fullName, email, password, department, designation, employeeId) VALUES (?,?,?,?,?,?)`;
    db.run(sql, [fullName, email, hashedPassword, department, designation, employeeId], function(err) {
        if (err) return res.status(500).json({ error: "Email or Employee ID already exists." });
        res.status(201).json({ message: "success", userId: this.lastID });
    });
});

app.post('/api/login', (req, res) => {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) return res.status(400).json({ error: "Please provide both Employee ID and password." });
    const sql = "SELECT * FROM teachers WHERE employeeId = ?";
    db.get(sql, [employeeId], (err, teacher) => {
        if (err || !teacher || !bcrypt.compareSync(password, teacher.password)) {
            return res.status(401).json({ error: "Invalid credentials." });
        }
        res.json({ message: "success", user: { id: teacher.id, fullName: teacher.fullName, email: teacher.email } });
    });
});

app.post('/api/forgot-password', (req, res) => {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: "Please provide an Employee ID." });
    const newPassword = "password123";
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const sql = `UPDATE teachers SET password = ? WHERE employeeId = ?`;
    db.run(sql, [hashedPassword, employeeId], function(err) {
        if (err) console.error("Forgot Password DB Error:", err.message);
        res.json({ 
            message: `If an account with that Employee ID exists, the new temporary password is: ${newPassword}`
        });
    });
});


// --- Profile Routes (profile.html) ---
app.get('/api/profile/:id', (req, res) => {
    const sql = "SELECT id, fullName, email, department, phone, officeAddress, researchInterests, profilePicture FROM teachers WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!row) return res.status(404).json({ "error": "Profile not found." });
        res.json({ "message": "success", "data": row });
    });
});

app.put('/api/profile/:id', (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.status(400).json({ error: err });
        const { fullName, email, phone, department, officeAddress, researchInterests } = req.body;
        db.get('SELECT profilePicture FROM teachers WHERE id = ?', [req.params.id], (dbErr, row) => {
            if (dbErr) { console.error(dbErr); return res.status(500).json({error: "Database error"}); }
            const oldPicturePath = row ? row.profilePicture : null;
            const newPicture = req.file ? req.file.path : oldPicturePath;
            const sql = `UPDATE teachers SET fullName = ?, email = ?, phone = ?, department = ?, officeAddress = ?, researchInterests = ?, profilePicture = ? WHERE id = ?`;
            const params = [fullName, email, phone, department, officeAddress, researchInterests, newPicture, req.params.id];
            db.run(sql, params, function(updateErr) {
                if (updateErr) return res.status(500).json({ "error": updateErr.message });
                if (req.file && oldPicturePath && fs.existsSync(oldPicturePath)) {
                    fs.unlink(oldPicturePath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting old file:", unlinkErr); });
                }
                res.json({ message: "Profile updated successfully", newImagePath: newPicture });
            });
        });
    });
});


// --- Dashboard & Assignments Routes (ip.html) ---
app.get('/api/dashboard-summary', async (req, res) => {
    try {
        const getPendingAssignments = new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM assignments WHERE status = 'Pending'", [], (err, row) => err ? reject(err) : resolve(row.count || 0));
        });
        const getOverallAttendance = new Promise((resolve, reject) => {
            db.get("SELECT MAX(date) as latest_date FROM attendance_records", [], (err, dateRow) => {
                if (err || !dateRow.latest_date) return resolve(0);
                Promise.all([
                    new Promise((res_p, rej_p) => db.get("SELECT COUNT(*) as total FROM attendance_records WHERE date = ?", [dateRow.latest_date], (e, r) => e ? rej_p(e) : res_p(r.total || 0))),
                    new Promise((res_p, rej_p) => db.get("SELECT COUNT(*) as present FROM attendance_records WHERE date = ? AND status = 'Present'", [dateRow.latest_date], (e, r) => e ? rej_p(e) : res_p(r.present || 0)))
                ]).then(([total, present]) => resolve(total === 0 ? 0 : Math.round((present / total) * 100))).catch(reject);
            });
        });
        // ADD this new `getUpcomingTask` Promise in app.get('/api/dashboard-summary')
const getUpcomingTask = new Promise((resolve, reject) => {
    // Select the task with the nearest dueDate that is not completed
    const sql = "SELECT name, dueDate FROM tasks WHERE isCompleted = 0 AND dueDate >= date('now') ORDER BY dueDate ASC, priority DESC LIMIT 1";
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error("Error fetching upcoming task:", err.message); // Log for debugging
            reject(err);
        }
        // Format the output similar to how assignments were formatted
        resolve(row ? `${row.name} (Due: ${row.dueDate})` : "No upcoming tasks.");
    });
});

// Modify the Promise.all array
const [pendingCount, attendancePercent, nextEvent] = await Promise.all([getPendingAssignments, getOverallAttendance, getUpcomingTask]); // Change getUpcomingEvent to getUpcomingTask
        res.json({
            message: "success",
            data: {
                attendance: { overall: `${attendancePercent}% Overall`, text: attendancePercent > 0 ? "Based on last recorded day." : "No attendance recorded." },
                assignments: { pending: `${pendingCount} Pending`, text: "Track assignment submissions." },
                events: { title: "Upcoming", text: nextEvent }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/assignments', (req, res) => {
    db.all("SELECT * FROM assignments ORDER BY deadline", [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ message: "success", data: rows });
    });
});
app.post('/api/assignments', (req, res) => {
    const { name, deadline, status } = req.body;
    if (!name || !deadline || !status) {
        return res.status(400).json({ "error": "Missing required fields." });
    }
    const sql = `INSERT INTO assignments (name, deadline, status) VALUES (?, ?, ?)`;
    db.run(sql, [name, deadline, status], function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        res.status(201).json({ "message": "success", "id": this.lastID });
    });
});

// PUT (update) an existing assignment
app.put('/api/assignments/:id', (req, res) => {
    const { name, deadline, status } = req.body;
    const { id } = req.params;
    if (!name || !deadline || !status) {
        return res.status(400).json({ "error": "Missing required fields." });
    }
    const sql = `UPDATE assignments SET name = ?, deadline = ?, status = ? WHERE id = ?`;
    db.run(sql, [name, deadline, status, id], function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ "error": "Assignment not found." });
        res.json({ "message": "success", "updatedID": id });
    });
});

// DELETE an assignment
app.delete('/api/assignments/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM assignments WHERE id = ?`;
    db.run(sql, id, function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        if (this.changes === 0) return res.status(404).json({ "error": "Assignment not found." });
        res.json({ "message": "deleted", "id": id });
    });
});
// Add other assignment routes (POST, PUT, DELETE) here...


// --- Student & Class Routes (studentdetails.html, attendance.html, performance.html) ---
app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});
// In server.js, under "--- Student & Class Routes ---"
app.post('/api/students', (req, res) => {
    // Updated to include new fields from the request body
    const { name, usn, branch, section, test1, test2, quiz, assignment} = req.body;
    if (!name || !usn) return res.status(400).json({ "error": "Student Name and USN are required." });
    
    // Updated SQL query with new column names
    const sql = `INSERT INTO students (name, usn, branch, section, test1, test2, quiz, assignment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    // Updated parameters array for the SQL query
    db.run(sql, [name, usn, branch, section, test1, test2, quiz, assignment], function(err) {
        if (err) return res.status(409).json({ "error": `A student with USN ${usn} already exists.` });
        res.status(201).json({ "message": "success", "id": this.lastID });
    });
});
app.get('/api/class-list', (req, res) => {
    const { branch, section } = req.query;
    if (!branch || !section) {
        return res.status(400).json({ "error": "Branch and Section are required." });
    }
    const sql = "SELECT name, usn FROM students WHERE branch = ? AND section = ? ORDER BY usn";
    db.all(sql, [branch, section], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ "message": "success", "data": rows });
    });
});

// This endpoint saves the submitted attendance records
app.post('/api/attendance', (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ "error": "Request body must be an array of records." });
    }
    const sql = `INSERT INTO attendance_records (student_usn, date, status) VALUES (?, ?, ?)
                 ON CONFLICT(student_usn, date) DO UPDATE SET status = excluded.status`;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        records.forEach(record => {
            db.run(sql, [record.usn, record.date, record.status], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Failed to save attendance." });
                }
            });
        });
        db.run("COMMIT");
    });
    res.status(201).json({ "message": "Attendance submitted successfully." });
});


// --- Section Detail Routes (section_detail.html) ---
// In server.js, under "--- Section Detail Routes ---"
app.get('/api/section-details/:section', async (req, res) => {
    const { section } = req.params;
    try {
        const getChartData = new Promise((resolve, reject) => {
            // Updated SQL to get averages of new and renamed fields
            const sql = `SELECT 
                            AVG(test1) as avg_test1, 
                            AVG(test2) as avg_test2,
                            AVG(quiz) as avg_quiz,
                            AVG(assignment) as avg_assignment
                         FROM students 
                         WHERE section = ?`;
            db.get(sql, [section], (err, row) => {
                if (err) reject(err);
                
                const avg_test1 = row.avg_test1 || 0;
                const avg_test2 = row.avg_test2 || 0;

                // Calculate the average of the two tests
                const test_average = (avg_test1 + avg_test2) / 2;

                // Resolve with the new data structure for the chart
                resolve({ 
                    labels: ["Test 1", "Test 2", "Test Average", "Quiz", "Assignment"], 
                    data: [
                        avg_test1.toFixed(2), 
                        avg_test2.toFixed(2), 
                        test_average.toFixed(2),
                        (row.avg_quiz || 0).toFixed(2),
                        (row.avg_assignment || 0).toFixed(2)
                    ] 
                });
            });
        });
        const getNotes = new Promise((resolve, reject) => {
            const sql = "SELECT note, createdAt FROM section_notes WHERE section = ? ORDER BY createdAt DESC";
            db.all(sql, [section], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        const [chartData, notes] = await Promise.all([getChartData, getNotes]);
        res.json({ message: "success", data: { chartData, notes } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/performance-by-section', async (req, res) => {
    try {
        const sections = ['A', 'B', 'C', 'D'];
        const sectionLabels = [];
        const sectionScores = [];
        const sectionColors = [];

        for (const section of sections) {
            const result = await new Promise((resolve, reject) => {
                const sql = `SELECT COUNT(*) as count, 
                                    AVG(test1) AS avg_test1, 
                                    AVG(test2) AS avg_test2, 
                                    AVG(quiz) AS avg_quiz, 
                                    AVG(assignment) AS avg_assignment 
                             FROM students 
                             WHERE section = ?`;
                db.get(sql, [section], (err, row) => {
                    if (err) return reject(err);

                    if (row.count === 0) {
                        resolve({ score: 0, hasData: false });
                    } else {
                        const avg_test1 = row.avg_test1 || 0;
                        const avg_test2 = row.avg_test2 || 0;
                        const avg_quiz = row.avg_quiz || 0;
                        const avg_assignment = row.avg_assignment || 0;

                        const test_avg = (avg_test1 + avg_test2) / 2;
                        const total_score = test_avg + avg_quiz + avg_assignment;

                        resolve({ score: parseFloat(total_score.toFixed(2)), hasData: true });
                    }
                });
            });

            sectionLabels.push(`Section ${section}`);
            sectionScores.push(result.score);
            sectionColors.push(result.hasData ? "rgba(102, 153, 255, 1)" : "rgba(160, 160, 160, 0.5)");
        }

        res.json({
            message: "success",
            data: {
                labels: sectionLabels,
                scores: sectionScores,
                colors: sectionColors
            }
        });

    } catch (error) {
        console.error("Error in /api/performance-by-section:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/notes', (req, res) => {
    const { section, note } = req.body;
    if (!section || !note) return res.status(400).json({ "error": "Section and note text are required." });
    const sql = `INSERT INTO section_notes (section, note) VALUES (?, ?)`;
    db.run(sql, [section, note], function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        res.status(201).json({ "message": "Note added successfully", "id": this.lastID });
    });
});

app.get('/api/tasks', (req, res) => {
    const sql = "SELECT * FROM tasks ORDER BY dueDate DESC, priority";
    db.all(sql, [], (err, rows) => {
        if (err) {
            // Log the error for debugging purposes on the server side
            console.error("Error fetching tasks:", err.message);
            return res.status(500).json({ "error": err.message });
        }
        // If no tasks, rows will be an empty array, which is correct
        res.json({ "message": "success", "data": rows });
    });
});

// POST a new task
app.post('/api/tasks', (req, res) => {
    const { name, priority, dueDate } = req.body;
    if (!name || name.trim() === "") {
        return res.status(400).json({ "error": "Task name is required." });
    }
    const sql = 'INSERT INTO tasks (name, priority, dueDate, isCompleted) VALUES (?,?,?,?)';
    // Store 'isCompleted' as 0 (false) by default
    db.run(sql, [name, priority, dueDate, 0], function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.status(201).json({ "message": "Task added successfully", "id": this.lastID });
    });
});

// DELETE a task
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.run(sql, id, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ "error": `Task with id ${id} not found.` });
        }
        res.json({ "message": "Task deleted successfully" });
    });
});


// --- 5. SERVER START ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});